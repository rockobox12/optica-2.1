
-- 1) Add corporate patient columns to patients
ALTER TABLE public.patients 
  ADD COLUMN IF NOT EXISTS home_branch_id uuid REFERENCES public.branches(id),
  ADD COLUMN IF NOT EXISTS is_corporate_patient boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS current_branch_id uuid REFERENCES public.branches(id);

-- Backfill home_branch_id from existing branch_id
UPDATE public.patients SET home_branch_id = branch_id WHERE home_branch_id IS NULL AND branch_id IS NOT NULL;

-- 2) Add corporate_patients_enabled to company_settings
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS corporate_patients_enabled boolean NOT NULL DEFAULT true;

-- 3) Create index for cross-branch lookups
CREATE INDEX IF NOT EXISTS idx_patients_home_branch ON public.patients(home_branch_id);
CREATE INDEX IF NOT EXISTS idx_patients_current_branch ON public.patients(current_branch_id);
CREATE INDEX IF NOT EXISTS idx_patients_corporate ON public.patients(is_corporate_patient) WHERE is_corporate_patient = true;
