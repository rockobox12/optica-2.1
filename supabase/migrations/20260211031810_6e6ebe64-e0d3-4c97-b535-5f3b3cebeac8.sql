
-- Credit settings table (singleton pattern)
CREATE TABLE public.credit_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_sales_to_morosos BOOLEAN NOT NULL DEFAULT false,
  admin_exception_only BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default row
INSERT INTO public.credit_settings (block_sales_to_morosos, admin_exception_only)
VALUES (false, true);

-- Enable RLS
ALTER TABLE public.credit_settings ENABLE ROW LEVEL SECURITY;

-- All authenticated can read
CREATE POLICY "Authenticated users can read credit settings"
ON public.credit_settings FOR SELECT TO authenticated USING (true);

-- Only admins can update
CREATE POLICY "Admins can update credit settings"
ON public.credit_settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Audit table for moroso sale exceptions
CREATE TABLE public.moroso_sale_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  sale_id UUID REFERENCES public.sales(id),
  saldo_pendiente NUMERIC NOT NULL DEFAULT 0,
  dias_atraso INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.moroso_sale_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read moroso exceptions"
ON public.moroso_sale_exceptions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert moroso exceptions"
ON public.moroso_sale_exceptions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at on credit_settings
CREATE TRIGGER update_credit_settings_updated_at
BEFORE UPDATE ON public.credit_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
