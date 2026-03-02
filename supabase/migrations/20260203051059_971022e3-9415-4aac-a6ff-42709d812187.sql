
-- Create product categories table
CREATE TABLE public.product_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.product_categories(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  barcode TEXT,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.product_categories(id),
  product_type TEXT NOT NULL DEFAULT 'product' CHECK (product_type IN ('product', 'service')),
  brand TEXT,
  model TEXT,
  color TEXT,
  size TEXT,
  material TEXT,
  -- Pricing
  cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  sale_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  wholesale_price DECIMAL(10,2),
  -- Stock settings
  min_stock INTEGER NOT NULL DEFAULT 0,
  max_stock INTEGER,
  reorder_point INTEGER NOT NULL DEFAULT 5,
  -- Flags
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_serialized BOOLEAN NOT NULL DEFAULT false,
  requires_prescription BOOLEAN NOT NULL DEFAULT false,
  -- Metadata
  image_url TEXT,
  specifications JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inventory table (stock per branch)
CREATE TABLE public.inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER NOT NULL DEFAULT 0,
  location TEXT,
  last_count_date TIMESTAMP WITH TIME ZONE,
  last_count_quantity INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, branch_id)
);

-- Create inventory movements table (Kardex)
CREATE TABLE public.inventory_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('entrada', 'salida', 'ajuste', 'transferencia', 'venta', 'devolucion')),
  quantity INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  reference_type TEXT,
  reference_id UUID,
  transfer_branch_id UUID REFERENCES public.branches(id),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create low stock alerts table
CREATE TABLE public.stock_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock', 'overstock')),
  current_quantity INTEGER NOT NULL,
  threshold_quantity INTEGER NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, branch_id, alert_type, is_resolved)
);

-- Create sequence for SKU generation
CREATE SEQUENCE IF NOT EXISTS product_sku_seq START 1;

-- Function to generate SKU
CREATE OR REPLACE FUNCTION public.generate_product_sku()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'PRD-' || LPAD(nextval('product_sku_seq')::TEXT, 6, '0');
END;
$$;

-- Function to update inventory and create movement
CREATE OR REPLACE FUNCTION public.update_inventory(
  p_product_id UUID,
  p_branch_id UUID,
  p_quantity INTEGER,
  p_movement_type TEXT,
  p_notes TEXT DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_unit_cost DECIMAL DEFAULT NULL,
  p_created_by UUID DEFAULT NULL,
  p_transfer_branch_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_stock INTEGER;
  v_new_stock INTEGER;
  v_movement_id UUID;
  v_inventory_id UUID;
BEGIN
  -- Get or create inventory record
  SELECT id, quantity INTO v_inventory_id, v_current_stock
  FROM inventory
  WHERE product_id = p_product_id AND branch_id = p_branch_id
  FOR UPDATE;
  
  IF v_inventory_id IS NULL THEN
    v_current_stock := 0;
    INSERT INTO inventory (product_id, branch_id, quantity)
    VALUES (p_product_id, p_branch_id, 0)
    RETURNING id INTO v_inventory_id;
  END IF;
  
  -- Calculate new stock based on movement type
  IF p_movement_type IN ('entrada', 'devolucion') THEN
    v_new_stock := v_current_stock + ABS(p_quantity);
  ELSIF p_movement_type IN ('salida', 'venta') THEN
    v_new_stock := v_current_stock - ABS(p_quantity);
  ELSIF p_movement_type = 'ajuste' THEN
    v_new_stock := p_quantity;
  ELSIF p_movement_type = 'transferencia' THEN
    v_new_stock := v_current_stock - ABS(p_quantity);
  ELSE
    v_new_stock := v_current_stock + p_quantity;
  END IF;
  
  -- Prevent negative stock
  IF v_new_stock < 0 THEN
    RAISE EXCEPTION 'Stock insuficiente. Stock actual: %, Cantidad solicitada: %', v_current_stock, ABS(p_quantity);
  END IF;
  
  -- Update inventory
  UPDATE inventory
  SET quantity = v_new_stock, updated_at = now()
  WHERE id = v_inventory_id;
  
  -- Create movement record
  INSERT INTO inventory_movements (
    product_id, branch_id, movement_type, quantity,
    previous_stock, new_stock, unit_cost, total_cost,
    reference_type, reference_id, transfer_branch_id,
    notes, created_by
  )
  VALUES (
    p_product_id, p_branch_id, p_movement_type, p_quantity,
    v_current_stock, v_new_stock, p_unit_cost, 
    CASE WHEN p_unit_cost IS NOT NULL THEN p_unit_cost * ABS(p_quantity) ELSE NULL END,
    p_reference_type, p_reference_id, p_transfer_branch_id,
    p_notes, p_created_by
  )
  RETURNING id INTO v_movement_id;
  
  -- Handle transfer: add stock to destination branch
  IF p_movement_type = 'transferencia' AND p_transfer_branch_id IS NOT NULL THEN
    PERFORM update_inventory(
      p_product_id, p_transfer_branch_id, ABS(p_quantity),
      'entrada', 'Transferencia desde otra sucursal',
      'transfer', v_movement_id, p_unit_cost, p_created_by, NULL
    );
  END IF;
  
  -- Check for stock alerts
  PERFORM check_stock_alerts(p_product_id, p_branch_id);
  
  RETURN v_movement_id;
END;
$$;

-- Function to check and create stock alerts
CREATE OR REPLACE FUNCTION public.check_stock_alerts(
  p_product_id UUID,
  p_branch_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_quantity INTEGER;
  v_min_stock INTEGER;
  v_max_stock INTEGER;
  v_reorder_point INTEGER;
BEGIN
  -- Get current stock and thresholds
  SELECT i.quantity, p.min_stock, p.max_stock, p.reorder_point
  INTO v_current_quantity, v_min_stock, v_max_stock, v_reorder_point
  FROM inventory i
  JOIN products p ON p.id = i.product_id
  WHERE i.product_id = p_product_id AND i.branch_id = p_branch_id;
  
  IF v_current_quantity IS NULL THEN
    RETURN;
  END IF;
  
  -- Resolve existing alerts if stock is back to normal
  UPDATE stock_alerts
  SET is_resolved = true, resolved_at = now()
  WHERE product_id = p_product_id 
    AND branch_id = p_branch_id 
    AND is_resolved = false
    AND (
      (alert_type = 'out_of_stock' AND v_current_quantity > 0) OR
      (alert_type = 'low_stock' AND v_current_quantity > v_reorder_point) OR
      (alert_type = 'overstock' AND (v_max_stock IS NULL OR v_current_quantity <= v_max_stock))
    );
  
  -- Create out of stock alert
  IF v_current_quantity = 0 THEN
    INSERT INTO stock_alerts (product_id, branch_id, alert_type, current_quantity, threshold_quantity)
    VALUES (p_product_id, p_branch_id, 'out_of_stock', 0, v_min_stock)
    ON CONFLICT (product_id, branch_id, alert_type, is_resolved) WHERE is_resolved = false DO NOTHING;
  -- Create low stock alert
  ELSIF v_current_quantity <= v_reorder_point THEN
    INSERT INTO stock_alerts (product_id, branch_id, alert_type, current_quantity, threshold_quantity)
    VALUES (p_product_id, p_branch_id, 'low_stock', v_current_quantity, v_reorder_point)
    ON CONFLICT (product_id, branch_id, alert_type, is_resolved) WHERE is_resolved = false DO NOTHING;
  END IF;
  
  -- Create overstock alert
  IF v_max_stock IS NOT NULL AND v_current_quantity > v_max_stock THEN
    INSERT INTO stock_alerts (product_id, branch_id, alert_type, current_quantity, threshold_quantity)
    VALUES (p_product_id, p_branch_id, 'overstock', v_current_quantity, v_max_stock)
    ON CONFLICT (product_id, branch_id, alert_type, is_resolved) WHERE is_resolved = false DO NOTHING;
  END IF;
END;
$$;

-- Function to get product stock across branches
CREATE OR REPLACE FUNCTION public.get_product_stock(p_product_id UUID)
RETURNS TABLE(
  branch_id UUID,
  branch_name TEXT,
  quantity INTEGER,
  reserved_quantity INTEGER,
  available_quantity INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    b.id as branch_id,
    b.name as branch_name,
    COALESCE(i.quantity, 0) as quantity,
    COALESCE(i.reserved_quantity, 0) as reserved_quantity,
    COALESCE(i.quantity, 0) - COALESCE(i.reserved_quantity, 0) as available_quantity
  FROM branches b
  LEFT JOIN inventory i ON i.branch_id = b.id AND i.product_id = p_product_id
  WHERE b.is_active = true
  ORDER BY b.name;
$$;

-- Enable RLS
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_categories
CREATE POLICY "Authenticated users can view categories"
  ON public.product_categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage categories"
  ON public.product_categories FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies for products
CREATE POLICY "Authenticated users can view products"
  ON public.products FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies for inventory
CREATE POLICY "Authenticated users can view inventory"
  ON public.inventory FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage inventory"
  ON public.inventory FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies for inventory_movements
CREATE POLICY "Authenticated users can view movements"
  ON public.inventory_movements FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create movements"
  ON public.inventory_movements FOR INSERT
  WITH CHECK (true);

-- RLS Policies for stock_alerts
CREATE POLICY "Authenticated users can view alerts"
  ON public.stock_alerts FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage alerts"
  ON public.stock_alerts FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add indexes for performance
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_sku ON public.products(sku);
CREATE INDEX idx_products_barcode ON public.products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_inventory_product_branch ON public.inventory(product_id, branch_id);
CREATE INDEX idx_inventory_movements_product ON public.inventory_movements(product_id);
CREATE INDEX idx_inventory_movements_branch ON public.inventory_movements(branch_id);
CREATE INDEX idx_inventory_movements_date ON public.inventory_movements(created_at DESC);
CREATE INDEX idx_stock_alerts_unresolved ON public.stock_alerts(product_id, branch_id) WHERE is_resolved = false;

-- Add triggers for updated_at
CREATE TRIGGER update_product_categories_updated_at
  BEFORE UPDATE ON public.product_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for inventory and alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_alerts;

-- Insert default categories
INSERT INTO public.product_categories (name, description) VALUES
  ('Armazones', 'Monturas y armazones para lentes'),
  ('Lentes Oftálmicos', 'Lentes con graduación'),
  ('Lentes de Contacto', 'Lentes de contacto blandos y rígidos'),
  ('Lentes de Sol', 'Gafas de sol con o sin graduación'),
  ('Accesorios', 'Estuches, paños, soluciones y accesorios'),
  ('Servicios', 'Servicios de optometría y ajustes');
