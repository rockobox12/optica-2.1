
-- Add test_mode to company_settings
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS test_mode BOOLEAN NOT NULL DEFAULT false;

-- Create database reset audit table
CREATE TABLE public.database_reset_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  executed_by UUID NOT NULL,
  executed_by_name TEXT,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  branch_id UUID REFERENCES public.branches(id),
  reason TEXT,
  modules_cleaned JSONB NOT NULL DEFAULT '[]',
  rows_deleted JSONB NOT NULL DEFAULT '{}',
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT
);

ALTER TABLE public.database_reset_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view reset audit"
ON public.database_reset_audit FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only system can insert reset audit"
ON public.database_reset_audit FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Create admin reset OTP table  
CREATE TABLE public.admin_reset_otp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  otp_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  attempts_left INTEGER NOT NULL DEFAULT 5,
  used BOOLEAN NOT NULL DEFAULT false,
  phone_sent_to TEXT
);

ALTER TABLE public.admin_reset_otp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own OTP records"
ON public.admin_reset_otp FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own OTP records"
ON public.admin_reset_otp FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own OTP records"
ON public.admin_reset_otp FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Rate limiting table for reset attempts
CREATE TABLE public.admin_reset_rate_limit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  attempt_type TEXT NOT NULL DEFAULT 'reset' -- 'reset', 'otp_request', 'otp_verify'
);

ALTER TABLE public.admin_reset_rate_limit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rate limit"
ON public.admin_reset_rate_limit FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own rate limit"
ON public.admin_reset_rate_limit FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Index for rate limiting queries
CREATE INDEX idx_admin_reset_rate_limit_user_time 
ON public.admin_reset_rate_limit(user_id, attempted_at DESC);

-- Index for OTP lookups
CREATE INDEX idx_admin_reset_otp_user 
ON public.admin_reset_otp(user_id, used, expires_at DESC);
