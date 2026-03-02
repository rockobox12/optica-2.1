
-- Create a secure function to find patient by phone (bypasses RLS safely)
-- Only returns minimal info needed for portal OTP flow
CREATE OR REPLACE FUNCTION public.find_patient_by_phone_portal(p_phone text)
RETURNS TABLE(id uuid, first_name text, last_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cleaned text;
  v_e164 text;
  v_plain text;
  v_last10 text;
BEGIN
  -- Normalize phone: remove spaces, dashes, parens, +
  v_cleaned := regexp_replace(p_phone, '[\s\-\(\)\+]', '', 'g');
  
  -- Handle different formats
  IF length(v_cleaned) = 10 THEN
    v_cleaned := '52' || v_cleaned;
  ELSIF length(v_cleaned) = 13 AND v_cleaned LIKE '521%' THEN
    v_cleaned := '52' || substring(v_cleaned from 4);
  END IF;
  -- If 12 digits starting with 52, keep as is
  
  v_e164 := '+' || v_cleaned;
  v_plain := v_cleaned;
  v_last10 := right(v_cleaned, 10);
  
  RETURN QUERY
  SELECT p.id, p.first_name, p.last_name
  FROM patients p
  WHERE p.is_deleted = false
    AND (
      p.whatsapp = v_e164 OR p.whatsapp = v_plain OR p.whatsapp = v_last10
      OR p.mobile = v_e164 OR p.mobile = v_plain OR p.mobile = v_last10
      OR p.phone = v_e164 OR p.phone = v_plain OR p.phone = v_last10
    )
  LIMIT 1;
END;
$$;

-- Grant execute to anon so portal can use it
GRANT EXECUTE ON FUNCTION public.find_patient_by_phone_portal(text) TO anon;
GRANT EXECUTE ON FUNCTION public.find_patient_by_phone_portal(text) TO authenticated;
