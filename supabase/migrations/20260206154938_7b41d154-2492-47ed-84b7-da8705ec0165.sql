
-- ============================================
-- 1) PRECIOS POR SUCURSAL
-- ============================================
CREATE TABLE public.product_prices_by_branch (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  UNIQUE(product_id, branch_id)
);

ALTER TABLE public.product_prices_by_branch ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view branch prices"
  ON public.product_prices_by_branch FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage branch prices"
  ON public.product_prices_by_branch FOR ALL
  TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_product_prices_by_branch_updated_at
  BEFORE UPDATE ON public.product_prices_by_branch
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit log for price changes
CREATE TABLE public.price_change_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  previous_price NUMERIC(10,2),
  new_price NUMERIC(10,2) NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.price_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view price change log"
  ON public.price_change_log FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert price change log"
  ON public.price_change_log FOR INSERT
  TO authenticated WITH CHECK (true);

-- Function to resolve effective price for a product at a branch
CREATE OR REPLACE FUNCTION public.get_effective_price(p_product_id UUID, p_branch_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT price FROM product_prices_by_branch
     WHERE product_id = p_product_id AND branch_id = p_branch_id AND is_active = true
     LIMIT 1),
    (SELECT sale_price FROM products WHERE id = p_product_id)
  );
$$;

-- ============================================
-- 2) PAQUETES (BUNDLES)
-- ============================================
CREATE TABLE public.packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  package_type TEXT NOT NULL DEFAULT 'flexible' CHECK (package_type IN ('fixed', 'flexible')),
  base_price NUMERIC(10,2) CHECK (base_price >= 0),
  branch_scope TEXT NOT NULL DEFAULT 'ALL' CHECK (branch_scope IN ('ALL', 'SPECIFIC')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active packages"
  ON public.packages FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage packages"
  ON public.packages FOR ALL
  TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_packages_updated_at
  BEFORE UPDATE ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Package items (components of a package)
CREATE TABLE public.package_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('CATEGORY', 'PRODUCT')),
  category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  is_required BOOLEAN NOT NULL DEFAULT true,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.package_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view package items"
  ON public.package_items FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage package items"
  ON public.package_items FOR ALL
  TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Package prices by branch
CREATE TABLE public.package_prices_by_branch (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(package_id, branch_id)
);

ALTER TABLE public.package_prices_by_branch ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view package branch prices"
  ON public.package_prices_by_branch FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage package branch prices"
  ON public.package_prices_by_branch FOR ALL
  TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_package_prices_by_branch_updated_at
  BEFORE UPDATE ON public.package_prices_by_branch
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add package_id to sales for reporting
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL;

-- ============================================
-- 3) PROMOCIONES
-- ============================================
CREATE TABLE public.promotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('PERCENT', 'FIXED')),
  discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value >= 0),
  applies_to TEXT NOT NULL CHECK (applies_to IN ('CATEGORY', 'PRODUCT', 'PACKAGE')),
  category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
  branch_scope TEXT NOT NULL DEFAULT 'ALL' CHECK (branch_scope IN ('ALL', 'SPECIFIC')),
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_combinable BOOLEAN NOT NULL DEFAULT false,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active promotions"
  ON public.promotions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage promotions"
  ON public.promotions FOR ALL
  TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_promotions_updated_at
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Promotion usage audit
CREATE TABLE public.promotion_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  sale_item_id UUID,
  discount_applied NUMERIC(10,2) NOT NULL,
  applied_by UUID,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.promotion_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view promotion usage"
  ON public.promotion_usage FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert promotion usage"
  ON public.promotion_usage FOR INSERT
  TO authenticated WITH CHECK (true);

-- Function to find applicable promotions for a product/category at a branch
CREATE OR REPLACE FUNCTION public.get_applicable_promotions(
  p_product_id UUID DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_package_id UUID DEFAULT NULL,
  p_branch_id UUID DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  discount_type TEXT,
  discount_value NUMERIC,
  applies_to TEXT,
  is_combinable BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.discount_type, p.discount_value, p.applies_to, p.is_combinable
  FROM promotions p
  WHERE p.is_active = true
    AND CURRENT_DATE BETWEEN p.start_date AND p.end_date
    AND (p.max_uses IS NULL OR p.current_uses < p.max_uses)
    AND (
      -- Match by product
      (p.applies_to = 'PRODUCT' AND p.product_id = p_product_id)
      -- Match by category
      OR (p.applies_to = 'CATEGORY' AND p.category_id = p_category_id)
      -- Match by package
      OR (p.applies_to = 'PACKAGE' AND p.package_id = p_package_id)
    )
    AND (
      -- Branch scope
      p.branch_scope = 'ALL'
      OR (p.branch_scope = 'SPECIFIC' AND p.branch_id = p_branch_id)
    )
  ORDER BY 
    CASE p.discount_type 
      WHEN 'FIXED' THEN p.discount_value 
      ELSE 0 
    END DESC,
    p.discount_value DESC;
$$;
