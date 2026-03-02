
-- Add computed utility and margin columns to products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS utility NUMERIC GENERATED ALWAYS AS (sale_price - cost_price) STORED,
ADD COLUMN IF NOT EXISTS margin_percent NUMERIC GENERATED ALWAYS AS (
  CASE WHEN sale_price > 0 THEN ROUND(((sale_price - cost_price) / sale_price) * 100, 2) ELSE 0 END
) STORED;
