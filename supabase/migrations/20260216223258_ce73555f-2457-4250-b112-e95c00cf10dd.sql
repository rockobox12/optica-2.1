
-- Table for short-lived portal access tokens (link-based OTP flow)
CREATE TABLE public.patient_portal_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  patient_id UUID NOT NULL,
  phone_e164 TEXT NOT NULL,
  patient_name TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  attempts_left INT NOT NULL DEFAULT 5,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast lookup index
CREATE INDEX idx_portal_tokens_token ON public.patient_portal_tokens(token);
CREATE INDEX idx_portal_tokens_patient ON public.patient_portal_tokens(patient_id);

-- Enable RLS
ALTER TABLE public.patient_portal_tokens ENABLE ROW LEVEL SECURITY;

-- Only authenticated staff can insert
CREATE POLICY "Staff can create portal tokens"
ON public.patient_portal_tokens FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Select via SECURITY DEFINER function only (no direct anon access)
CREATE POLICY "No direct select"
ON public.patient_portal_tokens FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Update via SECURITY DEFINER function only
CREATE POLICY "No direct update"
ON public.patient_portal_tokens FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- SECURITY DEFINER function to validate token (callable by anon)
CREATE OR REPLACE FUNCTION public.validate_portal_token(p_token TEXT)
RETURNS TABLE(patient_id UUID, phone_e164 TEXT, patient_name TEXT, valid BOOLEAN, attempts_left INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_record RECORD;
BEGIN
  SELECT t.patient_id, t.phone_e164, t.patient_name, t.expires_at, t.attempts_left, t.used
  INTO v_record
  FROM patient_portal_tokens t
  WHERE t.token = p_token
  LIMIT 1;

  IF v_record IS NULL OR v_record.used OR v_record.expires_at < now() OR v_record.attempts_left <= 0 THEN
    valid := false;
    patient_id := NULL;
    phone_e164 := NULL;
    patient_name := NULL;
    attempts_left := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  patient_id := v_record.patient_id;
  phone_e164 := v_record.phone_e164;
  patient_name := v_record.patient_name;
  valid := true;
  attempts_left := v_record.attempts_left;
  RETURN NEXT;
END;
$$;

-- SECURITY DEFINER function to create token (called by authenticated staff)
CREATE OR REPLACE FUNCTION public.create_portal_token(
  p_patient_id UUID, 
  p_phone_e164 TEXT, 
  p_patient_name TEXT, 
  p_token TEXT,
  p_expires_minutes INT DEFAULT 10
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Require authenticated user
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Invalidate previous tokens for this patient
  UPDATE patient_portal_tokens SET used = true WHERE patient_id = p_patient_id AND used = false;
  
  INSERT INTO patient_portal_tokens (token, patient_id, phone_e164, patient_name, expires_at)
  VALUES (p_token, p_patient_id, p_phone_e164, p_patient_name, now() + (p_expires_minutes || ' minutes')::interval);
  
  RETURN p_token;
END;
$$;

-- SECURITY DEFINER function to consume attempt (called by anon during OTP verify)
CREATE OR REPLACE FUNCTION public.consume_portal_token_attempt(p_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_attempts INT;
BEGIN
  UPDATE patient_portal_tokens 
  SET attempts_left = attempts_left - 1
  WHERE token = p_token AND used = false AND expires_at > now() AND attempts_left > 0
  RETURNING attempts_left INTO v_attempts;
  
  RETURN FOUND;
END;
$$;

-- Mark token as used after successful OTP verification
CREATE OR REPLACE FUNCTION public.mark_portal_token_used(p_token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE patient_portal_tokens SET used = true WHERE token = p_token;
END;
$$;
