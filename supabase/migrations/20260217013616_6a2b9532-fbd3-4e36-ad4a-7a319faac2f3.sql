
-- 1) RPC to set user roles (SECURITY DEFINER, only admin can call)
CREATE OR REPLACE FUNCTION public.set_user_roles(
  p_target_user_id uuid,
  p_roles jsonb -- array of {role: text, branch_id: uuid|null}
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role RECORD;
BEGIN
  -- Only admin can change roles
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Permiso denegado: solo el Administrador puede modificar roles.';
  END IF;

  -- Prevent modifying own roles (safety)
  IF p_target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes modificar tus propios roles.';
  END IF;

  -- Delete existing roles
  DELETE FROM public.user_roles WHERE user_id = p_target_user_id;

  -- Insert new roles
  INSERT INTO public.user_roles (user_id, role, branch_id)
  SELECT 
    p_target_user_id,
    (r->>'role')::app_role,
    CASE WHEN r->>'branch_id' IS NOT NULL AND r->>'branch_id' != '' 
         THEN (r->>'branch_id')::uuid 
         ELSE NULL 
    END
  FROM jsonb_array_elements(p_roles) AS r;

  RETURN jsonb_build_object('success', true, 'roles_count', jsonb_array_length(p_roles));
END;
$$;

-- 2) Add otp_security_phone to company_settings
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS otp_security_phone text DEFAULT NULL;

COMMENT ON COLUMN public.company_settings.otp_security_phone IS 'Phone number for OTP verification on sensitive operations (DB reset, etc). Falls back to admin profile phone if null.';
