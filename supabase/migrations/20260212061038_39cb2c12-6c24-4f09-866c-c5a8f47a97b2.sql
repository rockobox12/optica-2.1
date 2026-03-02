
-- Add delivery responsible fields to appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS delivery_responsible_type text DEFAULT 'OPTICA',
  ADD COLUMN IF NOT EXISTS delivery_responsible_user_id uuid,
  ADD COLUMN IF NOT EXISTS delivery_responsible_name_snapshot text;
