
-- =============================================================
-- FIX 1: Add search_path to functions missing it
-- =============================================================

-- update_commission_updated_at (trigger)
CREATE OR REPLACE FUNCTION public.update_commission_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- generate_expense_number
CREATE OR REPLACE FUNCTION public.generate_expense_number()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  new_number TEXT;
  year_suffix TEXT;
  sequence_num INTEGER;
BEGIN
  year_suffix := to_char(CURRENT_DATE, 'YY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(expense_number FROM 5) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM public.expenses
  WHERE expense_number LIKE 'GTO' || year_suffix || '%';
  
  new_number := 'GTO' || year_suffix || '-' || LPAD(sequence_num::TEXT, 5, '0');
  
  RETURN new_number;
END;
$function$;

-- calculate_cash_register_expected
CREATE OR REPLACE FUNCTION public.calculate_cash_register_expected(p_cash_register_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_opening_amount NUMERIC;
  v_cash_sales NUMERIC;
  v_cash_expenses NUMERIC;
  v_deposits NUMERIC;
  v_withdrawals NUMERIC;
BEGIN
  SELECT opening_amount INTO v_opening_amount
  FROM public.cash_registers WHERE id = p_cash_register_id;
  
  SELECT COALESCE(SUM(amount), 0) INTO v_cash_sales
  FROM public.cash_movements
  WHERE cash_register_id = p_cash_register_id AND movement_type = 'sale';
  
  SELECT COALESCE(SUM(amount), 0) INTO v_cash_expenses
  FROM public.cash_movements
  WHERE cash_register_id = p_cash_register_id AND movement_type = 'expense';
  
  SELECT COALESCE(SUM(amount), 0) INTO v_deposits
  FROM public.cash_movements
  WHERE cash_register_id = p_cash_register_id AND movement_type = 'deposit';
  
  SELECT COALESCE(SUM(amount), 0) INTO v_withdrawals
  FROM public.cash_movements
  WHERE cash_register_id = p_cash_register_id AND movement_type = 'withdrawal';
  
  RETURN v_opening_amount + v_cash_sales - v_cash_expenses - v_deposits + v_withdrawals;
END;
$function$;

-- generate_referral_code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN 'OI-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
END;
$function$;

-- transpose_cylinder (IMMUTABLE)
CREATE OR REPLACE FUNCTION public.transpose_cylinder(p_sphere numeric, p_cylinder numeric, p_axis integer)
RETURNS TABLE(new_sphere numeric, new_cylinder numeric, new_axis integer)
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
BEGIN
  new_sphere := p_sphere + p_cylinder;
  new_cylinder := -p_cylinder;
  new_axis := CASE 
    WHEN p_axis <= 90 THEN p_axis + 90
    ELSE p_axis - 90
  END;
  RETURN NEXT;
END;
$function$;

-- spherical_equivalent (IMMUTABLE)
CREATE OR REPLACE FUNCTION public.spherical_equivalent(p_sphere numeric, p_cylinder numeric)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN p_sphere + (p_cylinder / 2);
END;
$function$;

-- calculate_contact_lens_bc (IMMUTABLE)
CREATE OR REPLACE FUNCTION public.calculate_contact_lens_bc(p_k_avg numeric)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN ROUND(337.5 / p_k_avg + 0.5, 2);
END;
$function$;

-- =============================================================
-- FIX 2: Add authorization checks to high-risk SECURITY DEFINER functions
-- =============================================================

-- update_inventory: require authenticated user with admin/asistente/doctor role
CREATE OR REPLACE FUNCTION public.update_inventory(p_product_id uuid, p_branch_id uuid, p_quantity integer, p_movement_type text, p_notes text DEFAULT NULL::text, p_reference_type text DEFAULT NULL::text, p_reference_id uuid DEFAULT NULL::uuid, p_unit_cost numeric DEFAULT NULL::numeric, p_created_by uuid DEFAULT NULL::uuid, p_transfer_branch_id uuid DEFAULT NULL::uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_current_stock INTEGER;
  v_new_stock INTEGER;
  v_movement_id UUID;
  v_inventory_id UUID;
BEGIN
  -- Authorization check: require authenticated user with appropriate role
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required';
  END IF;
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR 
          public.has_role(auth.uid(), 'asistente'::app_role) OR
          public.has_role(auth.uid(), 'doctor'::app_role)) THEN
    RAISE EXCEPTION 'Unauthorized: Admin, assistant, or doctor role required for inventory operations';
  END IF;

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
$function$;

-- calculate_promotor_commission: require authenticated user with admin/asistente role
CREATE OR REPLACE FUNCTION public.calculate_promotor_commission(p_promotor_id uuid, p_sale_id uuid, p_monto_venta numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_config RECORD;
  v_comision NUMERIC := 0;
  v_periodo TEXT;
  v_default_promotor_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Authorization check
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required';
  END IF;
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR 
          public.has_role(auth.uid(), 'asistente'::app_role)) THEN
    RAISE EXCEPTION 'Unauthorized: Admin or assistant role required for commission calculations';
  END IF;

  -- No generar comisión para "Óptica Istmeña (Paciente llegó solo)"
  IF p_promotor_id = v_default_promotor_id THEN
    RETURN 0;
  END IF;

  -- Buscar configuración específica del promotor
  SELECT tipo_comision, valor_comision INTO v_config
  FROM public.promotor_commission_config
  WHERE promotor_id = p_promotor_id AND activo = true
  LIMIT 1;

  -- Si no hay configuración específica, usar global
  IF v_config IS NULL THEN
    SELECT tipo_comision, valor_comision INTO v_config
    FROM public.promotor_commission_config
    WHERE promotor_id IS NULL AND activo = true
    LIMIT 1;
  END IF;

  -- Si no hay ninguna configuración, retornar 0
  IF v_config IS NULL THEN
    RETURN 0;
  END IF;

  -- Calcular comisión
  IF v_config.tipo_comision = 'PERCENT' THEN
    v_comision := p_monto_venta * (v_config.valor_comision / 100);
  ELSE
    v_comision := v_config.valor_comision;
  END IF;

  -- Obtener periodo actual
  v_periodo := to_char(CURRENT_DATE, 'YYYY-MM');

  -- Insertar registro de comisión
  INSERT INTO public.promotor_comisiones (
    promotor_id, sale_id, monto_venta, monto_comision, 
    tipo_comision, valor_aplicado, periodo
  ) VALUES (
    p_promotor_id, p_sale_id, p_monto_venta, v_comision,
    v_config.tipo_comision, v_config.valor_comision, v_periodo
  )
  ON CONFLICT (sale_id) DO NOTHING;

  RETURN v_comision;
END;
$function$;

-- update_promotor_alerts: require authenticated user with admin/asistente role
CREATE OR REPLACE FUNCTION public.update_promotor_alerts(p_promotor_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_periodo TEXT := to_char(CURRENT_DATE, 'YYYY-MM');
  v_ventas_count INTEGER;
  v_ventas_monto NUMERIC;
  v_comision_monto NUMERIC;
  v_threshold RECORD;
  v_default_promotor_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Authorization check
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required';
  END IF;
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR 
          public.has_role(auth.uid(), 'asistente'::app_role)) THEN
    RAISE EXCEPTION 'Unauthorized: Admin or assistant role required for promotor alert updates';
  END IF;

  -- No procesar alertas para promotor por defecto
  IF p_promotor_id = v_default_promotor_id THEN
    RETURN;
  END IF;

  -- Calcular métricas del mes actual
  SELECT 
    COUNT(*),
    COALESCE(SUM(monto_venta), 0),
    COALESCE(SUM(monto_comision), 0)
  INTO v_ventas_count, v_ventas_monto, v_comision_monto
  FROM public.promotor_comisiones
  WHERE promotor_id = p_promotor_id AND periodo = v_periodo;

  -- Procesar cada tipo de alerta
  FOR v_threshold IN 
    SELECT alert_type, threshold_value 
    FROM public.promotor_alert_thresholds 
    WHERE activo = true
  LOOP
    INSERT INTO public.promotor_alerts (
      promotor_id, alert_type, threshold_value, current_value, periodo, triggered, triggered_at
    ) VALUES (
      p_promotor_id,
      v_threshold.alert_type,
      v_threshold.threshold_value,
      CASE v_threshold.alert_type
        WHEN 'VENTAS_COUNT' THEN v_ventas_count
        WHEN 'VENTAS_MONTO' THEN v_ventas_monto
        WHEN 'COMISION_MONTO' THEN v_comision_monto
      END,
      v_periodo,
      CASE v_threshold.alert_type
        WHEN 'VENTAS_COUNT' THEN v_ventas_count >= v_threshold.threshold_value
        WHEN 'VENTAS_MONTO' THEN v_ventas_monto >= v_threshold.threshold_value
        WHEN 'COMISION_MONTO' THEN v_comision_monto >= v_threshold.threshold_value
      END,
      CASE 
        WHEN (CASE v_threshold.alert_type
          WHEN 'VENTAS_COUNT' THEN v_ventas_count >= v_threshold.threshold_value
          WHEN 'VENTAS_MONTO' THEN v_ventas_monto >= v_threshold.threshold_value
          WHEN 'COMISION_MONTO' THEN v_comision_monto >= v_threshold.threshold_value
        END) THEN now()
        ELSE NULL
      END
    )
    ON CONFLICT (promotor_id, alert_type, periodo) 
    DO UPDATE SET
      current_value = EXCLUDED.current_value,
      triggered = EXCLUDED.triggered,
      triggered_at = CASE 
        WHEN NOT promotor_alerts.triggered AND EXCLUDED.triggered THEN now()
        ELSE promotor_alerts.triggered_at
      END;
  END LOOP;
END;
$function$;

-- update_customer_tier: require authenticated user
CREATE OR REPLACE FUNCTION public.update_customer_tier(p_customer_loyalty_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_customer RECORD;
  v_new_tier_id UUID;
BEGIN
  -- Authorization check
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required';
  END IF;
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR 
          public.has_role(auth.uid(), 'asistente'::app_role)) THEN
    RAISE EXCEPTION 'Unauthorized: Admin or assistant role required for loyalty tier updates';
  END IF;

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
$function$;
