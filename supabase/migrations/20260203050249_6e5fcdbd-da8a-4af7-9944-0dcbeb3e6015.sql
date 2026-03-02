-- Create payment method enum
CREATE TYPE payment_method AS ENUM (
  'cash',           -- Efectivo
  'card',           -- Tarjeta
  'transfer',       -- Transferencia
  'check',          -- Cheque
  'credit'          -- Crédito (fiado)
);

-- Create sale status enum
CREATE TYPE sale_status AS ENUM (
  'pending',        -- Pendiente
  'completed',      -- Completada
  'cancelled',      -- Cancelada
  'refunded',       -- Reembolsada
  'partial'         -- Pago parcial
);

-- Create sales table
CREATE TABLE public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_number TEXT NOT NULL UNIQUE,
  patient_id UUID REFERENCES public.patients(id),
  prescription_id UUID REFERENCES public.patient_prescriptions(id),
  branch_id UUID REFERENCES public.branches(id),
  seller_id UUID NOT NULL,
  
  -- Customer info (for walk-in customers)
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  
  -- Amounts
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Status and type
  status sale_status NOT NULL DEFAULT 'pending',
  is_credit BOOLEAN NOT NULL DEFAULT false,
  credit_due_date DATE,
  
  -- Offline sync
  offline_id TEXT,
  synced_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sale items table
CREATE TABLE public.sale_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  
  -- Product info (can be free text for now until inventory is implemented)
  product_type TEXT NOT NULL, -- 'frame', 'lens', 'contact_lens', 'accessory', 'service', 'other'
  product_name TEXT NOT NULL,
  product_code TEXT,
  description TEXT,
  
  -- Prescription data if applicable
  prescription_data JSONB,
  
  -- Pricing
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE public.sale_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  payment_method payment_method NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  reference TEXT, -- For cards, transfers, checks
  received_by UUID,
  
  -- For credit payments
  is_initial_payment BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create credit payments tracking (for installments)
CREATE TABLE public.credit_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  payment_number INTEGER NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method payment_method NOT NULL,
  reference TEXT,
  received_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sequence for sale numbers
CREATE SEQUENCE IF NOT EXISTS sale_number_seq START 1;

-- Function to generate sale number
CREATE OR REPLACE FUNCTION generate_sale_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'VTA-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || LPAD(nextval('sale_number_seq')::TEXT, 6, '0');
END;
$$;

-- Function to update sale totals
CREATE OR REPLACE FUNCTION update_sale_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subtotal DECIMAL(10,2);
  v_paid DECIMAL(10,2);
BEGIN
  -- Calculate subtotal from items
  SELECT COALESCE(SUM(subtotal), 0) INTO v_subtotal
  FROM sale_items WHERE sale_id = COALESCE(NEW.sale_id, OLD.sale_id);
  
  -- Calculate amount paid
  SELECT COALESCE(SUM(amount), 0) INTO v_paid
  FROM sale_payments WHERE sale_id = COALESCE(NEW.sale_id, OLD.sale_id);
  
  -- Update sale
  UPDATE sales SET
    subtotal = v_subtotal,
    total = v_subtotal - discount_amount + tax_amount,
    amount_paid = v_paid,
    balance = (v_subtotal - discount_amount + tax_amount) - v_paid,
    status = CASE 
      WHEN v_paid >= (v_subtotal - discount_amount + tax_amount) THEN 'completed'::sale_status
      WHEN v_paid > 0 THEN 'partial'::sale_status
      ELSE status
    END,
    updated_at = now()
  WHERE id = COALESCE(NEW.sale_id, OLD.sale_id);
  
  RETURN NEW;
END;
$$;

-- Triggers for auto-updating totals
CREATE TRIGGER update_sale_totals_on_item
  AFTER INSERT OR UPDATE OR DELETE ON public.sale_items
  FOR EACH ROW
  EXECUTE FUNCTION update_sale_totals();

CREATE TRIGGER update_sale_totals_on_payment
  AFTER INSERT OR UPDATE OR DELETE ON public.sale_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_sale_totals();

-- Enable RLS
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view sales"
  ON public.sales FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create sales"
  ON public.sales FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update sales"
  ON public.sales FOR UPDATE USING (true);

CREATE POLICY "Only admins can delete sales"
  ON public.sales FOR DELETE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can manage sale items"
  ON public.sale_items FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage payments"
  ON public.sale_payments FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage credit payments"
  ON public.credit_payments FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_sales_date ON public.sales(created_at);
CREATE INDEX idx_sales_patient ON public.sales(patient_id);
CREATE INDEX idx_sales_status ON public.sales(status);
CREATE INDEX idx_sales_branch ON public.sales(branch_id);
CREATE INDEX idx_sales_offline ON public.sales(offline_id) WHERE offline_id IS NOT NULL;
CREATE INDEX idx_sale_items_sale ON public.sale_items(sale_id);
CREATE INDEX idx_sale_payments_sale ON public.sale_payments(sale_id);

-- Trigger for updated_at
CREATE TRIGGER update_sales_updated_at
  BEFORE UPDATE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();