
-- Create patient_transfer_requests table
CREATE TABLE public.patient_transfer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  from_branch_id uuid NOT NULL REFERENCES public.branches(id),
  to_branch_id uuid NOT NULL REFERENCES public.branches(id),
  reason text NOT NULL,
  notes text,
  requested_by uuid NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  transfer_id uuid REFERENCES public.patient_transfers(id)
);

-- Enable RLS
ALTER TABLE public.patient_transfer_requests ENABLE ROW LEVEL SECURITY;

-- Super admin can do everything
CREATE POLICY "super_admin_full_access" ON public.patient_transfer_requests
  FOR ALL USING (public.is_super_admin());

-- Gerente can INSERT requests for their branch
CREATE POLICY "gerente_insert_requests" ON public.patient_transfer_requests
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'gerente'::app_role)
    AND from_branch_id = public.current_user_branch_id()
    AND requested_by = auth.uid()
  );

-- Gerente can SELECT requests from their branch
CREATE POLICY "gerente_select_own_branch" ON public.patient_transfer_requests
  FOR SELECT USING (
    public.has_role(auth.uid(), 'gerente'::app_role)
    AND from_branch_id = public.current_user_branch_id()
  );

-- RPC to approve a transfer request
CREATE OR REPLACE FUNCTION public.approve_transfer_request(p_request_id uuid, p_review_notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_req RECORD;
  v_transfer_result jsonb;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Solo el Super Administrador puede aprobar transferencias';
  END IF;

  SELECT * INTO v_req FROM patient_transfer_requests WHERE id = p_request_id;
  IF v_req IS NULL THEN RAISE EXCEPTION 'Solicitud no encontrada'; END IF;
  IF v_req.status != 'pending' THEN RAISE EXCEPTION 'La solicitud ya fue procesada'; END IF;

  -- Execute the actual transfer
  SELECT public.transfer_patient(v_req.patient_id, v_req.to_branch_id, v_req.reason, v_req.notes, true) INTO v_transfer_result;

  -- Update request status
  UPDATE patient_transfer_requests
  SET status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_notes = p_review_notes,
      transfer_id = (v_transfer_result->>'transfer_id')::uuid
  WHERE id = p_request_id;

  RETURN v_transfer_result || jsonb_build_object('request_id', p_request_id);
END;
$$;

-- RPC to reject a transfer request
CREATE OR REPLACE FUNCTION public.reject_transfer_request(p_request_id uuid, p_review_notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_req RECORD;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Solo el Super Administrador puede rechazar transferencias';
  END IF;

  SELECT * INTO v_req FROM patient_transfer_requests WHERE id = p_request_id;
  IF v_req IS NULL THEN RAISE EXCEPTION 'Solicitud no encontrada'; END IF;
  IF v_req.status != 'pending' THEN RAISE EXCEPTION 'La solicitud ya fue procesada'; END IF;

  UPDATE patient_transfer_requests
  SET status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_notes = p_review_notes
  WHERE id = p_request_id;

  RETURN jsonb_build_object('success', true, 'request_id', p_request_id);
END;
$$;
