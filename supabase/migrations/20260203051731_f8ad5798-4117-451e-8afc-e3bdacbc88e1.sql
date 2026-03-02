
-- Create suppliers table
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  legal_name TEXT,
  rfc TEXT,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'México',
  payment_terms INTEGER DEFAULT 30,
  credit_limit DECIMAL(12,2),
  bank_name TEXT,
  bank_account TEXT,
  clabe TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create supplier products (catalog per supplier)
CREATE TABLE public.supplier_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  supplier_sku TEXT,
  supplier_price DECIMAL(10,2) NOT NULL,
  min_order_quantity INTEGER DEFAULT 1,
  lead_time_days INTEGER DEFAULT 7,
  is_preferred BOOLEAN DEFAULT false,
  last_purchase_date DATE,
  last_purchase_price DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(supplier_id, product_id)
);

-- Create purchase orders table
CREATE TABLE public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  branch_id UUID REFERENCES public.branches(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'ordered', 'partial', 'received', 'cancelled')),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date DATE,
  received_date DATE,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 16,
  tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
  payment_due_date DATE,
  notes TEXT,
  internal_notes TEXT,
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  is_auto_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create purchase order items
CREATE TABLE public.purchase_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity_ordered INTEGER NOT NULL,
  quantity_received INTEGER NOT NULL DEFAULT 0,
  unit_cost DECIMAL(10,2) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create purchase receptions (for partial/complete receiving)
CREATE TABLE public.purchase_receptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  reception_number TEXT NOT NULL,
  reception_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  received_by UUID,
  branch_id UUID REFERENCES public.branches(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reception items (with quality control)
CREATE TABLE public.purchase_reception_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reception_id UUID NOT NULL REFERENCES public.purchase_receptions(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.purchase_order_items(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity_received INTEGER NOT NULL,
  quantity_accepted INTEGER NOT NULL,
  quantity_rejected INTEGER NOT NULL DEFAULT 0,
  rejection_reason TEXT,
  quality_status TEXT DEFAULT 'pending' CHECK (quality_status IN ('pending', 'approved', 'rejected', 'partial')),
  quality_notes TEXT,
  inspected_by UUID,
  inspected_at TIMESTAMP WITH TIME ZONE,
  lot_number TEXT,
  expiry_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sequence for PO numbers
CREATE SEQUENCE IF NOT EXISTS purchase_order_seq START 1;

-- Create sequence for reception numbers
CREATE SEQUENCE IF NOT EXISTS reception_seq START 1;

-- Function to generate PO number
CREATE OR REPLACE FUNCTION public.generate_po_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'OC-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || LPAD(nextval('purchase_order_seq')::TEXT, 5, '0');
END;
$$;

-- Function to generate reception number
CREATE OR REPLACE FUNCTION public.generate_reception_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'REC-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || LPAD(nextval('reception_seq')::TEXT, 5, '0');
END;
$$;

-- Function to update PO totals
CREATE OR REPLACE FUNCTION public.update_po_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subtotal DECIMAL(12,2);
  v_tax_rate DECIMAL(5,2);
  v_shipping DECIMAL(10,2);
  v_discount DECIMAL(12,2);
BEGIN
  SELECT COALESCE(SUM(subtotal), 0) INTO v_subtotal
  FROM purchase_order_items WHERE purchase_order_id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);
  
  SELECT tax_rate, shipping_cost, discount_amount INTO v_tax_rate, v_shipping, v_discount
  FROM purchase_orders WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);
  
  UPDATE purchase_orders SET
    subtotal = v_subtotal,
    tax_amount = (v_subtotal - COALESCE(v_discount, 0)) * (COALESCE(v_tax_rate, 16) / 100),
    total = v_subtotal - COALESCE(v_discount, 0) + ((v_subtotal - COALESCE(v_discount, 0)) * (COALESCE(v_tax_rate, 16) / 100)) + COALESCE(v_shipping, 0),
    updated_at = now()
  WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);
  
  RETURN NEW;
END;
$$;

-- Function to process reception and update inventory
CREATE OR REPLACE FUNCTION public.process_reception_item(
  p_reception_item_id UUID,
  p_branch_id UUID,
  p_received_by UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_order_item RECORD;
BEGIN
  -- Get reception item details
  SELECT * INTO v_item FROM purchase_reception_items WHERE id = p_reception_item_id;
  SELECT * INTO v_order_item FROM purchase_order_items WHERE id = v_item.order_item_id;
  
  -- Only update inventory for accepted items
  IF v_item.quantity_accepted > 0 THEN
    PERFORM update_inventory(
      v_item.product_id,
      p_branch_id,
      v_item.quantity_accepted,
      'entrada',
      'Recepción de compra',
      'purchase_reception',
      p_reception_item_id,
      v_order_item.unit_cost,
      p_received_by,
      NULL
    );
  END IF;
  
  -- Update order item received quantity
  UPDATE purchase_order_items
  SET quantity_received = quantity_received + v_item.quantity_received
  WHERE id = v_item.order_item_id;
  
  -- Update order status based on all items
  UPDATE purchase_orders po
  SET status = CASE
    WHEN (SELECT SUM(quantity_received) FROM purchase_order_items WHERE purchase_order_id = po.id) = 0 THEN po.status
    WHEN (SELECT SUM(quantity_received) FROM purchase_order_items WHERE purchase_order_id = po.id) >= 
         (SELECT SUM(quantity_ordered) FROM purchase_order_items WHERE purchase_order_id = po.id) THEN 'received'
    ELSE 'partial'
  END,
  received_date = CASE 
    WHEN (SELECT SUM(quantity_received) FROM purchase_order_items WHERE purchase_order_id = po.id) >= 
         (SELECT SUM(quantity_ordered) FROM purchase_order_items WHERE purchase_order_id = po.id) THEN CURRENT_DATE
    ELSE received_date
  END,
  updated_at = now()
  WHERE id = (SELECT purchase_order_id FROM purchase_order_items WHERE id = v_item.order_item_id);
END;
$$;

-- Function to generate automatic PO from stock alerts
CREATE OR REPLACE FUNCTION public.generate_auto_purchase_order(
  p_branch_id UUID,
  p_created_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alert RECORD;
  v_supplier_product RECORD;
  v_po_id UUID;
  v_current_supplier_id UUID;
  v_order_number TEXT;
BEGIN
  -- Group alerts by preferred supplier
  FOR v_alert IN
    SELECT sa.product_id, p.name as product_name, p.reorder_point, 
           COALESCE(i.quantity, 0) as current_stock,
           (p.reorder_point * 2) - COALESCE(i.quantity, 0) as suggested_qty
    FROM stock_alerts sa
    JOIN products p ON p.id = sa.product_id
    LEFT JOIN inventory i ON i.product_id = sa.product_id AND i.branch_id = p_branch_id
    WHERE sa.branch_id = p_branch_id
      AND sa.is_resolved = false
      AND sa.alert_type IN ('out_of_stock', 'low_stock')
  LOOP
    -- Find preferred supplier for this product
    SELECT sp.* INTO v_supplier_product
    FROM supplier_products sp
    WHERE sp.product_id = v_alert.product_id
      AND sp.is_preferred = true
    ORDER BY sp.supplier_price ASC
    LIMIT 1;
    
    IF v_supplier_product IS NULL THEN
      -- Get any supplier for this product
      SELECT sp.* INTO v_supplier_product
      FROM supplier_products sp
      WHERE sp.product_id = v_alert.product_id
      ORDER BY sp.supplier_price ASC
      LIMIT 1;
    END IF;
    
    IF v_supplier_product IS NOT NULL THEN
      -- Check if we need to create a new PO for this supplier
      IF v_current_supplier_id IS NULL OR v_current_supplier_id != v_supplier_product.supplier_id THEN
        -- Create new PO
        v_order_number := generate_po_number();
        INSERT INTO purchase_orders (
          order_number, supplier_id, branch_id, status, 
          expected_date, created_by, is_auto_generated
        )
        VALUES (
          v_order_number, v_supplier_product.supplier_id, p_branch_id, 'draft',
          CURRENT_DATE + COALESCE(v_supplier_product.lead_time_days, 7),
          p_created_by, true
        )
        RETURNING id INTO v_po_id;
        
        v_current_supplier_id := v_supplier_product.supplier_id;
      END IF;
      
      -- Add item to PO
      INSERT INTO purchase_order_items (
        purchase_order_id, product_id, quantity_ordered, 
        unit_cost, subtotal
      )
      VALUES (
        v_po_id, v_alert.product_id, 
        GREATEST(v_alert.suggested_qty, COALESCE(v_supplier_product.min_order_quantity, 1)),
        v_supplier_product.supplier_price,
        v_supplier_product.supplier_price * GREATEST(v_alert.suggested_qty, COALESCE(v_supplier_product.min_order_quantity, 1))
      );
    END IF;
  END LOOP;
  
  RETURN v_po_id;
END;
$$;

-- Enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_receptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_reception_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view suppliers"
  ON public.suppliers FOR SELECT USING (true);

CREATE POLICY "Admins can manage suppliers"
  ON public.suppliers FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view supplier products"
  ON public.supplier_products FOR SELECT USING (true);

CREATE POLICY "Admins can manage supplier products"
  ON public.supplier_products FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view purchase orders"
  ON public.purchase_orders FOR SELECT USING (true);

CREATE POLICY "Admins can manage purchase orders"
  ON public.purchase_orders FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view PO items"
  ON public.purchase_order_items FOR SELECT USING (true);

CREATE POLICY "Admins can manage PO items"
  ON public.purchase_order_items FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view receptions"
  ON public.purchase_receptions FOR SELECT USING (true);

CREATE POLICY "Admins can manage receptions"
  ON public.purchase_receptions FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view reception items"
  ON public.purchase_reception_items FOR SELECT USING (true);

CREATE POLICY "Admins can manage reception items"
  ON public.purchase_reception_items FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Indexes
CREATE INDEX idx_suppliers_code ON public.suppliers(code);
CREATE INDEX idx_supplier_products_supplier ON public.supplier_products(supplier_id);
CREATE INDEX idx_supplier_products_product ON public.supplier_products(product_id);
CREATE INDEX idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX idx_purchase_orders_date ON public.purchase_orders(order_date DESC);
CREATE INDEX idx_po_items_order ON public.purchase_order_items(purchase_order_id);
CREATE INDEX idx_receptions_order ON public.purchase_receptions(purchase_order_id);

-- Triggers
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_supplier_products_updated_at
  BEFORE UPDATE ON public.supplier_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_po_totals_on_item_change
  AFTER INSERT OR UPDATE OR DELETE ON public.purchase_order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_po_totals();

-- Create sequence for supplier codes
CREATE SEQUENCE IF NOT EXISTS supplier_code_seq START 1;

-- Function to generate supplier code
CREATE OR REPLACE FUNCTION public.generate_supplier_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'PROV-' || LPAD(nextval('supplier_code_seq')::TEXT, 4, '0');
END;
$$;
