
-- Add editable message templates to patient_portal_config
ALTER TABLE public.patient_portal_config
ADD COLUMN IF NOT EXISTS otp_template TEXT NOT NULL DEFAULT 'Tu código de acceso a Óptica Istmeña es: {OTP}. Vigencia: {MIN} minutos.',
ADD COLUMN IF NOT EXISTS portal_link_template TEXT NOT NULL DEFAULT 'Entra aquí: {LINK} Código: {OTP}. Vigencia: {MIN} minutos.';
