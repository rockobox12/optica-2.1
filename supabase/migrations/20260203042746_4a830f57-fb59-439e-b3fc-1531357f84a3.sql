-- Drop the overly permissive policy and restrict inserts to the security definer function only
DROP POLICY IF EXISTS "Service role can insert access logs" ON public.access_logs;

-- Deny all direct inserts - only the log_access_event function can insert
CREATE POLICY "No direct inserts to access_logs"
  ON public.access_logs FOR INSERT
  WITH CHECK (false);

-- Grant execute on the log_access_event function to authenticated users
GRANT EXECUTE ON FUNCTION public.log_access_event TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_active TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_by_email TO authenticated;