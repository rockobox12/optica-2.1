-- Add version control fields to patient_prescriptions
-- Status: VIGENTE (current), CORREGIDA (corrected/superseded)
CREATE TYPE public.prescription_status AS ENUM ('VIGENTE', 'CORREGIDA');

ALTER TABLE public.patient_prescriptions
ADD COLUMN status prescription_status NOT NULL DEFAULT 'VIGENTE',
ADD COLUMN previous_prescription_id uuid REFERENCES public.patient_prescriptions(id) ON DELETE SET NULL,
ADD COLUMN edited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN edited_at timestamp with time zone,
ADD COLUMN edit_reason text;

-- Create index for efficient queries
CREATE INDEX idx_prescriptions_status ON public.patient_prescriptions(patient_id, status);
CREATE INDEX idx_prescriptions_previous ON public.patient_prescriptions(previous_prescription_id);

-- Comment for documentation
COMMENT ON COLUMN public.patient_prescriptions.status IS 'VIGENTE = current active prescription, CORREGIDA = superseded by a correction';
COMMENT ON COLUMN public.patient_prescriptions.previous_prescription_id IS 'Reference to the prescription this one corrects (for audit trail)';
COMMENT ON COLUMN public.patient_prescriptions.edited_by IS 'User who created the correction';
COMMENT ON COLUMN public.patient_prescriptions.edited_at IS 'When the correction was made';
COMMENT ON COLUMN public.patient_prescriptions.edit_reason IS 'Optional reason for the correction';