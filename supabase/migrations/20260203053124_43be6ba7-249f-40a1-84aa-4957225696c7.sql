-- Create lab_orders table for tracking laboratory orders
CREATE TABLE public.lab_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  prescription_id UUID REFERENCES public.patient_prescriptions(id),
  sale_id UUID REFERENCES public.sales(id),
  branch_id UUID REFERENCES public.branches(id),
  
  -- Order details
  laboratory_name TEXT,
  order_type TEXT NOT NULL DEFAULT 'lenses', -- lenses, contact_lenses, repairs
  priority TEXT NOT NULL DEFAULT 'normal', -- urgent, normal, low
  
  -- Lens specifications
  od_sphere NUMERIC(5,2),
  od_cylinder NUMERIC(5,2),
  od_axis INTEGER,
  od_add NUMERIC(4,2),
  od_prism NUMERIC(4,2),
  od_prism_base TEXT,
  oi_sphere NUMERIC(5,2),
  oi_cylinder NUMERIC(5,2),
  oi_axis INTEGER,
  oi_add NUMERIC(4,2),
  oi_prism NUMERIC(4,2),
  oi_prism_base TEXT,
  
  -- Lens details
  lens_type TEXT, -- monofocal, bifocal, progressive
  lens_material TEXT, -- CR39, policarbonato, alto_indice
  lens_treatment TEXT, -- antireflejo, fotocromático, blue_cut
  lens_color TEXT,
  
  -- Frame info
  frame_brand TEXT,
  frame_model TEXT,
  frame_color TEXT,
  frame_size TEXT,
  
  -- Pupillary distances
  pd_right NUMERIC(4,1),
  pd_left NUMERIC(4,1),
  pd_total NUMERIC(4,1),
  fitting_height NUMERIC(4,1),
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, in_production, quality_check, ready, delivered, cancelled
  estimated_delivery_date DATE,
  actual_delivery_date DATE,
  
  -- Costs
  laboratory_cost NUMERIC(10,2) DEFAULT 0,
  
  -- Notes
  special_instructions TEXT,
  internal_notes TEXT,
  
  -- Notification tracking
  whatsapp_notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMPTZ,
  patient_phone TEXT,
  
  -- Audit
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create lab_order_status_history table
CREATE TABLE public.lab_order_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lab_order_id UUID NOT NULL REFERENCES public.lab_orders(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  notes TEXT,
  changed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lab_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_order_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lab_orders
CREATE POLICY "Authenticated users can view lab orders"
  ON public.lab_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create lab orders"
  ON public.lab_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update lab orders"
  ON public.lab_orders FOR UPDATE
  TO authenticated
  USING (true);

-- RLS Policies for status history
CREATE POLICY "Authenticated users can view status history"
  ON public.lab_order_status_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create status history"
  ON public.lab_order_status_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_lab_orders_patient ON public.lab_orders(patient_id);
CREATE INDEX idx_lab_orders_status ON public.lab_orders(status);
CREATE INDEX idx_lab_orders_order_number ON public.lab_orders(order_number);
CREATE INDEX idx_lab_orders_created_at ON public.lab_orders(created_at DESC);
CREATE INDEX idx_lab_order_history_order ON public.lab_order_status_history(lab_order_id);

-- Trigger for updated_at
CREATE TRIGGER update_lab_orders_updated_at
  BEFORE UPDATE ON public.lab_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate order number
CREATE OR REPLACE FUNCTION public.generate_lab_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_sequence INTEGER;
  v_order_number TEXT;
BEGIN
  v_year := to_char(now(), 'YY');
  
  SELECT COALESCE(MAX(
    NULLIF(regexp_replace(order_number, '^LAB-' || v_year || '-', ''), '')::INTEGER
  ), 0) + 1
  INTO v_sequence
  FROM lab_orders
  WHERE order_number LIKE 'LAB-' || v_year || '-%';
  
  v_order_number := 'LAB-' || v_year || '-' || LPAD(v_sequence::TEXT, 5, '0');
  
  RETURN v_order_number;
END;
$$;

-- Function to log status changes
CREATE OR REPLACE FUNCTION public.log_lab_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO lab_order_status_history (lab_order_id, previous_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_lab_order_status_trigger
  AFTER UPDATE ON public.lab_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.log_lab_order_status_change();