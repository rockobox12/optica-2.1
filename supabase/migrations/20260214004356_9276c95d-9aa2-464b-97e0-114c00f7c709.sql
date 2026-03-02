
-- Enhanced function: update overdue installments + plan status + days_overdue
CREATE OR REPLACE FUNCTION public.update_overdue_installments()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_plan RECORD;
  v_overdue_count INTEGER;
  v_pending_count INTEGER;
  v_paid_count INTEGER;
  v_total_count INTEGER;
  v_new_status TEXT;
BEGIN
  -- Step 1: Mark overdue installments
  UPDATE payment_plan_installments
  SET 
    status = 'overdue',
    days_overdue = CURRENT_DATE - due_date
  WHERE status IN ('pending', 'partial')
    AND due_date < CURRENT_DATE;

  -- Step 2: Update days_overdue for already-overdue installments
  UPDATE payment_plan_installments
  SET days_overdue = CURRENT_DATE - due_date
  WHERE status = 'overdue'
    AND due_date < CURRENT_DATE;

  -- Step 3: Update each payment plan status
  FOR v_plan IN 
    SELECT DISTINCT pp.id, pp.status, pp.sale_id, pp.patient_id
    FROM payment_plans pp
    WHERE pp.status NOT IN ('cancelled')
  LOOP
    SELECT 
      COUNT(*) FILTER (WHERE status = 'overdue'),
      COUNT(*) FILTER (WHERE status IN ('pending', 'partial')),
      COUNT(*) FILTER (WHERE status = 'paid'),
      COUNT(*)
    INTO v_overdue_count, v_pending_count, v_paid_count, v_total_count
    FROM payment_plan_installments
    WHERE payment_plan_id = v_plan.id;

    IF v_total_count = 0 THEN
      CONTINUE;
    END IF;

    IF v_paid_count = v_total_count THEN
      v_new_status := 'completed';
    ELSIF v_overdue_count > 0 THEN
      v_new_status := 'delinquent';
    ELSE
      v_new_status := 'active';
    END IF;

    IF v_plan.status IS DISTINCT FROM v_new_status THEN
      UPDATE payment_plans
      SET status = v_new_status, updated_at = now()
      WHERE id = v_plan.id;

      -- Update the related sale's next_payment_date from the earliest pending/overdue installment
      UPDATE sales
      SET 
        next_payment_date = (
          SELECT MIN(due_date) 
          FROM payment_plan_installments 
          WHERE payment_plan_id = v_plan.id 
            AND status IN ('pending', 'overdue')
        ),
        next_payment_amount = (
          SELECT amount 
          FROM payment_plan_installments 
          WHERE payment_plan_id = v_plan.id 
            AND status IN ('pending', 'overdue')
          ORDER BY due_date ASC
          LIMIT 1
        ),
        updated_at = now()
      WHERE id = v_plan.sale_id;
    END IF;
  END LOOP;
END;
$$;
