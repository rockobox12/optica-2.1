
-- Customer credit scores table
CREATE TABLE IF NOT EXISTS public.customer_credit_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 500 CHECK (score >= 0 AND score <= 1000),
  risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'very_high')),
  credit_limit NUMERIC NOT NULL DEFAULT 0,
  available_credit NUMERIC NOT NULL DEFAULT 0,
  total_credit_used NUMERIC NOT NULL DEFAULT 0,
  on_time_payments INTEGER NOT NULL DEFAULT 0,
  late_payments INTEGER NOT NULL DEFAULT 0,
  defaults INTEGER NOT NULL DEFAULT 0,
  average_days_late NUMERIC DEFAULT 0,
  last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(patient_id)
);

-- Payment plans table
CREATE TABLE IF NOT EXISTS public.payment_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  plan_type TEXT NOT NULL DEFAULT 'weekly' CHECK (plan_type IN ('weekly', 'biweekly', 'monthly')),
  total_amount NUMERIC NOT NULL,
  down_payment NUMERIC NOT NULL DEFAULT 0,
  number_of_installments INTEGER NOT NULL,
  installment_amount NUMERIC NOT NULL,
  interest_rate NUMERIC DEFAULT 0,
  start_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'defaulted', 'cancelled')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Payment plan installments
CREATE TABLE IF NOT EXISTS public.payment_plan_installments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_plan_id UUID NOT NULL REFERENCES public.payment_plans(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'partial', 'overdue')),
  paid_at TIMESTAMP WITH TIME ZONE,
  days_overdue INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Collection assignments
CREATE TABLE IF NOT EXISTS public.collection_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id),
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  collector_id UUID NOT NULL REFERENCES auth.users(id),
  assigned_by UUID REFERENCES auth.users(id),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'collected', 'escalated', 'cancelled')),
  total_due NUMERIC NOT NULL,
  amount_collected NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Collection visits with geolocation
CREATE TABLE IF NOT EXISTS public.collection_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.collection_assignments(id) ON DELETE CASCADE,
  collector_id UUID NOT NULL REFERENCES auth.users(id),
  visit_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  latitude NUMERIC,
  longitude NUMERIC,
  address_visited TEXT,
  result TEXT NOT NULL CHECK (result IN ('payment_received', 'promise_to_pay', 'not_home', 'refused', 'rescheduled', 'other')),
  amount_collected NUMERIC DEFAULT 0,
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'transfer')),
  promise_date DATE,
  notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_credit_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_plan_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_visits ENABLE ROW LEVEL SECURITY;

-- RLS Policies - drop if exist first
DROP POLICY IF EXISTS "Authenticated users can view credit scores" ON public.customer_credit_scores;
DROP POLICY IF EXISTS "Admins can manage credit scores" ON public.customer_credit_scores;
CREATE POLICY "Authenticated users can view credit scores" ON public.customer_credit_scores FOR SELECT USING (true);
CREATE POLICY "Admins can manage credit scores" ON public.customer_credit_scores FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can view payment plans" ON public.payment_plans;
DROP POLICY IF EXISTS "Authenticated users can create payment plans" ON public.payment_plans;
DROP POLICY IF EXISTS "Admins can manage payment plans" ON public.payment_plans;
CREATE POLICY "Authenticated users can view payment plans" ON public.payment_plans FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create payment plans" ON public.payment_plans FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage payment plans" ON public.payment_plans FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can view installments" ON public.payment_plan_installments;
DROP POLICY IF EXISTS "Authenticated users can update installments" ON public.payment_plan_installments;
DROP POLICY IF EXISTS "Admins can manage installments" ON public.payment_plan_installments;
CREATE POLICY "Authenticated users can view installments" ON public.payment_plan_installments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can update installments" ON public.payment_plan_installments FOR UPDATE USING (true);
CREATE POLICY "Admins can manage installments" ON public.payment_plan_installments FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can view assignments" ON public.collection_assignments;
DROP POLICY IF EXISTS "Admins can manage assignments" ON public.collection_assignments;
DROP POLICY IF EXISTS "Collectors can update their assignments" ON public.collection_assignments;
CREATE POLICY "Authenticated users can view assignments" ON public.collection_assignments FOR SELECT USING (true);
CREATE POLICY "Admins can manage assignments" ON public.collection_assignments FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Collectors can update their assignments" ON public.collection_assignments FOR UPDATE USING (collector_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can view visits" ON public.collection_visits;
DROP POLICY IF EXISTS "Collectors can create visits" ON public.collection_visits;
DROP POLICY IF EXISTS "Admins can manage visits" ON public.collection_visits;
CREATE POLICY "Authenticated users can view visits" ON public.collection_visits FOR SELECT USING (true);
CREATE POLICY "Collectors can create visits" ON public.collection_visits FOR INSERT WITH CHECK (collector_id = auth.uid());
CREATE POLICY "Admins can manage visits" ON public.collection_visits FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_credit_scores_patient ON customer_credit_scores(patient_id);
CREATE INDEX IF NOT EXISTS idx_credit_scores_risk ON customer_credit_scores(risk_level);
CREATE INDEX IF NOT EXISTS idx_payment_plans_sale ON payment_plans(sale_id);
CREATE INDEX IF NOT EXISTS idx_payment_plans_patient ON payment_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_payment_plans_status ON payment_plans(status);
CREATE INDEX IF NOT EXISTS idx_installments_plan ON payment_plan_installments(payment_plan_id);
CREATE INDEX IF NOT EXISTS idx_installments_due_date ON payment_plan_installments(due_date);
CREATE INDEX IF NOT EXISTS idx_installments_status ON payment_plan_installments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_collector ON collection_assignments(collector_id);
CREATE INDEX IF NOT EXISTS idx_assignments_patient ON collection_assignments(patient_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON collection_assignments(status);
CREATE INDEX IF NOT EXISTS idx_coll_visits_assignment ON collection_visits(assignment_id);
CREATE INDEX IF NOT EXISTS idx_coll_visits_collector ON collection_visits(collector_id);
CREATE INDEX IF NOT EXISTS idx_coll_visits_date ON collection_visits(visit_date);
