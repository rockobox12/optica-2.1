
-- Add requires_prescription flag to product_categories
ALTER TABLE public.product_categories
ADD COLUMN requires_prescription BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.product_categories.requires_prescription IS 'When true, sales containing products of this category require a linked prescription';

-- Set requires_prescription for lens-related categories
UPDATE public.product_categories
SET requires_prescription = true
WHERE name IN ('Lentes de Contacto', 'Lentes de Sol')
   OR name ILIKE '%mica%'
   OR name ILIKE '%lente graduado%'
   OR name ILIKE '%paquete%';
