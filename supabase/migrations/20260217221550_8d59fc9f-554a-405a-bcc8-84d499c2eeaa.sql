
-- Add cross-branch payment fields to credit_payments
ALTER TABLE public.credit_payments
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id),
  ADD COLUMN IF NOT EXISTS sale_branch_id UUID REFERENCES public.branches(id),
  ADD COLUMN IF NOT EXISTS is_cross_branch BOOLEAN NOT NULL DEFAULT false;

-- Add cross_branch_payments_enabled to company_settings
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS cross_branch_payments_enabled BOOLEAN NOT NULL DEFAULT false;

-- Index for cross-branch payment queries
CREATE INDEX IF NOT EXISTS idx_credit_payments_branch_id ON public.credit_payments(branch_id);
CREATE INDEX IF NOT EXISTS idx_credit_payments_is_cross_branch ON public.credit_payments(is_cross_branch) WHERE is_cross_branch = true;
