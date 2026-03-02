-- Add next payment scheduling columns to sales table
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS next_payment_date date,
ADD COLUMN IF NOT EXISTS next_payment_amount numeric(10,2),
ADD COLUMN IF NOT EXISTS next_payment_note text;

-- Create index for efficient querying of scheduled payments
CREATE INDEX IF NOT EXISTS idx_sales_next_payment_date 
ON public.sales(next_payment_date) 
WHERE is_credit = true AND balance > 0 AND next_payment_date IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.sales.next_payment_date IS 'Scheduled date for next credit payment';
COMMENT ON COLUMN public.sales.next_payment_amount IS 'Expected amount for next payment';
COMMENT ON COLUMN public.sales.next_payment_note IS 'Note about next payment arrangement';