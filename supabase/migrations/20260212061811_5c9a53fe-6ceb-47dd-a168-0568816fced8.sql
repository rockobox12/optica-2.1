
-- Add sale_channel column to sales table
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS sale_channel text NOT NULL DEFAULT 'OPTICA';

-- Add responsible columns to sales table for tracking
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS sale_responsible_type text DEFAULT 'OPTICA',
ADD COLUMN IF NOT EXISTS sale_responsible_user_id uuid,
ADD COLUMN IF NOT EXISTS sale_responsible_name_snapshot text;

-- Add comment
COMMENT ON COLUMN public.sales.sale_channel IS 'OPTICA = mostrador, CAMPO = domicilio/campo';
