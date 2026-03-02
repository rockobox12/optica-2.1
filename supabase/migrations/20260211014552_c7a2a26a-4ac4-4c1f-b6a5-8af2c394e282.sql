
-- Add payment_method column to cash_movements to track income/expense by method
ALTER TABLE public.cash_movements 
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash';

-- Add sale_id reference for linking movements to sales
ALTER TABLE public.cash_movements 
ADD COLUMN IF NOT EXISTS sale_id uuid REFERENCES public.sales(id);

-- Add index for querying movements by session
CREATE INDEX IF NOT EXISTS idx_cash_movements_register_method 
ON public.cash_movements (cash_register_id, payment_method);

-- Add unique constraint to prevent duplicate movements per sale+method
CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_movements_unique_sale_ref 
ON public.cash_movements (cash_register_id, reference_type, reference_id, movement_type) 
WHERE reference_id IS NOT NULL;
