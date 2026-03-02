-- Add 'delivery' to appointment_type enum (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'delivery' AND enumtypid = 'public.appointment_type'::regtype) THEN
        ALTER TYPE public.appointment_type ADD VALUE 'delivery';
    END IF;
END $$;

-- Add sale_id column to link deliveries with sales
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS sale_id UUID REFERENCES public.sales(id);

-- Add lab_order_id for linking with lab orders
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS lab_order_id UUID REFERENCES public.lab_orders(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_appointments_sale_id ON public.appointments(sale_id);
CREATE INDEX IF NOT EXISTS idx_appointments_lab_order_id ON public.appointments(lab_order_id);
CREATE INDEX IF NOT EXISTS idx_appointments_type_date ON public.appointments(appointment_type, appointment_date);