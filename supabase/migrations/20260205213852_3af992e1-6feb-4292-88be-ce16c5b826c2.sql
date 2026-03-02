-- Add enhanced notification tracking columns to lab_orders
ALTER TABLE public.lab_orders 
ADD COLUMN IF NOT EXISTS last_notified_by UUID,
ADD COLUMN IF NOT EXISTS notify_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS notify_channel VARCHAR(50) DEFAULT 'whatsapp';

-- Add comment for documentation
COMMENT ON COLUMN public.lab_orders.last_notified_by IS 'User who last sent notification';
COMMENT ON COLUMN public.lab_orders.notify_count IS 'Number of times notification was sent';
COMMENT ON COLUMN public.lab_orders.notify_channel IS 'Channel used for notification (whatsapp, sms, email)';