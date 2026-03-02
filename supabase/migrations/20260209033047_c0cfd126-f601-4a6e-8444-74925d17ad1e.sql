
-- Create company_settings table for storing business information
CREATE TABLE public.company_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  logo_url TEXT,
  company_name TEXT NOT NULL DEFAULT 'Óptica Istmeña',
  slogan TEXT,
  rfc TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  currency TEXT NOT NULL DEFAULT 'MXN',
  date_format TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
  timezone TEXT NOT NULL DEFAULT 'America/Mexico_City',
  language TEXT NOT NULL DEFAULT 'es',
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 16.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add missing columns to branches table
ALTER TABLE public.branches
ADD COLUMN IF NOT EXISTS code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS colony TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip_code TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS manager TEXT,
ADD COLUMN IF NOT EXISTS is_main BOOLEAN NOT NULL DEFAULT false;

-- Create storage bucket for company logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for company logos - public read
CREATE POLICY "Company logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

-- Create storage policy for authenticated users to upload
CREATE POLICY "Authenticated users can upload company logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'company-logos' AND auth.role() = 'authenticated');

-- Create storage policy for authenticated users to update
CREATE POLICY "Authenticated users can update company logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'company-logos' AND auth.role() = 'authenticated');

-- Create storage policy for authenticated users to delete
CREATE POLICY "Authenticated users can delete company logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'company-logos' AND auth.role() = 'authenticated');

-- Enable RLS on company_settings
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for company_settings - all authenticated users can read
CREATE POLICY "Authenticated users can view company settings"
ON public.company_settings FOR SELECT
USING (auth.role() = 'authenticated');

-- Only admins can modify company settings
CREATE POLICY "Admins can insert company settings"
ON public.company_settings FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update company settings"
ON public.company_settings FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Insert default company settings
INSERT INTO public.company_settings (company_name, slogan)
VALUES ('Óptica Istmeña', 'Tu visión, nuestra pasión')
ON CONFLICT DO NOTHING;

-- Create trigger for updated_at on company_settings
CREATE TRIGGER update_company_settings_updated_at
BEFORE UPDATE ON public.company_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to ensure only one main branch
CREATE OR REPLACE FUNCTION public.ensure_single_main_branch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_main = true THEN
    UPDATE public.branches SET is_main = false WHERE id != NEW.id AND is_main = true;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for ensuring single main branch
CREATE TRIGGER ensure_single_main_branch_trigger
BEFORE INSERT OR UPDATE ON public.branches
FOR EACH ROW
WHEN (NEW.is_main = true)
EXECUTE FUNCTION public.ensure_single_main_branch();

-- Function to generate branch code
CREATE OR REPLACE FUNCTION public.generate_branch_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INTEGER;
  v_code TEXT;
BEGIN
  SELECT COUNT(*) + 1 INTO v_count FROM public.branches;
  v_code := 'SUC' || LPAD(v_count::TEXT, 3, '0');
  RETURN v_code;
END;
$$;
