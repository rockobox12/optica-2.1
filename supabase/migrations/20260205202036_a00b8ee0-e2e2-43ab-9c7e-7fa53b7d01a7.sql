-- Migration: Remove vendedor role from system and migrate to asistente
-- The "vendedor" role is being replaced by "Promotor" which is NOT a user role

-- Step 1: Update existing vendedor roles to asistente
UPDATE public.user_roles 
SET role = 'asistente'
WHERE role = 'vendedor';

-- Step 2: Log this migration in access_logs for auditing
INSERT INTO public.access_logs (email, event_type, metadata, user_agent)
SELECT 
  COALESCE(p.email, 'system@opticaistmena.com'),
  'permission_denied'::access_event_type,
  jsonb_build_object(
    'migration', 'vendedor_to_asistente',
    'description', 'Rol vendedor migrado automáticamente a asistente',
    'migrated_at', now()::text
  ),
  'System Migration'
FROM public.user_roles ur
JOIN public.profiles p ON p.user_id = ur.user_id
WHERE ur.role = 'asistente' 
  AND NOT EXISTS (
    SELECT 1 FROM public.access_logs al 
    WHERE al.metadata->>'migration' = 'vendedor_to_asistente'
  )
LIMIT 1;

-- Step 3: Create a trigger function to prevent vendedor role from being created
CREATE OR REPLACE FUNCTION public.validate_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Block vendedor role as it was replaced by Promotor entity (non-user)
  IF NEW.role = 'vendedor' THEN
    RAISE EXCEPTION 'El rol "vendedor" no está permitido. Use "asistente" o los roles válidos: admin, doctor, asistente, cobrador';
  END IF;
  
  -- Block any attempt to assign "promotor" as a user role
  -- (promotor is an entity, not a user role)
  IF NEW.role::text ILIKE 'promotor%' THEN
    RAISE EXCEPTION 'Promotor no es un rol de usuario. Los promotores son entidades independientes sin acceso al sistema';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 4: Create trigger on user_roles table
DROP TRIGGER IF EXISTS validate_user_role_trigger ON public.user_roles;
CREATE TRIGGER validate_user_role_trigger
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_user_role();

-- Step 5: Add comment for documentation
COMMENT ON FUNCTION public.validate_user_role() IS 'Validates user roles: blocks vendedor (deprecated) and promotor (entity, not user role). Valid roles: admin, doctor, asistente, cobrador';