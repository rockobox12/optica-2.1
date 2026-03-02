
-- Add thermal printer settings to company_settings
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS printer_paper_size text NOT NULL DEFAULT '80mm',
  ADD COLUMN IF NOT EXISTS printer_density text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS printer_speed text NOT NULL DEFAULT 'normal';
