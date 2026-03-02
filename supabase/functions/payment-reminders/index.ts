import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get settings
    const { data: settings } = await supabase
      .from('payment_reminder_settings')
      .select('*')
      .limit(1)
      .single();

    if (!settings || !settings.is_enabled) {
      return new Response(
        JSON.stringify({ success: true, message: 'Reminders disabled', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const intervalDays = settings.interval_days || 15;
    const maxDaily = settings.max_daily_per_patient || 3;
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Find patients with pending balance and no recent payment (>= interval_days)
    const { data: candidates, error: candidatesError } = await supabase
      .from('sales')
      .select(`
        id, balance, next_payment_date, next_payment_amount, patient_id, sale_number, created_at,
        patients!inner (
          id, first_name, last_name, whatsapp, mobile, phone, whatsapp_opted_in
        )
      `)
      .in('status', ['pending', 'partial'])
      .gt('balance', 0)
      .not('patient_id', 'is', null);

    if (candidatesError) {
      throw new Error(`Error fetching candidates: ${candidatesError.message}`);
    }

    // Group by patient
    const patientMap = new Map<string, {
      patient: any;
      totalBalance: number;
      nextPaymentDate: string | null;
      saleIds: string[];
    }>();

    for (const sale of (candidates || [])) {
      const patient = sale.patients as any;
      if (!patient || !patient.whatsapp_opted_in) continue;

      const phone = patient.whatsapp || patient.mobile;
      if (!phone) continue;

      const existing = patientMap.get(patient.id) || {
        patient,
        totalBalance: 0,
        nextPaymentDate: null,
        saleIds: [],
      };

      existing.totalBalance += sale.balance || 0;
      existing.saleIds.push(sale.id);

      if (sale.next_payment_date) {
        if (!existing.nextPaymentDate || sale.next_payment_date < existing.nextPaymentDate) {
          existing.nextPaymentDate = sale.next_payment_date;
        }
      }

      patientMap.set(patient.id, existing);
    }

    let processed = 0;
    const results: { patientId: string; status: string; reason?: string }[] = [];

    for (const [patientId, info] of patientMap) {
      // Check last payment date
      const { data: lastPayment } = await supabase
        .from('credit_payments')
        .select('created_at')
        .eq('is_voided', false)
        .in('sale_id', info.saleIds)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastPaymentDate = lastPayment?.created_at
        ? new Date(lastPayment.created_at)
        : null;

      // If no payment ever, use earliest sale date
      let referenceDate = lastPaymentDate;
      if (!referenceDate) {
        const { data: earliestSale } = await supabase
          .from('sales')
          .select('created_at')
          .eq('patient_id', patientId)
          .in('status', ['pending', 'partial'])
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        referenceDate = earliestSale?.created_at ? new Date(earliestSale.created_at) : null;
      }

      if (!referenceDate) continue;

      const daysSincePayment = Math.floor((now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSincePayment < intervalDays) {
        results.push({ patientId, status: 'skipped', reason: `Only ${daysSincePayment} days since last payment` });
        continue;
      }

      // Anti-spam: check if reminder sent in last interval_days
      const { data: recentReminder } = await supabase
        .from('payment_reminder_log')
        .select('id')
        .eq('patient_id', patientId)
        .gte('created_at', new Date(now.getTime() - intervalDays * 24 * 60 * 60 * 1000).toISOString())
        .in('status', ['pending', 'approved', 'sent'])
        .limit(1)
        .maybeSingle();

      if (recentReminder) {
        results.push({ patientId, status: 'skipped', reason: 'Recent reminder exists' });
        continue;
      }

      // Anti-spam: check daily limit
      const { count: todayCount } = await supabase
        .from('payment_reminder_log')
        .select('id', { count: 'exact', head: true })
        .eq('patient_id', patientId)
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`);

      if ((todayCount || 0) >= maxDaily) {
        results.push({ patientId, status: 'skipped', reason: 'Daily limit reached' });
        continue;
      }

      // Get branch info for template
      const { data: branchInfo } = await supabase
        .from('branches')
        .select('name, phone')
        .eq('is_main', true)
        .limit(1)
        .maybeSingle();

      // Build message from template
      const formatDate = (d: string | null) => {
        if (!d) return '—';
        const date = new Date(d);
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
      };

      let message = settings.template_content
        .replace(/{nombre}/g, `${info.patient.first_name} ${info.patient.last_name}`)
        .replace(/{\$?saldo_restante}/g, `$${info.totalBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`)
        .replace(/{next_payment_date}/g, formatDate(info.nextPaymentDate))
        .replace(/{sucursal}/g, branchInfo?.name || 'Óptica Istmeña')
        .replace(/{telefono_sucursal}/g, branchInfo?.phone || '');

      // Determine status based on mode
      const status = settings.mode === 'automatic' ? 'approved' : 'pending';

      // Insert reminder log
      const { error: insertError } = await supabase
        .from('payment_reminder_log')
        .insert({
          patient_id: patientId,
          saldo_pendiente: info.totalBalance,
          dias_sin_pago: daysSincePayment,
          channel: 'whatsapp',
          status,
          message_content: message,
        });

      if (insertError) {
        results.push({ patientId, status: 'error', reason: insertError.message });
        continue;
      }

      // If automatic mode and API is configured, send immediately
      if (settings.mode === 'automatic') {
        const phone = info.patient.whatsapp || info.patient.mobile;
        try {
          const sendRes = await fetch(`${supabaseUrl}/functions/v1/send-auto-message`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              channel: 'whatsapp',
              to: phone,
              message,
              patient_id: patientId,
              patient_name: `${info.patient.first_name} ${info.patient.last_name}`,
              message_type: 'payment_reminder',
              variables_used: {
                nombre: `${info.patient.first_name} ${info.patient.last_name}`,
                saldo_restante: info.totalBalance.toString(),
                next_payment_date: formatDate(info.nextPaymentDate),
              },
              reference_type: 'payment_reminder',
            }),
          });

          const sendData = await sendRes.json();
          if (sendData.success) {
            await supabase
              .from('payment_reminder_log')
              .update({ status: 'sent', sent_at: new Date().toISOString(), auto_message_log_id: sendData.log_id })
              .eq('patient_id', patientId)
              .eq('status', 'approved')
              .order('created_at', { ascending: false })
              .limit(1);
          }
        } catch (sendErr) {
          console.error('Error sending auto message:', sendErr);
        }
      }

      processed++;
      results.push({ patientId, status });
    }

    return new Response(
      JSON.stringify({ success: true, processed, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in payment-reminders:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
