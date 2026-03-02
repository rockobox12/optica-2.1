-- Create audit table for delivery AI suggestions
CREATE TABLE public.delivery_ai_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id),
  user_id UUID NOT NULL,
  user_role TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('suggestion_viewed', 'whatsapp_opened', 'reschedule_initiated', 'priority_changed', 'other')),
  risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_reasons TEXT[],
  recommendation TEXT,
  action_taken TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.delivery_ai_audit ENABLE ROW LEVEL SECURITY;

-- Simple policies - authenticated users can read and insert
CREATE POLICY "Authenticated users can read audit records"
ON public.delivery_ai_audit
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert audit records"
ON public.delivery_ai_audit
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create indexes for performance
CREATE INDEX idx_delivery_ai_audit_delivery_id ON public.delivery_ai_audit(delivery_id);
CREATE INDEX idx_delivery_ai_audit_created_at ON public.delivery_ai_audit(created_at DESC);
CREATE INDEX idx_delivery_ai_audit_user_id ON public.delivery_ai_audit(user_id);