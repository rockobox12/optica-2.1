-- Add notification_phone column to lab_orders for snapshot of company phone at order creation
ALTER TABLE public.lab_orders ADD COLUMN IF NOT EXISTS notification_phone text;