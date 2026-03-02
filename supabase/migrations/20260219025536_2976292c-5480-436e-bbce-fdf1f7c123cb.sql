
-- Add separate address component columns to patients
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS street text,
  ADD COLUMN IF NOT EXISTS street_number text,
  ADD COLUMN IF NOT EXISTS neighborhood text;

-- Add index for neighborhood searches
CREATE INDEX IF NOT EXISTS idx_patients_neighborhood ON public.patients(neighborhood);
