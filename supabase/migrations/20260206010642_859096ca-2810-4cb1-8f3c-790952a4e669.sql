-- Add location column to lab_orders for physical location tracking
ALTER TABLE public.lab_orders 
ADD COLUMN IF NOT EXISTS location text NOT NULL DEFAULT 'EN_LABORATORIO' 
CHECK (location IN ('EN_LABORATORIO', 'EN_OPTICA'));

-- Update status column to support new values
-- First drop existing check constraint if any
ALTER TABLE public.lab_orders DROP CONSTRAINT IF EXISTS lab_orders_status_check;

-- Add proper status constraint with new values
ALTER TABLE public.lab_orders 
ADD CONSTRAINT lab_orders_status_check 
CHECK (status IN ('pending', 'RECIBIDA', 'EN_LABORATORIO', 'EN_OPTICA', 'LISTO_PARA_ENTREGA', 'ENTREGADO', 'RETRABAJO', 'in_production', 'ready', 'delivered', 'cancelled'));

-- Create trigger function to validate status transitions based on location
CREATE OR REPLACE FUNCTION public.validate_lab_order_status_location()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- LISTO_PARA_ENTREGA requires location = EN_OPTICA
  IF NEW.status = 'LISTO_PARA_ENTREGA' AND NEW.location != 'EN_OPTICA' THEN
    RAISE EXCEPTION 'Para marcar como LISTO_PARA_ENTREGA, la orden debe estar EN_OPTICA';
  END IF;
  
  -- ENTREGADO requires location = EN_OPTICA
  IF NEW.status = 'ENTREGADO' AND NEW.location != 'EN_OPTICA' THEN
    RAISE EXCEPTION 'Para marcar como ENTREGADO, la orden debe estar EN_OPTICA';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for validation
DROP TRIGGER IF EXISTS validate_lab_order_status_location_trigger ON public.lab_orders;
CREATE TRIGGER validate_lab_order_status_location_trigger
BEFORE UPDATE ON public.lab_orders
FOR EACH ROW
EXECUTE FUNCTION public.validate_lab_order_status_location();

-- Add index for common queries
CREATE INDEX IF NOT EXISTS idx_lab_orders_location ON public.lab_orders(location);
CREATE INDEX IF NOT EXISTS idx_lab_orders_status_location ON public.lab_orders(status, location);
CREATE INDEX IF NOT EXISTS idx_lab_orders_sale_id ON public.lab_orders(sale_id);