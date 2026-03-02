-- Table to audit IA clinical analysis events
CREATE TABLE public.prescription_ai_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  prescription_id uuid REFERENCES public.patient_prescriptions(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  findings_count integer NOT NULL DEFAULT 0,
  severity text NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
  findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  was_reviewed boolean NOT NULL DEFAULT false,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prescription_ai_analysis ENABLE ROW LEVEL SECURITY;

-- Only admin and doctor can view analysis records
CREATE POLICY "Admin and doctors can view prescription AI analysis"
ON public.prescription_ai_analysis
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'doctor'::app_role)
);

-- Only admin and doctor can insert analysis
CREATE POLICY "Admin and doctors can insert prescription AI analysis"
ON public.prescription_ai_analysis
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'doctor'::app_role)
);

-- Only the user who created can update (mark as reviewed)
CREATE POLICY "Users can update their own analysis"
ON public.prescription_ai_analysis
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Create index for efficient queries
CREATE INDEX idx_prescription_ai_analysis_patient ON public.prescription_ai_analysis(patient_id);
CREATE INDEX idx_prescription_ai_analysis_prescription ON public.prescription_ai_analysis(prescription_id);

COMMENT ON TABLE public.prescription_ai_analysis IS 'Audit log for IA clinical validation of prescriptions';