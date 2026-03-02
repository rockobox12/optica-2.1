-- Add category snapshot columns to sale_items
ALTER TABLE public.sale_items
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.product_categories(id),
ADD COLUMN IF NOT EXISTS category_name TEXT;

-- Backfill existing sale_items using product_code (SKU) match
UPDATE public.sale_items si
SET 
  category_id = p.category_id,
  category_name = pc.name
FROM public.products p
LEFT JOIN public.product_categories pc ON pc.id = p.category_id
WHERE si.category_name IS NULL
  AND si.product_code IS NOT NULL
  AND p.sku = si.product_code;