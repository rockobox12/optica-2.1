
-- Function to calculate credit score
CREATE OR REPLACE FUNCTION public.calculate_credit_score(p_patient_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_score INTEGER := 500;
  v_on_time INTEGER := 0;
  v_late INTEGER := 0;
  v_defaults INTEGER := 0;
  v_total_sales NUMERIC := 0;
  v_final_score INTEGER;
  v_risk_level TEXT;
  v_credit_limit NUMERIC;
BEGIN
  -- Count on-time payments
  SELECT COUNT(*) INTO v_on_time
  FROM credit_payments cp
  JOIN sales s ON cp.sale_id = s.id
  WHERE s.patient_id = p_patient_id
    AND s.status = 'completed';

  -- Count late payments
  SELECT COUNT(*) INTO v_late
  FROM payment_plan_installments ppi
  JOIN payment_plans pp ON ppi.payment_plan_id = pp.id
  WHERE pp.patient_id = p_patient_id
    AND ppi.status = 'paid'
    AND ppi.paid_at > (ppi.due_date + INTERVAL '1 day');

  -- Count defaults (overdue > 90 days)
  SELECT COUNT(*) INTO v_defaults
  FROM payment_plan_installments ppi
  JOIN payment_plans pp ON ppi.payment_plan_id = pp.id
  WHERE pp.patient_id = p_patient_id
    AND ppi.status = 'overdue'
    AND ppi.days_overdue > 90;

  -- Get total credit history
  SELECT COALESCE(SUM(total), 0) INTO v_total_sales
  FROM sales
  WHERE patient_id = p_patient_id AND is_credit = true;

  -- Calculate score
  v_final_score := v_base_score;
  v_final_score := v_final_score + (v_on_time * 15);
  v_final_score := v_final_score - (v_late * 25);
  v_final_score := v_final_score - (v_defaults * 100);

  IF v_total_sales > 10000 THEN
    v_final_score := v_final_score + 50;
  ELSIF v_total_sales > 5000 THEN
    v_final_score := v_final_score + 25;
  END IF;

  v_final_score := GREATEST(0, LEAST(1000, v_final_score));

  IF v_final_score >= 800 THEN
    v_risk_level := 'low';
    v_credit_limit := 20000;
  ELSIF v_final_score >= 600 THEN
    v_risk_level := 'medium';
    v_credit_limit := 10000;
  ELSIF v_final_score >= 400 THEN
    v_risk_level := 'high';
    v_credit_limit := 5000;
  ELSE
    v_risk_level := 'very_high';
    v_credit_limit := 0;
  END IF;

  INSERT INTO customer_credit_scores (
    patient_id, score, risk_level, credit_limit, available_credit,
    on_time_payments, late_payments, defaults, last_calculated_at
  ) VALUES (
    p_patient_id, v_final_score, v_risk_level, v_credit_limit, v_credit_limit,
    v_on_time, v_late, v_defaults, now()
  )
  ON CONFLICT (patient_id) DO UPDATE SET
    score = v_final_score,
    risk_level = v_risk_level,
    credit_limit = v_credit_limit,
    on_time_payments = v_on_time,
    late_payments = v_late,
    defaults = v_defaults,
    last_calculated_at = now(),
    updated_at = now();

  RETURN v_final_score;
END;
$$;

-- Function to create payment plan with installments
CREATE OR REPLACE FUNCTION public.create_payment_plan(
  p_sale_id UUID,
  p_patient_id UUID,
  p_plan_type TEXT,
  p_total_amount NUMERIC,
  p_down_payment NUMERIC,
  p_number_of_installments INTEGER,
  p_interest_rate NUMERIC DEFAULT 0,
  p_start_date DATE DEFAULT CURRENT_DATE,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id UUID;
  v_remaining_amount NUMERIC;
  v_installment_amount NUMERIC;
  v_interval_days INTEGER;
  v_current_date DATE;
  i INTEGER;
BEGIN
  v_remaining_amount := p_total_amount - p_down_payment;
  v_remaining_amount := v_remaining_amount * (1 + p_interest_rate / 100);
  v_installment_amount := ROUND(v_remaining_amount / p_number_of_installments, 2);

  v_interval_days := CASE p_plan_type
    WHEN 'weekly' THEN 7
    WHEN 'biweekly' THEN 14
    WHEN 'monthly' THEN 30
    ELSE 7
  END;

  INSERT INTO payment_plans (
    sale_id, patient_id, plan_type, total_amount, down_payment,
    number_of_installments, installment_amount, interest_rate,
    start_date, created_by
  ) VALUES (
    p_sale_id, p_patient_id, p_plan_type, p_total_amount, p_down_payment,
    p_number_of_installments, v_installment_amount, p_interest_rate,
    p_start_date, p_created_by
  ) RETURNING id INTO v_plan_id;

  v_current_date := p_start_date;
  FOR i IN 1..p_number_of_installments LOOP
    v_current_date := v_current_date + (v_interval_days * INTERVAL '1 day');
    
    INSERT INTO payment_plan_installments (
      payment_plan_id, installment_number, due_date, amount
    ) VALUES (
      v_plan_id, i, v_current_date, v_installment_amount
    );
  END LOOP;

  RETURN v_plan_id;
END;
$$;

-- Function to update overdue installments
CREATE OR REPLACE FUNCTION public.update_overdue_installments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE payment_plan_installments
  SET 
    status = 'overdue',
    days_overdue = CURRENT_DATE - due_date
  WHERE status IN ('pending', 'partial')
    AND due_date < CURRENT_DATE;
END;
$$;
