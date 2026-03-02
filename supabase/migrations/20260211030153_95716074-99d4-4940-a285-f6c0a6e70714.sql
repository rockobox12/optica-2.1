
-- Add soft-delete columns to patients
ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
ADD COLUMN IF NOT EXISTS deleted_by uuid,
ADD COLUMN IF NOT EXISTS deleted_reason text;

-- Create patient deletion audit table
CREATE TABLE IF NOT EXISTS public.patient_deletion_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  patient_name_snapshot text NOT NULL,
  deleted_by_user_id uuid NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  reason text NOT NULL,
  saldo_pendiente_snapshot numeric DEFAULT 0,
  sales_count integer DEFAULT 0,
  payments_count integer DEFAULT 0,
  appointments_count integer DEFAULT 0,
  lab_orders_count integer DEFAULT 0
);

ALTER TABLE public.patient_deletion_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit records
CREATE POLICY "Admins can view patient deletion audit"
ON public.patient_deletion_audit FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert audit records
CREATE POLICY "Admins can insert patient deletion audit"
ON public.patient_deletion_audit FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Index for filtering out deleted patients efficiently
CREATE INDEX IF NOT EXISTS idx_patients_is_deleted ON public.patients (is_deleted) WHERE is_deleted = false;

-- Function to soft-delete a patient (admin only)
CREATE OR REPLACE FUNCTION public.soft_delete_patient(
  p_patient_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient RECORD;
  v_sales_count integer;
  v_payments_count integer;
  v_appointments_count integer;
  v_lab_orders_count integer;
  v_saldo_pendiente numeric;
BEGIN
  -- Authorization: only admin
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Solo el Administrador puede eliminar pacientes';
  END IF;

  -- Get patient
  SELECT id, first_name, last_name, is_deleted
  INTO v_patient
  FROM patients WHERE id = p_patient_id;

  IF v_patient IS NULL THEN
    RAISE EXCEPTION 'Paciente no encontrado';
  END IF;

  IF v_patient.is_deleted THEN
    RAISE EXCEPTION 'El paciente ya está eliminado';
  END IF;

  -- Gather counts
  SELECT COUNT(*) INTO v_sales_count FROM sales WHERE patient_id = p_patient_id;
  SELECT COUNT(*) INTO v_payments_count FROM credit_payments WHERE sale_id IN (SELECT id FROM sales WHERE patient_id = p_patient_id);
  SELECT COUNT(*) INTO v_appointments_count FROM appointments WHERE patient_id = p_patient_id;
  SELECT COUNT(*) INTO v_lab_orders_count FROM lab_orders WHERE patient_id = p_patient_id;
  SELECT COALESCE(SUM(balance), 0) INTO v_saldo_pendiente FROM sales WHERE patient_id = p_patient_id AND status IN ('pending', 'partial');

  -- Soft delete
  UPDATE patients
  SET is_deleted = true,
      deleted_at = now(),
      deleted_by = auth.uid(),
      deleted_reason = p_reason,
      is_active = false
  WHERE id = p_patient_id;

  -- Insert audit record
  INSERT INTO patient_deletion_audit (
    patient_id, patient_name_snapshot, deleted_by_user_id, reason,
    saldo_pendiente_snapshot, sales_count, payments_count,
    appointments_count, lab_orders_count
  ) VALUES (
    p_patient_id,
    v_patient.first_name || ' ' || v_patient.last_name,
    auth.uid(),
    p_reason,
    v_saldo_pendiente,
    v_sales_count,
    v_payments_count,
    v_appointments_count,
    v_lab_orders_count
  );

  RETURN jsonb_build_object(
    'success', true,
    'patient_name', v_patient.first_name || ' ' || v_patient.last_name,
    'sales_count', v_sales_count,
    'payments_count', v_payments_count,
    'appointments_count', v_appointments_count,
    'lab_orders_count', v_lab_orders_count,
    'saldo_pendiente', v_saldo_pendiente
  );
END;
$$;
