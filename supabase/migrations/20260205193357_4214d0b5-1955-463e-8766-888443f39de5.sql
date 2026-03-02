-- Clinical opportunities detected by AI
CREATE TABLE IF NOT EXISTS public.clinical_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id),
  opportunity_type text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  clinical_summary text NOT NULL,
  clinical_details jsonb,
  detected_at timestamptz DEFAULT now(),
  detected_by_model text DEFAULT 'clinical-marketing-bridge',
  status text NOT NULL DEFAULT 'detected',
  marketing_action_id uuid,
  discarded_at timestamptz,
  discarded_by uuid,
  discard_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Marketing actions suggested from clinical opportunities
CREATE TABLE IF NOT EXISTS public.clinical_marketing_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.clinical_opportunities(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  channel text NOT NULL,
  suggested_message text NOT NULL,
  suggested_subject text,
  suggested_send_window jsonb,
  status text NOT NULL DEFAULT 'suggested',
  approved_at timestamptz,
  approved_by uuid,
  approved_message text,
  scheduled_at timestamptz,
  sent_at timestamptz,
  campaign_id uuid REFERENCES public.marketing_campaigns(id),
  response_received boolean DEFAULT false,
  patient_visited boolean DEFAULT false,
  sale_attributed numeric(12,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- AI learning data for continuous improvement
CREATE TABLE IF NOT EXISTS public.clinical_ai_learning (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_type text NOT NULL,
  action_type text NOT NULL,
  was_approved boolean NOT NULL,
  patient_responded boolean,
  patient_visited boolean,
  sale_amount numeric(12,2),
  feedback_score integer,
  original_message text,
  approved_message text,
  suggested_timing jsonb,
  actual_timing timestamptz,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Audit log for clinical-marketing bridge
CREATE TABLE IF NOT EXISTS public.clinical_marketing_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid REFERENCES public.clinical_opportunities(id),
  action_id uuid REFERENCES public.clinical_marketing_actions(id),
  event_type text NOT NULL,
  performed_by uuid NOT NULL,
  performed_by_role text NOT NULL,
  previous_status text,
  new_status text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clinical_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_marketing_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_ai_learning ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_marketing_audit ENABLE ROW LEVEL SECURITY;

-- RLS for clinical_opportunities
CREATE POLICY "Admin full access to opportunities"
ON public.clinical_opportunities FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Doctor can view opportunities"
ON public.clinical_opportunities FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'doctor'));

-- RLS for clinical_marketing_actions
CREATE POLICY "Admin full access to marketing actions"
ON public.clinical_marketing_actions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Doctor can view marketing actions"
ON public.clinical_marketing_actions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'doctor'));

-- RLS for clinical_ai_learning
CREATE POLICY "Admin full access to learning data"
ON public.clinical_ai_learning FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS for clinical_marketing_audit
CREATE POLICY "Admin full access to audit"
ON public.clinical_marketing_audit FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own audit entries"
ON public.clinical_marketing_audit FOR SELECT
TO authenticated
USING (performed_by = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clinical_opportunities_patient ON public.clinical_opportunities(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_opportunities_status ON public.clinical_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_clinical_opportunities_type ON public.clinical_opportunities(opportunity_type);
CREATE INDEX IF NOT EXISTS idx_clinical_opportunities_priority ON public.clinical_opportunities(priority);
CREATE INDEX IF NOT EXISTS idx_marketing_actions_opportunity ON public.clinical_marketing_actions(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_marketing_actions_status ON public.clinical_marketing_actions(status);
CREATE INDEX IF NOT EXISTS idx_learning_type ON public.clinical_ai_learning(opportunity_type, action_type);