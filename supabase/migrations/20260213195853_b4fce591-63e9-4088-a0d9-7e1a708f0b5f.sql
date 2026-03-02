
-- Add address detail columns to patients table
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS between_streets_1 text,
  ADD COLUMN IF NOT EXISTS between_streets_2 text,
  ADD COLUMN IF NOT EXISTS address_reference_notes text;

COMMENT ON COLUMN public.patients.between_streets_1 IS 'Entre calle 1 for address reference';
COMMENT ON COLUMN public.patients.between_streets_2 IS 'Entre calle 2 (y calle) for address reference';
COMMENT ON COLUMN public.patients.address_reference_notes IS 'Address reference notes (landmarks, house color, etc)';
