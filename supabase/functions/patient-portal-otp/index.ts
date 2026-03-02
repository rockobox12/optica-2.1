import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function generateSessionToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
}

/** Normalize MX phone to E.164 — mirrors DB normalize_phone_mx() and frontend normalizePhoneMX() */
function normalizePhoneMX(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)\+]/g, '')
  if (cleaned.length === 10) {
    cleaned = '52' + cleaned
  } else if (cleaned.length === 13 && cleaned.startsWith('521')) {
    cleaned = '52' + cleaned.slice(3)
  }
  // 12 digits starting with 52 → valid MX
  if (cleaned.length === 12 && cleaned.startsWith('52')) {
    return '+' + cleaned
  }
  // Fallback
  if (cleaned.length >= 10) {
    return '+' + cleaned
  }
  return '+' + cleaned
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const body = await req.json()
    const { action, phone, code, session_token } = body

    // === REQUEST OTP ===
    if (action === 'request_otp') {
      const phoneE164 = normalizePhoneMX(phone)

      // Find patient by phone_e164 (indexed column)
      const { data: patients } = await supabase
        .from('patients')
        .select('id, first_name, last_name, whatsapp, mobile, phone')
        .eq('phone_e164', phoneE164)
        .eq('is_deleted', false)
        .limit(1)

      // Fallback: search by last 10 digits if phone_e164 didn't match
      let patient = patients?.[0] || null
      if (!patient) {
        const last10 = phoneE164.replace('+', '').slice(-10)
        const { data: fallback } = await supabase.rpc('find_patient_by_phone_portal', { p_phone: phone })
        patient = (fallback as any)?.[0] || null
      }

      if (!patient) {
        return new Response(JSON.stringify({ error: 'No se encontró un paciente con ese teléfono' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Get portal config
      const { data: config } = await supabase
        .from('patient_portal_config')
        .select('*')
        .limit(1)
        .single()

      const expiryMinutes = config?.otp_expiry_minutes || 10
      const otpCode = generateOTP()
      const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString()
      const channel = config?.send_mode === 'twilio' ? (config.otp_channel || 'whatsapp') : 'manual'

      // Invalidate previous codes
      await supabase
        .from('patient_auth_codes')
        .update({ verified: true })
        .eq('phone_e164', phoneE164)
        .eq('verified', false)

      // Insert new OTP
      await supabase.from('patient_auth_codes').insert({
        phone_e164: phoneE164,
        patient_id: patient.id,
        code: otpCode,
        channel,
        expires_at: expiresAt,
      })

      // Audit log
      await supabase.from('patient_portal_audit').insert({
        event_type: 'otp_requested',
        phone_e164: phoneE164,
        patient_id: patient.id,
        metadata: { channel }
      })

      const patientName = `${patient.first_name} ${patient.last_name || ''}`.trim()

      if (config?.send_mode === 'twilio' && config.twilio_enabled) {
        await supabase.from('patient_portal_audit').insert({
          event_type: 'otp_sent',
          phone_e164: phoneE164,
          patient_id: patient.id,
          metadata: { channel, method: 'twilio' }
        })

        return new Response(JSON.stringify({
          success: true,
          mode: 'twilio',
          message: 'Código enviado',
          patient_name: patientName,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Manual mode
      const otpMessage = `🔐 Tu código de acceso al Portal de Óptica Istmeña es: *${otpCode}*\n\nVálido por ${expiryMinutes} minutos.\nNo compartas este código con nadie.`
      const whatsappUrl = `https://wa.me/${phoneE164.replace('+', '')}?text=${encodeURIComponent(otpMessage)}`

      return new Response(JSON.stringify({
        success: true,
        mode: 'manual',
        patient_name: patientName,
        otp_message: otpMessage,
        whatsapp_url: whatsappUrl,
        phone_display: phoneE164,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // === VERIFY OTP ===
    if (action === 'verify_otp') {
      const phoneE164 = normalizePhoneMX(phone)

      const { data: otpRecord } = await supabase
        .from('patient_auth_codes')
        .select('*')
        .eq('phone_e164', phoneE164)
        .eq('verified', false)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!otpRecord) {
        await supabase.from('patient_portal_audit').insert({
          event_type: 'otp_failed',
          phone_e164: phoneE164,
          metadata: { reason: 'no_valid_code' }
        })
        return new Response(JSON.stringify({ error: 'Código expirado o no válido' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const { data: config } = await supabase
        .from('patient_portal_config')
        .select('max_otp_attempts, session_duration_days')
        .limit(1)
        .single()

      const maxAttempts = config?.max_otp_attempts || 5

      if (otpRecord.attempts >= maxAttempts) {
        await supabase.from('patient_auth_codes')
          .update({ verified: true })
          .eq('id', otpRecord.id)

        await supabase.from('patient_portal_audit').insert({
          event_type: 'otp_failed',
          phone_e164: phoneE164,
          patient_id: otpRecord.patient_id,
          metadata: { reason: 'max_attempts' }
        })

        return new Response(JSON.stringify({ error: 'Demasiados intentos. Solicita un nuevo código.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (otpRecord.code !== code) {
        await supabase.from('patient_auth_codes')
          .update({ attempts: otpRecord.attempts + 1 })
          .eq('id', otpRecord.id)

        await supabase.from('patient_portal_audit').insert({
          event_type: 'otp_failed',
          phone_e164: phoneE164,
          patient_id: otpRecord.patient_id,
          metadata: { reason: 'wrong_code', attempts: otpRecord.attempts + 1 }
        })

        return new Response(JSON.stringify({ 
          error: 'Código incorrecto',
          attempts_remaining: maxAttempts - (otpRecord.attempts + 1)
        }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Code is correct!
      await supabase.from('patient_auth_codes')
        .update({ verified: true })
        .eq('id', otpRecord.id)

      const sessionDays = config?.session_duration_days || 30
      const sessionToken = generateSessionToken()
      const sessionExpires = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000).toISOString()

      await supabase.from('patient_portal_sessions').insert({
        patient_id: otpRecord.patient_id,
        session_token: sessionToken,
        expires_at: sessionExpires,
      })

      await supabase.from('patient_portal_audit').insert({
        event_type: 'otp_verified',
        phone_e164: phoneE164,
        patient_id: otpRecord.patient_id,
      })

      await supabase.from('patient_portal_audit').insert({
        event_type: 'portal_access',
        phone_e164: phoneE164,
        patient_id: otpRecord.patient_id,
      })

      return new Response(JSON.stringify({
        success: true,
        session_token: sessionToken,
        patient_id: otpRecord.patient_id,
        expires_at: sessionExpires,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // === VALIDATE SESSION ===
    if (action === 'validate_session') {
      const { data: session } = await supabase
        .from('patient_portal_sessions')
        .select('*, patients:patient_id(id, first_name, last_name, whatsapp, mobile, phone, email)')
        .eq('session_token', session_token)
        .eq('revoked', false)
        .gte('expires_at', new Date().toISOString())
        .limit(1)
        .single()

      if (!session) {
        return new Response(JSON.stringify({ valid: false }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({
        valid: true,
        patient_id: session.patient_id,
        patient: session.patients,
        expires_at: session.expires_at,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // === REVOKE SESSION (LOGOUT) ===
    if (action === 'revoke_session') {
      await supabase.from('patient_portal_sessions')
        .update({ revoked: true })
        .eq('session_token', session_token)

      const { data: session } = await supabase
        .from('patient_portal_sessions')
        .select('patient_id')
        .eq('session_token', session_token)
        .single()

      if (session) {
        await supabase.from('patient_portal_audit').insert({
          event_type: 'session_revoked',
          patient_id: session.patient_id,
        })
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // === GET PATIENT DATA (for portal views) ===
    if (action === 'get_portal_data') {
      const { data: session } = await supabase
        .from('patient_portal_sessions')
        .select('patient_id')
        .eq('session_token', session_token)
        .eq('revoked', false)
        .gte('expires_at', new Date().toISOString())
        .single()

      if (!session) {
        return new Response(JSON.stringify({ error: 'Sesión no válida' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const patientId = session.patient_id
      const dataType = body.data_type

      let responseData: any = {}

      const { data: patient } = await supabase
        .from('patients')
        .select('id, first_name, last_name, email, whatsapp, mobile, phone, birth_date, created_at')
        .eq('id', patientId)
        .single()

      responseData.patient = patient

      if (dataType === 'home' || dataType === 'all') {
        const { data: appointments } = await supabase
          .from('appointments')
          .select('id, appointment_date, start_time, end_time, appointment_type, status, reason')
          .eq('patient_id', patientId)
          .gte('appointment_date', new Date().toISOString().split('T')[0])
          .in('status', ['scheduled', 'confirmed'])
          .order('appointment_date', { ascending: true })
          .limit(5)

        responseData.upcoming_appointments = appointments || []

        const { data: sales } = await supabase
          .from('sales')
          .select('id, sale_number, total, balance, status, created_at, is_credit')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false })
          .limit(5)

        responseData.recent_sales = sales || []

        const { data: loyalty } = await supabase
          .from('customer_loyalty')
          .select('*, loyalty_tiers(*), loyalty_programs(*)')
          .eq('patient_id', patientId)
          .limit(1)
          .maybeSingle()

        responseData.loyalty = loyalty

        const { data: pendingSales } = await supabase
          .from('sales')
          .select('balance')
          .eq('patient_id', patientId)
          .gt('balance', 0)

        responseData.total_pending_balance = (pendingSales || []).reduce((sum: number, s: any) => sum + (s.balance || 0), 0)
      }

      if (dataType === 'sales' || dataType === 'all') {
        const { data: allSales } = await supabase
          .from('sales')
          .select('id, sale_number, total, balance, status, created_at, is_credit, amount_paid, discount_amount')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false })
          .limit(50)

        responseData.sales = allSales || []
      }

      if (dataType === 'balance' || dataType === 'all') {
        const { data: creditSales } = await supabase
          .from('sales')
          .select('id, sale_number, total, balance, status, created_at, next_payment_date, next_payment_amount')
          .eq('patient_id', patientId)
          .gt('balance', 0)
          .order('created_at', { ascending: false })

        responseData.pending_sales = creditSales || []
      }

      if (dataType === 'appointments' || dataType === 'all') {
        const { data: allAppointments } = await supabase
          .from('appointments')
          .select('id, appointment_date, start_time, end_time, appointment_type, status, reason, notes')
          .eq('patient_id', patientId)
          .order('appointment_date', { ascending: false })
          .limit(20)

        responseData.appointments = allAppointments || []
      }

      return new Response(JSON.stringify(responseData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Acción no válida' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Portal OTP error:', error)
    return new Response(JSON.stringify({ error: 'Error del servidor' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})