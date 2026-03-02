import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PatientInfo {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  whatsapp: string | null;
  mobile: string | null;
  phone: string | null;
  birth_date: string | null;
}

interface PortalSession {
  patient_id: string;
  patient: PatientInfo | null;
  session_token: string;
  expires_at: string;
}

interface PortalConfig {
  send_mode: string;
  otp_expiry_minutes: number;
  otp_template: string;
  portal_link_template: string;
}

interface PatientPortalContextType {
  session: PortalSession | null;
  loading: boolean;
  requestOTP: (phone: string) => Promise<any>;
  verifyOTP: (phone: string, code: string) => Promise<any>;
  logout: () => Promise<void>;
  fetchPortalData: (dataType: string) => Promise<any>;
}

const PatientPortalContext = createContext<PatientPortalContextType | null>(null);

const STORAGE_KEY = 'patient_portal_session';

export function normalizePhoneMX(phone: string): { e164: string; plain: string; last10: string } {
  let cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
  // Remove leading country code variations
  if (cleaned.length === 12 && cleaned.startsWith('52')) {
    // already 52 + 10 digits
  } else if (cleaned.length === 10) {
    cleaned = '52' + cleaned;
  } else if (cleaned.length === 13 && cleaned.startsWith('521')) {
    // old MX mobile prefix 521 → normalize to 52
    cleaned = '52' + cleaned.slice(3);
  }
  const e164 = '+' + cleaned;
  const plain = cleaned; // without +
  const last10 = cleaned.slice(-10);
  return { e164, plain, last10 };
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function getPortalConfig(): Promise<PortalConfig> {
  const { data } = await supabase
    .from('patient_portal_config')
    .select('send_mode, otp_expiry_minutes, otp_template, portal_link_template')
    .limit(1)
    .single();
  return {
    send_mode: data?.send_mode || 'manual',
    otp_expiry_minutes: (data as any)?.otp_expiry_minutes || 10,
    otp_template: (data as any)?.otp_template || 'Tu código de acceso a Óptica Istmeña es: {OTP}. Vigencia: {MIN} minutos.',
    portal_link_template: (data as any)?.portal_link_template || 'Entra aquí: {LINK} Código: {OTP}. Vigencia: {MIN} minutos.',
  };
}

export async function findPatientByPhone(phone: string) {
  // Use SECURITY DEFINER function that bypasses RLS for portal (anon) access
  const { data, error } = await supabase.rpc('find_patient_by_phone_portal', {
    p_phone: phone,
  });
  if (error) {
    console.error('findPatientByPhone error:', error);
    return null;
  }
  return (data as any)?.[0] || null;
}

export function PatientPortalProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<PortalSession | null>(null);
  const [loading, setLoading] = useState(true);

  const callEdgeFunction = useCallback(async (body: any) => {
    const { data, error } = await supabase.functions.invoke('patient-portal-otp', { body });
    if (error) throw error;
    return data;
  }, []);

  // Validate stored session on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setLoading(false);
      return;
    }

    const parsed = JSON.parse(stored);
    callEdgeFunction({ action: 'validate_session', session_token: parsed.session_token })
      .then((result) => {
        if (result.valid) {
          setSession({
            patient_id: result.patient_id,
            patient: result.patient,
            session_token: parsed.session_token,
            expires_at: result.expires_at,
          });
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      })
      .catch(() => localStorage.removeItem(STORAGE_KEY))
      .finally(() => setLoading(false));
  }, [callEdgeFunction]);

  const requestOTP = useCallback(async (phone: string) => {
    const config = await getPortalConfig();
    const { e164: phoneE164 } = normalizePhoneMX(phone);

    // Find patient
    const patient = await findPatientByPhone(phone);
    if (!patient) {
      const { e164 } = normalizePhoneMX(phone);
      return { error: `Teléfono no encontrado (${e164}). Verifica que tu número esté registrado en WhatsApp o Celular.` };
    }

    const patientName = `${patient.first_name} ${patient.last_name || ''}`.trim();

    if (config.send_mode === 'manual') {
      // MANUAL MODE: generate OTP locally, save to DB, show message
      const otpCode = generateOTP();
      const expiresAt = new Date(Date.now() + config.otp_expiry_minutes * 60 * 1000).toISOString();

      // Invalidate previous codes
      await supabase
        .from('patient_auth_codes')
        .update({ verified: true } as any)
        .eq('phone_e164', phoneE164)
        .eq('verified', false);

      // Insert new OTP
      const { error: insertError } = await supabase.from('patient_auth_codes').insert({
        phone_e164: phoneE164,
        patient_id: patient.id,
        code: otpCode,
        channel: 'manual',
        expires_at: expiresAt,
      } as any);

      // Audit log (best effort)
      try {
        await supabase.from('patient_portal_audit').insert({
          event_type: 'otp_requested',
          phone_e164: phoneE164,
          patient_id: patient.id,
          metadata: { channel: 'manual' },
        } as any);
      } catch {}

      // Build message from template
      const otpMessage = config.otp_template
        .replace('{OTP}', otpCode)
        .replace('{MIN}', String(config.otp_expiry_minutes));
      const whatsappUrl = `https://wa.me/${phoneE164.replace('+', '')}?text=${encodeURIComponent(otpMessage)}`;

      if (insertError) {
        // Fallback: still show OTP even if DB save failed
        return {
          success: true,
          mode: 'manual',
          patient_name: patientName,
          otp_message: otpMessage,
          whatsapp_url: whatsappUrl,
          phone_display: phoneE164,
          db_warning: 'No se pudo guardar el OTP en la base de datos, pero puedes probar el flujo manual.',
        };
      }

      return {
        success: true,
        mode: 'manual',
        patient_name: patientName,
        otp_message: otpMessage,
        whatsapp_url: whatsappUrl,
        phone_display: phoneE164,
      };
    }

    // TWILIO MODE: use Edge Function
    return callEdgeFunction({ action: 'request_otp', phone });
  }, [callEdgeFunction]);

  const verifyOTP = useCallback(async (phone: string, code: string) => {
    const result = await callEdgeFunction({ action: 'verify_otp', phone, code });
    if (result.success) {
      const sessionData = {
        patient_id: result.patient_id,
        patient: null,
        session_token: result.session_token,
        expires_at: result.expires_at,
      };
      setSession(sessionData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ session_token: result.session_token }));

      // Fetch patient info
      const validateResult = await callEdgeFunction({ action: 'validate_session', session_token: result.session_token });
      if (validateResult.valid) {
        setSession(prev => prev ? { ...prev, patient: validateResult.patient } : null);
      }
    }
    return result;
  }, [callEdgeFunction]);

  const logout = useCallback(async () => {
    if (session?.session_token) {
      await callEdgeFunction({ action: 'revoke_session', session_token: session.session_token }).catch(() => {});
    }
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, [session, callEdgeFunction]);

  const fetchPortalData = useCallback(async (dataType: string) => {
    if (!session?.session_token) throw new Error('No session');
    return callEdgeFunction({ action: 'get_portal_data', session_token: session.session_token, data_type: dataType });
  }, [session, callEdgeFunction]);

  return (
    <PatientPortalContext.Provider value={{ session, loading, requestOTP, verifyOTP, logout, fetchPortalData }}>
      {children}
    </PatientPortalContext.Provider>
  );
}

export function usePatientPortal() {
  const context = useContext(PatientPortalContext);
  if (!context) throw new Error('usePatientPortal must be used within PatientPortalProvider');
  return context;
}

// Helper for generating manual OTP from admin/expediente context (not within portal provider)
function generateSecureToken(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

export async function validatePortalToken(token: string) {
  const { data, error } = await supabase.rpc('validate_portal_token', { p_token: token });
  if (error) {
    console.error('validatePortalToken error:', error);
    return { valid: false };
  }
  const row = (data as any)?.[0];
  return row || { valid: false };
}

export async function consumePortalTokenAttempt(token: string) {
  await supabase.rpc('consume_portal_token_attempt', { p_token: token });
}

export async function markPortalTokenUsed(token: string) {
  await supabase.rpc('mark_portal_token_used', { p_token: token });
}

export async function generateManualOTP(patientPhone: string, patientId: string, patientName?: string) {
  const config = await getPortalConfig();
  const { e164: phoneE164 } = normalizePhoneMX(patientPhone);
  const otpCode = generateOTP();
  const expiresAt = new Date(Date.now() + config.otp_expiry_minutes * 60 * 1000).toISOString();

  // Invalidate previous
  await supabase
    .from('patient_auth_codes')
    .update({ verified: true } as any)
    .eq('phone_e164', phoneE164)
    .eq('verified', false);

  // Insert
  const { error } = await supabase.from('patient_auth_codes').insert({
    phone_e164: phoneE164,
    patient_id: patientId,
    code: otpCode,
    channel: 'manual',
    expires_at: expiresAt,
  } as any);

  // Audit
  try {
    await supabase.from('patient_portal_audit').insert({
      event_type: 'otp_requested',
      phone_e164: phoneE164,
      patient_id: patientId,
      metadata: { channel: 'manual', source: 'admin' },
    } as any);
  } catch {}

  // Generate portal token
  const token = generateSecureToken();
  const name = patientName || '';
  try {
    await supabase.rpc('create_portal_token', {
      p_patient_id: patientId,
      p_phone_e164: phoneE164,
      p_patient_name: name,
      p_token: token,
      p_expires_minutes: config.otp_expiry_minutes,
    });
  } catch (e) {
    console.error('Error creating portal token:', e);
  }

  const portalUrl = `${window.location.origin}/portal?t=${token}`;

  const otpMessage = config.otp_template
    .replace('{OTP}', otpCode)
    .replace('{MIN}', String(config.otp_expiry_minutes));

  const fullMessage = config.portal_link_template
    .replace('{LINK}', portalUrl)
    .replace('{OTP}', otpCode)
    .replace('{MIN}', String(config.otp_expiry_minutes));

  const whatsappUrl = `https://wa.me/${phoneE164.replace('+', '')}?text=${encodeURIComponent(fullMessage)}`;

  return {
    success: !error,
    otp: otpCode,
    otpMessage,
    fullMessage,
    whatsappUrl,
    portalUrl,
    token,
    dbWarning: error ? 'No se pudo guardar, pero puedes probar el flujo manual.' : null,
  };
}
