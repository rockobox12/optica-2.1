-- =============================================
-- LOYALTY & MARKETING MODULE
-- =============================================

-- Loyalty Program Configuration
CREATE TABLE public.loyalty_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Programa de Lealtad',
  description TEXT,
  points_per_peso NUMERIC(5,2) DEFAULT 1, -- Points earned per peso spent
  peso_per_point NUMERIC(5,2) DEFAULT 0.10, -- Value of each point in pesos
  min_redemption_points INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Membership Tiers
CREATE TABLE public.loyalty_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID REFERENCES public.loyalty_programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  min_points INTEGER NOT NULL DEFAULT 0,
  max_points INTEGER,
  multiplier NUMERIC(3,2) DEFAULT 1.0, -- Points multiplier for this tier
  benefits JSONB DEFAULT '[]',
  color TEXT DEFAULT '#6b7280',
  icon TEXT DEFAULT 'star',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Customer Loyalty Enrollment
CREATE TABLE public.customer_loyalty (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.loyalty_programs(id) ON DELETE CASCADE,
  tier_id UUID REFERENCES public.loyalty_tiers(id),
  current_points INTEGER DEFAULT 0,
  lifetime_points INTEGER DEFAULT 0,
  wallet_balance NUMERIC(10,2) DEFAULT 0,
  enrollment_date DATE DEFAULT CURRENT_DATE,
  last_activity_date DATE,
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES public.customer_loyalty(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(patient_id, program_id)
);

-- Points/Wallet Transactions
CREATE TABLE public.loyalty_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_loyalty_id UUID NOT NULL REFERENCES public.customer_loyalty(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL, -- 'earn', 'redeem', 'expire', 'adjust', 'wallet_deposit', 'wallet_withdraw'
  points INTEGER DEFAULT 0,
  wallet_amount NUMERIC(10,2) DEFAULT 0,
  description TEXT,
  reference_type TEXT, -- 'sale', 'referral', 'birthday', 'promotion', 'manual'
  reference_id UUID,
  sale_amount NUMERIC(10,2),
  multiplier_applied NUMERIC(3,2) DEFAULT 1.0,
  balance_after INTEGER,
  wallet_balance_after NUMERIC(10,2),
  created_by UUID,
  expires_at DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Marketing Campaigns
CREATE TABLE public.marketing_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT NOT NULL, -- 'email', 'sms', 'whatsapp', 'push', 'multi'
  status TEXT DEFAULT 'draft', -- 'draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'
  target_audience JSONB DEFAULT '{}', -- Filters for targeting
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  converted_count INTEGER DEFAULT 0,
  branch_id UUID REFERENCES public.branches(id),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Campaign Messages/Templates
CREATE TABLE public.campaign_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  channel TEXT NOT NULL, -- 'email', 'sms', 'whatsapp'
  subject TEXT,
  content TEXT NOT NULL,
  template_variables JSONB DEFAULT '[]',
  media_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Campaign Recipients
CREATE TABLE public.campaign_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  recipient_address TEXT NOT NULL, -- email, phone number
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'
  sent_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Automatic Message Rules
CREATE TABLE public.automated_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL, -- 'birthday', 'anniversary', 'post_purchase', 'appointment_reminder', 'prescription_expiry', 'inactive_customer'
  trigger_config JSONB DEFAULT '{}', -- Specific config for the trigger
  channels TEXT[] DEFAULT ARRAY['whatsapp'],
  message_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  send_time TIME DEFAULT '09:00',
  days_offset INTEGER DEFAULT 0, -- Days before/after trigger
  branch_id UUID REFERENCES public.branches(id),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Automated Message Log
CREATE TABLE public.automated_message_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  automated_message_id UUID REFERENCES public.automated_messages(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  message_content TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_loyalty ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automated_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automated_message_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view loyalty programs" ON public.loyalty_programs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage loyalty programs" ON public.loyalty_programs
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view loyalty tiers" ON public.loyalty_tiers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage loyalty tiers" ON public.loyalty_tiers
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view customer loyalty" ON public.customer_loyalty
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage customer loyalty" ON public.customer_loyalty
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can view loyalty transactions" ON public.loyalty_transactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create loyalty transactions" ON public.loyalty_transactions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can view marketing campaigns" ON public.marketing_campaigns
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage marketing campaigns" ON public.marketing_campaigns
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can view campaign messages" ON public.campaign_messages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage campaign messages" ON public.campaign_messages
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can view campaign recipients" ON public.campaign_recipients
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage campaign recipients" ON public.campaign_recipients
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can view automated messages" ON public.automated_messages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage automated messages" ON public.automated_messages
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view message log" ON public.automated_message_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert message log" ON public.automated_message_log
  FOR INSERT TO authenticated WITH CHECK (true);

-- Function to earn points from a sale
CREATE OR REPLACE FUNCTION public.earn_loyalty_points(
  p_patient_id UUID,
  p_sale_id UUID,
  p_sale_amount NUMERIC
) RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_customer_loyalty RECORD;
  v_program RECORD;
  v_tier RECORD;
  v_points_earned INTEGER;
  v_multiplier NUMERIC;
  v_new_balance INTEGER;
BEGIN
  -- Get customer loyalty record
  SELECT cl.*, p.points_per_peso, lt.multiplier as tier_multiplier
  INTO v_customer_loyalty
  FROM customer_loyalty cl
  JOIN loyalty_programs p ON p.id = cl.program_id
  LEFT JOIN loyalty_tiers lt ON lt.id = cl.tier_id
  WHERE cl.patient_id = p_patient_id AND cl.is_active = true
  LIMIT 1;
  
  IF v_customer_loyalty IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calculate points
  v_multiplier := COALESCE(v_customer_loyalty.tier_multiplier, 1.0);
  v_points_earned := FLOOR(p_sale_amount * v_customer_loyalty.points_per_peso * v_multiplier);
  v_new_balance := v_customer_loyalty.current_points + v_points_earned;
  
  -- Update customer loyalty
  UPDATE customer_loyalty
  SET current_points = v_new_balance,
      lifetime_points = lifetime_points + v_points_earned,
      last_activity_date = CURRENT_DATE,
      updated_at = now()
  WHERE id = v_customer_loyalty.id;
  
  -- Log transaction
  INSERT INTO loyalty_transactions (
    customer_loyalty_id, transaction_type, points, description,
    reference_type, reference_id, sale_amount, multiplier_applied, balance_after
  ) VALUES (
    v_customer_loyalty.id, 'earn', v_points_earned, 
    'Puntos por compra',
    'sale', p_sale_id, p_sale_amount, v_multiplier, v_new_balance
  );
  
  -- Check for tier upgrade
  PERFORM update_customer_tier(v_customer_loyalty.id);
  
  RETURN v_points_earned;
END;
$$;

-- Function to redeem points
CREATE OR REPLACE FUNCTION public.redeem_loyalty_points(
  p_customer_loyalty_id UUID,
  p_points INTEGER,
  p_description TEXT DEFAULT 'Canje de puntos'
) RETURNS NUMERIC
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_customer RECORD;
  v_program RECORD;
  v_value NUMERIC;
  v_new_balance INTEGER;
BEGIN
  SELECT cl.*, lp.peso_per_point, lp.min_redemption_points
  INTO v_customer
  FROM customer_loyalty cl
  JOIN loyalty_programs lp ON lp.id = cl.program_id
  WHERE cl.id = p_customer_loyalty_id;
  
  IF v_customer.current_points < p_points THEN
    RAISE EXCEPTION 'Puntos insuficientes. Disponible: %, Solicitado: %', v_customer.current_points, p_points;
  END IF;
  
  IF p_points < v_customer.min_redemption_points THEN
    RAISE EXCEPTION 'Mínimo de puntos para canje: %', v_customer.min_redemption_points;
  END IF;
  
  v_value := p_points * v_customer.peso_per_point;
  v_new_balance := v_customer.current_points - p_points;
  
  UPDATE customer_loyalty
  SET current_points = v_new_balance,
      last_activity_date = CURRENT_DATE,
      updated_at = now()
  WHERE id = p_customer_loyalty_id;
  
  INSERT INTO loyalty_transactions (
    customer_loyalty_id, transaction_type, points, wallet_amount,
    description, balance_after
  ) VALUES (
    p_customer_loyalty_id, 'redeem', -p_points, v_value,
    p_description, v_new_balance
  );
  
  RETURN v_value;
END;
$$;

-- Function to update customer tier based on lifetime points
CREATE OR REPLACE FUNCTION public.update_customer_tier(p_customer_loyalty_id UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_customer RECORD;
  v_new_tier_id UUID;
BEGIN
  SELECT * INTO v_customer FROM customer_loyalty WHERE id = p_customer_loyalty_id;
  
  SELECT id INTO v_new_tier_id
  FROM loyalty_tiers
  WHERE program_id = v_customer.program_id
    AND min_points <= v_customer.lifetime_points
    AND (max_points IS NULL OR max_points >= v_customer.lifetime_points)
  ORDER BY min_points DESC
  LIMIT 1;
  
  IF v_new_tier_id IS DISTINCT FROM v_customer.tier_id THEN
    UPDATE customer_loyalty SET tier_id = v_new_tier_id, updated_at = now()
    WHERE id = p_customer_loyalty_id;
  END IF;
  
  RETURN v_new_tier_id;
END;
$$;

-- Function to generate referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'OI-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
END;
$$;

-- Insert default loyalty program
INSERT INTO public.loyalty_programs (name, description, points_per_peso, peso_per_point, min_redemption_points)
VALUES ('Óptica Istmeña Rewards', 'Programa de lealtad para clientes frecuentes', 1, 0.10, 100);

-- Insert default tiers
INSERT INTO public.loyalty_tiers (program_id, name, min_points, max_points, multiplier, benefits, color, icon, sort_order)
SELECT 
  id,
  'Bronce',
  0,
  999,
  1.0,
  '["1 punto por cada peso", "Ofertas exclusivas"]',
  '#cd7f32',
  'award',
  1
FROM public.loyalty_programs LIMIT 1;

INSERT INTO public.loyalty_tiers (program_id, name, min_points, max_points, multiplier, benefits, color, icon, sort_order)
SELECT 
  id,
  'Plata',
  1000,
  4999,
  1.25,
  '["1.25x puntos", "Descuento 5% en lentes", "Limpieza gratis"]',
  '#c0c0c0',
  'medal',
  2
FROM public.loyalty_programs LIMIT 1;

INSERT INTO public.loyalty_tiers (program_id, name, min_points, max_points, multiplier, benefits, color, icon, sort_order)
SELECT 
  id,
  'Oro',
  5000,
  14999,
  1.5,
  '["1.5x puntos", "Descuento 10% en todo", "Examen visual gratis", "Prioridad en citas"]',
  '#ffd700',
  'crown',
  3
FROM public.loyalty_programs LIMIT 1;

INSERT INTO public.loyalty_tiers (program_id, name, min_points, multiplier, benefits, color, icon, sort_order)
SELECT 
  id,
  'Platino',
  15000,
  2.0,
  '["2x puntos", "Descuento 15% en todo", "Servicios VIP", "Eventos exclusivos", "Garantía extendida"]',
  '#e5e4e2',
  'gem',
  4
FROM public.loyalty_programs LIMIT 1;

-- Insert default automated messages
INSERT INTO public.automated_messages (name, trigger_type, channels, message_template, days_offset, is_active)
VALUES 
  ('Felicitación de Cumpleaños', 'birthday', ARRAY['whatsapp'], '🎂 ¡Feliz Cumpleaños {{nombre}}! 🎉\n\nEn Óptica Istmeña queremos celebrar contigo. Por tu día especial, tienes un 15% de descuento en tu próxima compra.\n\n¡Te esperamos! 👓', 0, true),
  ('Recordatorio de Cita', 'appointment_reminder', ARRAY['whatsapp'], '📅 Hola {{nombre}}, te recordamos tu cita mañana a las {{hora}} en {{sucursal}}.\n\nSi necesitas reagendar, responde a este mensaje.\n\n¡Te esperamos!', -1, true),
  ('Post-Compra', 'post_purchase', ARRAY['whatsapp'], '✨ Gracias por tu compra {{nombre}}!\n\nHas ganado {{puntos}} puntos en tu cuenta de lealtad.\n\n¿Tienes dudas sobre tus lentes? Estamos para ayudarte. 👓', 1, true),
  ('Cliente Inactivo', 'inactive_customer', ARRAY['whatsapp'], '👋 ¡Hola {{nombre}}! Te extrañamos en Óptica Istmeña.\n\nHa pasado tiempo desde tu última visita. ¿Sabías que es recomendable revisar tu graduación cada año?\n\n📞 Agenda tu cita hoy y recibe 10% de descuento.', 180, true);