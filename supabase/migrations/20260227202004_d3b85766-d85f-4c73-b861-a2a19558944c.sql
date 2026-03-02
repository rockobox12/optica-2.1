
-- Add 'tecnico' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'tecnico';

-- Update the role validation trigger to allow 'tecnico'
CREATE OR REPLACE FUNCTION public.validate_user_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Block vendedor role
  IF NEW.role = 'vendedor' THEN
    RAISE EXCEPTION 'El rol "vendedor" no está permitido. Use los roles válidos: super_admin, admin, gerente, doctor, optometrista, asistente, cobrador, tecnico';
  END IF;
  
  -- Block 'admin' standalone - must use 'super_admin' instead (but allow 'admin' enum value for backward compat)
  -- Note: 'admin' is kept in enum for backward compatibility with has_role function
  
  -- Block promotor as user role
  IF NEW.role::text ILIKE 'promotor%' THEN
    RAISE EXCEPTION 'Promotor no es un rol de usuario. Los promotores son entidades independientes sin acceso al sistema';
  END IF;
  
  RETURN NEW;
END;
$function$;
