-- Create enum for access log event types
CREATE TYPE public.access_event_type AS ENUM (
  'login_success',
  'login_failed',
  'logout',
  'password_reset_requested',
  'password_reset_completed',
  'session_expired',
  'account_locked',
  'permission_denied'
);

-- Create access_logs table for audit trail
CREATE TABLE public.access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  event_type access_event_type NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_access_logs_user_id ON public.access_logs(user_id);
CREATE INDEX idx_access_logs_created_at ON public.access_logs(created_at DESC);
CREATE INDEX idx_access_logs_event_type ON public.access_logs(event_type);

-- Enable RLS
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only admins can view access logs
CREATE POLICY "Admins can view all access logs"
  ON public.access_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow edge functions to insert access logs (using service role)
CREATE POLICY "Service role can insert access logs"
  ON public.access_logs FOR INSERT
  WITH CHECK (true);

-- Create function to log access events (security definer for service-level access)
CREATE OR REPLACE FUNCTION public.log_access_event(
  _user_id UUID,
  _email TEXT,
  _event_type access_event_type,
  _ip_address TEXT DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL,
  _branch_id UUID DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.access_logs (user_id, email, event_type, ip_address, user_agent, branch_id, metadata)
  VALUES (_user_id, _email, _event_type, _ip_address, _user_agent, _branch_id, _metadata)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Create function to check if user is active
CREATE OR REPLACE FUNCTION public.is_user_active(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_active FROM public.profiles WHERE user_id = _user_id),
    false
  )
$$;

-- Create function to get user profile by email
CREATE OR REPLACE FUNCTION public.get_profile_by_email(_email TEXT)
RETURNS TABLE(
  user_id UUID,
  full_name TEXT,
  is_active BOOLEAN,
  default_branch_id UUID
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name, p.is_active, p.default_branch_id
  FROM public.profiles p
  WHERE p.email = _email
  LIMIT 1
$$;