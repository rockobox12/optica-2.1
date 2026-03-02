-- Add soft delete columns to credit_payments for void functionality
ALTER TABLE public.credit_payments
ADD COLUMN IF NOT EXISTS is_voided BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS voided_by UUID,
ADD COLUMN IF NOT EXISTS voided_reason TEXT,
ADD COLUMN IF NOT EXISTS replaced_by_payment_id UUID REFERENCES public.credit_payments(id);

-- Add index for filtering active payments
CREATE INDEX IF NOT EXISTS idx_credit_payments_is_voided ON public.credit_payments(is_voided) WHERE is_voided = false;

-- Create payment audit log table for detailed tracking
CREATE TABLE IF NOT EXISTS public.payment_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- PAYMENT_VOIDED, PAYMENT_REPLACEMENT_STARTED, PAYMENT_REPLACEMENT_COMPLETED, PAYMENT_REPLACEMENT_CANCELLED
  payment_id UUID REFERENCES public.credit_payments(id),
  sale_id UUID REFERENCES public.sales(id),
  patient_id UUID REFERENCES public.patients(id),
  old_payment_id UUID REFERENCES public.credit_payments(id),
  new_payment_id UUID REFERENCES public.credit_payments(id),
  amount NUMERIC(10,2),
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  performed_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment_audit_log (admin only for read, authenticated for insert)
CREATE POLICY "Admin can view payment audit logs"
ON public.payment_audit_log
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can insert audit logs"
ON public.payment_audit_log
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create function to void a payment with proper balance recalculation
CREATE OR REPLACE FUNCTION public.void_payment(
  p_payment_id UUID,
  p_voided_by UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_payment RECORD;
  v_sale RECORD;
  v_new_balance NUMERIC;
  v_new_amount_paid NUMERIC;
BEGIN
  -- Authorization check: only admin can void payments
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required to void payments';
  END IF;

  -- Get payment details
  SELECT * INTO v_payment FROM credit_payments WHERE id = p_payment_id;
  
  IF v_payment IS NULL THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;
  
  IF v_payment.is_voided THEN
    RAISE EXCEPTION 'Payment is already voided';
  END IF;

  -- Get sale details
  SELECT * INTO v_sale FROM sales WHERE id = v_payment.sale_id;
  
  -- Calculate new balance
  v_new_amount_paid := v_sale.amount_paid - v_payment.amount;
  v_new_balance := v_sale.balance + v_payment.amount;

  -- Void the payment (soft delete)
  UPDATE credit_payments
  SET is_voided = true,
      voided_at = now(),
      voided_by = p_voided_by,
      voided_reason = p_reason
  WHERE id = p_payment_id;

  -- Update sale balance
  UPDATE sales
  SET amount_paid = v_new_amount_paid,
      balance = v_new_balance,
      status = CASE 
        WHEN v_new_balance <= 0 THEN 'completed'::sale_status
        WHEN v_new_amount_paid > 0 THEN 'partial'::sale_status
        ELSE 'pending'::sale_status
      END,
      updated_at = now()
  WHERE id = v_payment.sale_id;

  -- Log the void event
  INSERT INTO payment_audit_log (
    event_type, payment_id, sale_id, patient_id, amount, reason, performed_by, metadata
  )
  SELECT 
    'PAYMENT_VOIDED',
    p_payment_id,
    v_payment.sale_id,
    s.patient_id,
    v_payment.amount,
    p_reason,
    p_voided_by,
    jsonb_build_object(
      'payment_method', v_payment.payment_method,
      'payment_number', v_payment.payment_number,
      'original_sale_balance', v_sale.balance,
      'new_sale_balance', v_new_balance
    )
  FROM sales s WHERE s.id = v_payment.sale_id;

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', p_payment_id,
    'voided_amount', v_payment.amount,
    'new_sale_balance', v_new_balance,
    'sale_id', v_payment.sale_id
  );
END;
$$;