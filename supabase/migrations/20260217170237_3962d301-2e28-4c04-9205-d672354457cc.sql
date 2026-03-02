
CREATE OR REPLACE FUNCTION public.set_user_roles(p_target_user_id uuid, p_roles jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only super_admin can change roles
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Permiso denegado: solo el Super Administrador puede modificar roles.';
  END IF;

  -- Allow super_admin to edit their own roles (removed self-edit restriction)

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
$$;
