
-- Function to normalize MX phone to E.164
CREATE OR REPLACE FUNCTION public.normalize_phone_mx(p_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_cleaned text;
BEGIN
  IF p_phone IS NULL OR p_phone = '' THEN
    RETURN NULL;
  END IF;
  v_cleaned := regexp_replace(p_phone, '\D', '', 'g');
  IF length(v_cleaned) = 10 THEN
    v_cleaned := '52' || v_cleaned;
  ELSIF length(v_cleaned) = 13 AND v_cleaned LIKE '521%' THEN
    v_cleaned := '52' || substring(v_cleaned from 4);
  END IF;
  IF length(v_cleaned) = 12 AND v_cleaned LIKE '52%' THEN
    RETURN '+' || v_cleaned;
  END IF;
  IF length(v_cleaned) >= 10 THEN
    RETURN '+' || v_cleaned;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger function to auto-populate phone_e164
CREATE OR REPLACE FUNCTION public.patients_set_phone_e164()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.phone_e164 := COALESCE(
    normalize_phone_mx(NEW.whatsapp::text),
    normalize_phone_mx(NEW.mobile::text),
    normalize_phone_mx(NEW.phone::text)
  );
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_patients_set_phone_e164 ON public.patients;
CREATE TRIGGER trg_patients_set_phone_e164
BEFORE INSERT OR UPDATE OF whatsapp, mobile, phone ON public.patients
FOR EACH ROW
EXECUTE FUNCTION public.patients_set_phone_e164();

-- Update find_patient_by_phone_portal to use phone_e164
CREATE OR REPLACE FUNCTION public.find_patient_by_phone_portal(p_phone text)
RETURNS TABLE(id uuid, first_name text, last_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_e164 text;
  v_last10 text;
BEGIN
  v_e164 := normalize_phone_mx(p_phone);
  v_last10 := right(regexp_replace(p_phone, '\D', '', 'g'), 10);
  
  -- Primary: search by phone_e164 (fast indexed lookup)
  IF v_e164 IS NOT NULL THEN
    RETURN QUERY
    SELECT p.id, p.first_name, p.last_name
    FROM patients p
    WHERE p.is_deleted = false AND p.phone_e164 = v_e164
    LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;
  
  -- Fallback: broader search by last 10 digits
  RETURN QUERY
  SELECT p.id, p.first_name, p.last_name
  FROM patients p
  WHERE p.is_deleted = false
    AND (
      right(regexp_replace(p.whatsapp::text, '\D', '', 'g'), 10) = v_last10
      OR right(regexp_replace(p.mobile::text, '\D', '', 'g'), 10) = v_last10
      OR right(regexp_replace(p.phone::text, '\D', '', 'g'), 10) = v_last10
    )
  LIMIT 1;
END;
$$;
