-- Fix create_payment_plan: proper rounding with last-installment adjustment
-- so that sum(installments) === financed amount exactly.
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
  v_financed_amount NUMERIC;
  v_base_installment NUMERIC;
  v_last_installment NUMERIC;
  v_interval_days INTEGER;
  v_current_date DATE;
  v_amount NUMERIC;
  i INTEGER;
BEGIN
  -- Calculate financed amount: total - down payment (+ optional interest)
  v_financed_amount := p_total_amount - p_down_payment;
  IF p_interest_rate > 0 THEN
    v_financed_amount := v_financed_amount * (1 + p_interest_rate / 100);
  END IF;
  v_financed_amount := ROUND(v_financed_amount, 2);

  -- Base installment rounded DOWN so we don't over-charge
  v_base_installment := TRUNC(v_financed_amount / p_number_of_installments, 2);

  -- Last installment absorbs the remainder so sum === financed amount
  v_last_installment := ROUND(v_financed_amount - (v_base_installment * (p_number_of_installments - 1)), 2);

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
    p_sale_id, p_patient_id, p_plan_type, v_financed_amount, p_down_payment,
    p_number_of_installments, v_base_installment, p_interest_rate,
    p_start_date, p_created_by
  ) RETURNING id INTO v_plan_id;

  v_current_date := p_start_date;
  FOR i IN 1..p_number_of_installments LOOP
    v_current_date := v_current_date + (v_interval_days * INTERVAL '1 day');
    
    -- Last installment gets adjusted amount
    IF i = p_number_of_installments THEN
      v_amount := v_last_installment;
    ELSE
      v_amount := v_base_installment;
    END IF;

    INSERT INTO payment_plan_installments (
      payment_plan_id, installment_number, due_date, amount
    ) VALUES (
      v_plan_id, i, v_current_date, v_amount
    );
  END LOOP;

  RETURN v_plan_id;
END;
$$;