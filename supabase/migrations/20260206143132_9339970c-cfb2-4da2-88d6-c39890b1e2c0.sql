
-- 1) Add category_type to product_categories
ALTER TABLE public.product_categories 
ADD COLUMN IF NOT EXISTS category_type text NOT NULL DEFAULT 'product' 
CHECK (category_type IN ('product', 'service'));

-- 2) Add controls_stock to products (allows micas/services to not track stock)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS controls_stock boolean NOT NULL DEFAULT true;

-- 3) Update existing categories with proper types
UPDATE public.product_categories SET category_type = 'service' WHERE name = 'Servicios';
UPDATE public.product_categories SET category_type = 'product' WHERE name != 'Servicios';

-- 4) Seed new categories for Micas and Tratamientos if not existing
INSERT INTO public.product_categories (name, description, category_type, is_active)
VALUES 
  ('Micas', 'Micas para lentes oftálmicos (antirreflejante, blue cut, fotocromáticas, etc.)', 'product', true),
  ('Tratamientos', 'Tratamientos y recubrimientos para lentes', 'service', true)
ON CONFLICT DO NOTHING;

-- 5) Update existing products: services don't control stock
UPDATE public.products SET controls_stock = false WHERE product_type = 'service';
