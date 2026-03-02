
-- Patient Portal Configuration
CREATE TABLE public.patient_portal_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  send_mode text NOT NULL DEFAULT 'manual' CHECK (send_mode IN ('twilio', 'manual')),
  twilio_enabled boolean NOT NULL DEFAULT false,
  twilio_account_sid text,
  twilio_auth_token text,
  otp_channel text NOT NULL DEFAULT 'whatsapp' CHECK (otp_channel IN ('whatsapp', 'sms')),
  whatsapp_sender text,
  sms_sender text,
  otp_expiry_minutes integer NOT NULL DEFAULT 10,
  session_duration_days integer NOT NULL DEFAULT 30,
  max_otp_attempts integer NOT NULL DEFAULT 5,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.patient_portal_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage portal config"
  ON public.patient_portal_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Insert default config
INSERT INTO public.patient_portal_config (send_mode) VALUES ('manual');

-- Patient Auth Codes (OTP)
CREATE TABLE public.patient_auth_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 text NOT NULL,
  patient_id uuid REFERENCES public.patients(id),
  code text NOT NULL,
  channel text NOT NULL DEFAULT 'manual' CHECK (channel IN ('whatsapp', 'sms', 'manual')),
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_auth_codes ENABLE ROW LEVEL SECURITY;

-- Allow anon to insert (request OTP) and update (verify OTP) - validated by edge function
CREATE POLICY "Anon can request OTP"
  ON public.patient_auth_codes FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can read own OTP by phone"
  ON public.patient_auth_codes FOR SELECT TO anon
  USING (true);

CREATE POLICY "Anon can update OTP attempts"
  ON public.patient_auth_codes FOR UPDATE TO anon
  USING (true);

CREATE POLICY "Admins can manage OTP codes"
  ON public.patient_auth_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_patient_auth_codes_phone ON public.patient_auth_codes (phone_e164, verified, expires_at);

-- Patient Portal Sessions
CREATE TABLE public.patient_portal_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  session_token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked boolean NOT NULL DEFAULT false,
  last_ip text,
  last_user_agent text
);

ALTER TABLE public.patient_portal_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read sessions by token"
  ON public.patient_portal_sessions FOR SELECT TO anon
  USING (true);

CREATE POLICY "Anon can insert sessions"
  ON public.patient_portal_sessions FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can revoke sessions"
  ON public.patient_portal_sessions FOR UPDATE TO anon
  USING (true);

CREATE POLICY "Admins can manage sessions"
  ON public.patient_portal_sessions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_patient_portal_sessions_token ON public.patient_portal_sessions (session_token, revoked, expires_at);

-- Patient Portal Audit Log
CREATE TABLE public.patient_portal_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN ('otp_requested', 'otp_sent', 'otp_verified', 'otp_failed', 'portal_access', 'session_revoked')),
  phone_e164 text,
  patient_id uuid REFERENCES public.patients(id),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_portal_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can insert audit events"
  ON public.patient_portal_audit FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Admins can read audit"
  ON public.patient_portal_audit FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
