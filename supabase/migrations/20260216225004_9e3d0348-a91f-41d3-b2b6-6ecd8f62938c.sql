
-- Add phone_e164 column to patients
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS phone_e164 text;

-- Create non-unique index for fast lookups
CREATE INDEX IF NOT EXISTS idx_patients_phone_e164 ON public.patients (phone_e164) WHERE phone_e164 IS NOT NULL;
