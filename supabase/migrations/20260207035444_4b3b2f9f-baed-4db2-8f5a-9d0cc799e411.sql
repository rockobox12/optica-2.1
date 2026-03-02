-- Add visual_exam_id column to patient_prescriptions to link with visual exams
ALTER TABLE public.patient_prescriptions 
ADD COLUMN IF NOT EXISTS visual_exam_id UUID REFERENCES public.visual_exams(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_patient_prescriptions_visual_exam_id 
ON public.patient_prescriptions(visual_exam_id) 
WHERE visual_exam_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.patient_prescriptions.visual_exam_id IS 'Links this prescription to the visual exam it was created with (for unified exam flow)';