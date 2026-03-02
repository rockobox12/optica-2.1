-- Add WhatsApp number field to branches table
ALTER TABLE public.branches 
ADD COLUMN whatsapp_number TEXT;