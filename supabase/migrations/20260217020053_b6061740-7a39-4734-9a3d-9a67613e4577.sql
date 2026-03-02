
-- 1. Migrate existing admin users to super_admin
UPDATE public.user_roles SET role = 'super_admin' WHERE role = 'admin';

-- 2. Update has_role for backward compatibility:
--    has_role(uid, 'admin') returns true if user has 'super_admin'
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        role = _role
        OR (_role = 'admin' AND role = 'super_admin')
      )
  )
$$;

-- 3. Update validate_user_role trigger
CREATE OR REPLACE FUNCTION public.validate_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Block vendedor role
  IF NEW.role = 'vendedor' THEN
    RAISE EXCEPTION 'El rol "vendedor" no está permitido. Use los roles válidos: super_admin, gerente, doctor, optometrista, asistente, cobrador';
  END IF;
  
  -- Block 'admin' - must use 'super_admin' instead
  IF NEW.role = 'admin' THEN
    RAISE EXCEPTION 'El rol "admin" fue reemplazado por "super_admin". Use super_admin en su lugar.';
  END IF;
  
  -- Block promotor as user role
  IF NEW.role::text ILIKE 'promotor%' THEN
    RAISE EXCEPTION 'Promotor no es un rol de usuario. Los promotores son entidades independientes sin acceso al sistema';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 4. Update set_user_roles function
CREATE OR REPLACE FUNCTION public.set_user_roles(p_target_user_id uuid, p_roles jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only super_admin can change roles (backward compat via has_role)
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Permiso denegado: solo el Super Administrador puede modificar roles.';
  END IF;

  IF p_target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes modificar tus propios roles.';
  END IF;

  DELETE FROM public.user_roles WHERE user_id = p_target_user_id;

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
$function$;
