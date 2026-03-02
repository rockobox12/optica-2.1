
-- Add archive columns to patients table (reuse existing soft-delete columns where possible)
-- The table already has: is_deleted, deleted_at, deleted_by, deleted_reason
-- We add a proper status enum and archive-specific fields

-- Create patient status type
DO $$ BEGIN
  CREATE TYPE public.patient_status AS ENUM ('active', 'inactive', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add status column with default 'active'
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS status public.patient_status NOT NULL DEFAULT 'active';

-- Add archive-specific columns
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archived_by UUID,
ADD COLUMN IF NOT EXISTS archive_reason TEXT;

-- Migrate existing soft-deleted patients to archived status
UPDATE public.patients 
SET status = 'archived', 
    archived_at = COALESCE(deleted_at, now()), 
    archived_by = deleted_by, 
    archive_reason = COALESCE(deleted_reason, 'Migrado desde eliminación anterior')
WHERE is_deleted = true;

-- Set inactive patients
UPDATE public.patients 
SET status = 'inactive'
WHERE is_active = false AND is_deleted = false;

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_patients_status ON public.patients(status);

-- Create or replace the archive function
CREATE OR REPLACE FUNCTION public.archive_patient(p_patient_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
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
    RAISE EXCEPTION 'Solo el Administrador puede archivar pacientes';
  END IF;

  -- Validate reason
  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 5 THEN
    RAISE EXCEPTION 'El motivo de archivado es obligatorio (mínimo 5 caracteres)';
  END IF;

  -- Get patient
  SELECT id, first_name, last_name, status
  INTO v_patient
  FROM patients WHERE id = p_patient_id;

  IF v_patient IS NULL THEN
    RAISE EXCEPTION 'Paciente no encontrado';
  END IF;

  IF v_patient.status = 'archived' THEN
    RAISE EXCEPTION 'El paciente ya está archivado';
  END IF;

  -- Gather counts for audit
  SELECT COUNT(*) INTO v_sales_count FROM sales WHERE patient_id = p_patient_id;
  SELECT COUNT(*) INTO v_payments_count FROM credit_payments WHERE sale_id IN (SELECT id FROM sales WHERE patient_id = p_patient_id);
  SELECT COUNT(*) INTO v_appointments_count FROM appointments WHERE patient_id = p_patient_id;
  SELECT COUNT(*) INTO v_lab_orders_count FROM lab_orders WHERE patient_id = p_patient_id;
  SELECT COALESCE(SUM(balance), 0) INTO v_saldo_pendiente FROM sales WHERE patient_id = p_patient_id AND status IN ('pending', 'partial');

  -- Archive patient (NOT delete)
  UPDATE patients
  SET status = 'archived',
      archived_at = now(),
      archived_by = auth.uid(),
      archive_reason = p_reason,
      is_active = false,
      is_deleted = true,
      deleted_at = now(),
      deleted_by = auth.uid(),
      deleted_reason = p_reason
  WHERE id = p_patient_id;

  -- Insert audit record (reuse existing audit table)
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
    'saldo_pendiente', v_saldo_pendiente
  );
END;
$func$;

-- Create reactivate function
CREATE OR REPLACE FUNCTION public.reactivate_patient(p_patient_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  v_patient RECORD;
BEGIN
  -- Authorization: only admin
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Solo el Administrador puede reactivar pacientes';
  END IF;

  SELECT id, first_name, last_name, status
  INTO v_patient
  FROM patients WHERE id = p_patient_id;

  IF v_patient IS NULL THEN
    RAISE EXCEPTION 'Paciente no encontrado';
  END IF;

  IF v_patient.status != 'archived' THEN
    RAISE EXCEPTION 'Solo se pueden reactivar pacientes archivados';
  END IF;

  -- Reactivate
  UPDATE patients
  SET status = 'active',
      archived_at = NULL,
      archived_by = NULL,
      archive_reason = NULL,
      is_active = true,
      is_deleted = false,
      deleted_at = NULL,
      deleted_by = NULL,
      deleted_reason = NULL
  WHERE id = p_patient_id;

  -- Audit log
  INSERT INTO patient_deletion_audit (
    patient_id, patient_name_snapshot, deleted_by_user_id, reason,
    saldo_pendiente_snapshot, sales_count, payments_count,
    appointments_count, lab_orders_count
  ) VALUES (
    p_patient_id,
    v_patient.first_name || ' ' || v_patient.last_name,
    auth.uid(),
    'REACTIVACIÓN de paciente archivado',
    0, 0, 0, 0, 0
  );

  RETURN jsonb_build_object(
    'success', true,
    'patient_name', v_patient.first_name || ' ' || v_patient.last_name
  );
END;
$func$;
