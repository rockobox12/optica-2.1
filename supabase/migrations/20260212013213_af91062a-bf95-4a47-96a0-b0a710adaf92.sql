
-- Add down payment (enganche) settings to credit_settings
ALTER TABLE public.credit_settings
ADD COLUMN min_down_payment_percent NUMERIC(5,2) NOT NULL DEFAULT 20,
ADD COLUMN min_down_payment_amount NUMERIC(10,2) DEFAULT NULL,
ADD COLUMN admin_down_payment_exception BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.credit_settings.min_down_payment_percent IS 'Minimum down payment percentage for credit sales (default 20%)';
COMMENT ON COLUMN public.credit_settings.min_down_payment_amount IS 'Optional fixed minimum down payment amount';
COMMENT ON COLUMN public.credit_settings.admin_down_payment_exception IS 'Allow admin to bypass down payment requirement';
