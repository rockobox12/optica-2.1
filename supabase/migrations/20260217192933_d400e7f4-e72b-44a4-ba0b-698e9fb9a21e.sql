
-- Add origin_branch_id to patients
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS origin_branch_id uuid REFERENCES public.branches(id);

-- Set origin_branch_id for existing patients (snapshot of current branch_id)
UPDATE public.patients SET origin_branch_id = branch_id WHERE origin_branch_id IS NULL AND branch_id IS NOT NULL;

-- Create patient_transfers table
CREATE TABLE public.patient_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  from_branch_id uuid NOT NULL REFERENCES public.branches(id),
  to_branch_id uuid NOT NULL REFERENCES public.branches(id),
  reason text NOT NULL,
  notes text,
  transferred_by uuid NOT NULL,
  transferred_at timestamptz NOT NULL DEFAULT now(),
  keep_credit_owner boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'completed',
  pending_balance numeric DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.patient_transfers ENABLE ROW LEVEL SECURITY;

-- Only super_admin can insert transfers
CREATE POLICY "patient_transfers_insert_super_admin" ON public.patient_transfers
FOR INSERT TO authenticated
WITH CHECK (public.is_super_admin());

-- Super admin can see all; others can see transfers involving their branch
CREATE POLICY "patient_transfers_select" ON public.patient_transfers
FOR SELECT TO authenticated
USING (
  public.is_super_admin()
  OR from_branch_id = public.current_user_branch_id()
  OR to_branch_id = public.current_user_branch_id()
);

-- RPC to transfer patient (only super_admin)
CREATE OR REPLACE FUNCTION public.transfer_patient(
  p_patient_id uuid,
  p_to_branch_id uuid,
  p_reason text,
  p_notes text DEFAULT NULL,
  p_keep_credit_owner boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_patient RECORD;
  v_from_branch_id uuid;
  v_pending_balance numeric;
  v_transfer_id uuid;
BEGIN
  -- Only super_admin
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Solo el Super Administrador puede transferir pacientes';
  END IF;

  -- Validate reason
  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 3 THEN
    RAISE EXCEPTION 'El motivo de transferencia es obligatorio (mínimo 3 caracteres)';
  END IF;

  -- Get patient
  SELECT id, first_name, last_name, branch_id, is_deleted
  INTO v_patient
  FROM patients WHERE id = p_patient_id;

  IF v_patient IS NULL THEN
    RAISE EXCEPTION 'Paciente no encontrado';
  END IF;

  IF v_patient.is_deleted THEN
    RAISE EXCEPTION 'No se puede transferir un paciente eliminado';
  END IF;

  v_from_branch_id := v_patient.branch_id;

  IF v_from_branch_id = p_to_branch_id THEN
    RAISE EXCEPTION 'El paciente ya pertenece a esta sucursal';
  END IF;

  -- Check pending balance
  SELECT COALESCE(SUM(balance), 0) INTO v_pending_balance
  FROM sales
  WHERE patient_id = p_patient_id AND status IN ('pending', 'partial');

  -- Create transfer record
  INSERT INTO patient_transfers (patient_id, from_branch_id, to_branch_id, reason, notes, transferred_by, keep_credit_owner, pending_balance)
  VALUES (p_patient_id, v_from_branch_id, p_to_branch_id, p_reason, p_notes, auth.uid(), p_keep_credit_owner, v_pending_balance)
  RETURNING id INTO v_transfer_id;

  -- Update patient branch_id
  UPDATE patients SET branch_id = p_to_branch_id WHERE id = p_patient_id;

  -- Set origin_branch_id if not set
  UPDATE patients SET origin_branch_id = v_from_branch_id
  WHERE id = p_patient_id AND origin_branch_id IS NULL;

  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'patient_name', v_patient.first_name || ' ' || v_patient.last_name,
    'from_branch_id', v_from_branch_id,
    'to_branch_id', p_to_branch_id,
    'pending_balance', v_pending_balance
  );
END;
$$;
