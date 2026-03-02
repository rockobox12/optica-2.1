-- Add WhatsApp field to patients table
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(20);

-- Add comment for documentation
COMMENT ON COLUMN public.patients.whatsapp IS 'WhatsApp number normalized to +52XXXXXXXXXX format';