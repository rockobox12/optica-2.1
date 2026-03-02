-- Add referido_promotor_id column to patients table to link with promotores
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS referido_promotor_id UUID REFERENCES public.promotores(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_patients_referido_promotor_id ON public.patients(referido_promotor_id);

-- Add comment explaining the field
COMMENT ON COLUMN public.patients.referido_promotor_id IS 'ID del promotor que refirió al paciente. NULL significa que llegó solo (Óptica Istmeña).';