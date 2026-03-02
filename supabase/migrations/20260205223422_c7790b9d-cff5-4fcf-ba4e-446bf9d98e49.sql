-- Create drafts table for backend persistence
CREATE TABLE public.drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  branch_id UUID REFERENCES public.branches(id),
  form_type TEXT NOT NULL CHECK (form_type IN ('POS_SALE', 'PATIENT', 'APPOINTMENT', 'LAB_ORDER')),
  entity_id UUID, -- For edit operations
  draft_data JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISCARDED', 'SUBMITTED')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX idx_drafts_user_branch_form ON public.drafts(user_id, branch_id, form_type, status);
CREATE INDEX idx_drafts_entity ON public.drafts(entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX idx_drafts_updated ON public.drafts(updated_at DESC);

-- Enable RLS
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own drafts
CREATE POLICY "Users can view their own drafts"
ON public.drafts
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own drafts
CREATE POLICY "Users can create their own drafts"
ON public.drafts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own drafts
CREATE POLICY "Users can update their own drafts"
ON public.drafts
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own drafts
CREATE POLICY "Users can delete their own drafts"
ON public.drafts
FOR DELETE
USING (auth.uid() = user_id);

-- Admin can see all drafts
CREATE POLICY "Admins can view all drafts"
ON public.drafts
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_drafts_updated_at
BEFORE UPDATE ON public.drafts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to upsert draft
CREATE OR REPLACE FUNCTION public.upsert_draft(
  p_user_id UUID,
  p_branch_id UUID,
  p_form_type TEXT,
  p_entity_id UUID,
  p_draft_data JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_draft_id UUID;
BEGIN
  -- Find existing active draft
  SELECT id INTO v_draft_id
  FROM public.drafts
  WHERE user_id = p_user_id
    AND (branch_id = p_branch_id OR (branch_id IS NULL AND p_branch_id IS NULL))
    AND form_type = p_form_type
    AND (entity_id = p_entity_id OR (entity_id IS NULL AND p_entity_id IS NULL))
    AND status = 'ACTIVE'
  LIMIT 1;

  IF v_draft_id IS NOT NULL THEN
    -- Update existing
    UPDATE public.drafts
    SET draft_data = p_draft_data,
        updated_at = now()
    WHERE id = v_draft_id;
  ELSE
    -- Insert new
    INSERT INTO public.drafts (user_id, branch_id, form_type, entity_id, draft_data)
    VALUES (p_user_id, p_branch_id, p_form_type, p_entity_id, p_draft_data)
    RETURNING id INTO v_draft_id;
  END IF;

  RETURN v_draft_id;
END;
$$;

-- Function to get active draft
CREATE OR REPLACE FUNCTION public.get_active_draft(
  p_user_id UUID,
  p_branch_id UUID,
  p_form_type TEXT,
  p_entity_id UUID DEFAULT NULL
)
RETURNS TABLE(id UUID, draft_data JSONB, updated_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT d.id, d.draft_data, d.updated_at
  FROM public.drafts d
  WHERE d.user_id = p_user_id
    AND (d.branch_id = p_branch_id OR (d.branch_id IS NULL AND p_branch_id IS NULL))
    AND d.form_type = p_form_type
    AND (d.entity_id = p_entity_id OR (d.entity_id IS NULL AND p_entity_id IS NULL))
    AND d.status = 'ACTIVE'
  ORDER BY d.updated_at DESC
  LIMIT 1;
$$;

-- Function to mark draft as submitted/discarded
CREATE OR REPLACE FUNCTION public.resolve_draft(
  p_draft_id UUID,
  p_status TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.drafts
  SET status = p_status,
      updated_at = now()
  WHERE id = p_draft_id
    AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;