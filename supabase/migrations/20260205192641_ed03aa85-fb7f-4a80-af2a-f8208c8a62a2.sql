-- Add AI-related fields to marketing_campaigns
ALTER TABLE public.marketing_campaigns 
ADD COLUMN IF NOT EXISTS ai_generated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_segment_id uuid,
ADD COLUMN IF NOT EXISTS ai_suggestions jsonb,
ADD COLUMN IF NOT EXISTS objective text,
ADD COLUMN IF NOT EXISTS approved_by uuid,
ADD COLUMN IF NOT EXISTS approved_at timestamptz,
ADD COLUMN IF NOT EXISTS scheduled_send_at timestamptz,
ADD COLUMN IF NOT EXISTS responses_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS appointments_generated integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS sales_attributed numeric(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS roi_estimated numeric(8,2);

-- Create AI segments table for intelligent segmentation
CREATE TABLE IF NOT EXISTS public.ai_campaign_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  criteria jsonb NOT NULL,
  patient_count integer DEFAULT 0,
  justification text,
  segment_type text NOT NULL,
  branch_id uuid REFERENCES public.branches(id),
  is_active boolean DEFAULT true,
  last_calculated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create campaign audit log for approvals
CREATE TABLE IF NOT EXISTS public.campaign_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  action text NOT NULL,
  previous_status text,
  new_status text,
  performed_by uuid NOT NULL,
  performed_by_role text NOT NULL,
  notes text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create campaign templates table
CREATE TABLE IF NOT EXISTS public.campaign_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template_type text NOT NULL,
  channel text NOT NULL,
  subject text,
  content text NOT NULL,
  variables text[] DEFAULT '{}',
  is_ai_generated boolean DEFAULT false,
  is_active boolean DEFAULT true,
  branch_id uuid REFERENCES public.branches(id),
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create opt-out/exclusion list
CREATE TABLE IF NOT EXISTS public.campaign_exclusions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  channel text NOT NULL,
  reason text,
  excluded_at timestamptz DEFAULT now(),
  excluded_by uuid,
  UNIQUE(patient_id, channel)
);

-- Enable RLS
ALTER TABLE public.ai_campaign_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_exclusions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_campaign_segments
CREATE POLICY "Admin full access to segments"
ON public.ai_campaign_segments FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for campaign_audit_log
CREATE POLICY "Admin full access to audit log"
ON public.campaign_audit_log FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own audit entries"
ON public.campaign_audit_log FOR SELECT
TO authenticated
USING (performed_by = auth.uid());

-- RLS Policies for campaign_templates
CREATE POLICY "Admin full access to templates"
ON public.campaign_templates FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view active templates"
ON public.campaign_templates FOR SELECT
TO authenticated
USING (is_active = true);

-- RLS Policies for campaign_exclusions
CREATE POLICY "Admin full access to exclusions"
ON public.campaign_exclusions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_segments_type ON public.ai_campaign_segments(segment_type);
CREATE INDEX IF NOT EXISTS idx_ai_segments_branch ON public.ai_campaign_segments(branch_id);
CREATE INDEX IF NOT EXISTS idx_campaign_audit_campaign ON public.campaign_audit_log(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_templates_type ON public.campaign_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_campaign_exclusions_patient ON public.campaign_exclusions(patient_id);