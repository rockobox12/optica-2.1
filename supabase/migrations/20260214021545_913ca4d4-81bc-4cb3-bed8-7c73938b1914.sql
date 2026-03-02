
-- Add payment probability fields to patients
ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS payment_probability_score INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS payment_risk_level TEXT DEFAULT 'moderate';

-- Create index for quick risk-level queries
CREATE INDEX IF NOT EXISTS idx_patients_payment_risk ON public.patients (payment_risk_level) WHERE payment_risk_level IS NOT NULL;

-- DB function to calculate payment probability
CREATE OR REPLACE FUNCTION public.calculate_payment_probability(p_patient_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_score INTEGER := 50; -- base for new customers
  v_total_credits INTEGER := 0;
  v_completed_credits INTEGER := 0;
  v_completed_no_delay INTEGER := 0;
  v_active_moroso BOOLEAN := false;
  v_avg_days_overdue NUMERIC := 0;
  v_frequent_delays INTEGER := 0;
  v_risk_level TEXT;
BEGIN
  -- Count total credit sales
  SELECT COUNT(*) INTO v_total_credits
  FROM sales WHERE patient_id = p_patient_id AND is_credit = true;

  -- If no credit history, return base score
  IF v_total_credits = 0 THEN
    UPDATE patients SET payment_probability_score = 50, payment_risk_level = 'moderate'
    WHERE id = p_patient_id;
    RETURN jsonb_build_object('score', 50, 'risk_level', 'moderate', 'is_new', true);
  END IF;

  -- Start from 50 base
  v_score := 50;

  -- Count completed credits (balance = 0)
  SELECT COUNT(*) INTO v_completed_credits
  FROM sales WHERE patient_id = p_patient_id AND is_credit = true AND balance <= 0;

  -- Credits completed without any overdue installments
  SELECT COUNT(*) INTO v_completed_no_delay
  FROM sales s
  WHERE s.patient_id = p_patient_id AND s.is_credit = true AND s.balance <= 0
    AND NOT EXISTS (
      SELECT 1 FROM payment_plans pp
      JOIN payment_plan_installments ppi ON ppi.payment_plan_id = pp.id
      WHERE pp.sale_id = s.id AND ppi.days_overdue > 0
    );

  -- Factor 1: Completed without delay → +30
  IF v_completed_no_delay > 0 THEN
    v_score := v_score + 30;
  END IF;

  -- Factor 2: More than 3 credits paid → +20
  IF v_completed_credits > 3 THEN
    v_score := v_score + 20;
  END IF;

  -- Factor 3: Average days overdue across all installments
  SELECT COALESCE(AVG(ppi.days_overdue), 0)
  INTO v_avg_days_overdue
  FROM payment_plan_installments ppi
  JOIN payment_plans pp ON pp.id = ppi.payment_plan_id
  JOIN sales s ON s.id = pp.sale_id
  WHERE s.patient_id = p_patient_id AND ppi.days_overdue > 0;

  IF v_avg_days_overdue > 15 THEN
    v_score := v_score - 20;
  END IF;

  -- Factor 4: Frequent delays (more than 3 overdue installments)
  SELECT COUNT(*) INTO v_frequent_delays
  FROM payment_plan_installments ppi
  JOIN payment_plans pp ON pp.id = ppi.payment_plan_id
  JOIN sales s ON s.id = pp.sale_id
  WHERE s.patient_id = p_patient_id AND ppi.days_overdue > 5;

  IF v_frequent_delays > 3 THEN
    v_score := v_score - 20;
  END IF;

  -- Factor 5: Active moroso credit
  SELECT EXISTS (
    SELECT 1 FROM sales
    WHERE patient_id = p_patient_id AND is_credit = true
      AND balance > 0 AND status IN ('pending', 'partial')
      AND EXISTS (
        SELECT 1 FROM payment_plans pp
        JOIN payment_plan_installments ppi ON ppi.payment_plan_id = pp.id
        WHERE pp.sale_id = sales.id AND ppi.status = 'overdue'
      )
  ) INTO v_active_moroso;

  IF v_active_moroso THEN
    v_score := v_score - 30;
  END IF;

  -- Normalize 0-100
  v_score := GREATEST(0, LEAST(100, v_score));

  -- Classify
  v_risk_level := CASE
    WHEN v_score >= 80 THEN 'reliable'
    WHEN v_score >= 60 THEN 'moderate'
    WHEN v_score >= 40 THEN 'high'
    ELSE 'critical'
  END;

  -- Update patient record
  UPDATE patients
  SET payment_probability_score = v_score,
      payment_risk_level = v_risk_level
  WHERE id = p_patient_id;

  RETURN jsonb_build_object(
    'score', v_score,
    'risk_level', v_risk_level,
    'total_credits', v_total_credits,
    'completed_credits', v_completed_credits,
    'completed_no_delay', v_completed_no_delay,
    'avg_days_overdue', ROUND(v_avg_days_overdue, 1),
    'frequent_delays', v_frequent_delays,
    'active_moroso', v_active_moroso
  );
END;
$$;
