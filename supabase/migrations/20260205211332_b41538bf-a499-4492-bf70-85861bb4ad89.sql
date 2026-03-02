-- Add latitude and longitude columns to patients table
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Add comment for documentation
COMMENT ON COLUMN public.patients.latitude IS 'GPS latitude coordinate';
COMMENT ON COLUMN public.patients.longitude IS 'GPS longitude coordinate';