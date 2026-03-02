
-- Add payment_reminder to auto_message_type enum
ALTER TYPE public.auto_message_type ADD VALUE IF NOT EXISTS 'payment_reminder';

-- Add whatsapp_opted_in to patients (default true for existing patients)
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS whatsapp_opted_in BOOLEAN NOT NULL DEFAULT true;

-- Payment reminder settings table (singleton)
CREATE TABLE public.payment_reminder_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  mode TEXT NOT NULL DEFAULT 'manual_approval' CHECK (mode IN ('automatic', 'manual_approval', 'manual')),
  interval_days INTEGER NOT NULL DEFAULT 15,
  template_content TEXT NOT NULL DEFAULT 'Hola {nombre}, te recordamos tu saldo pendiente de ${saldo_restante}. Tu próximo pago estaba programado para {next_payment_date}. ¿Gustas realizar tu abono hoy? Responde para apoyarte. — Óptica Istmeña {sucursal}',
  send_hour INTEGER NOT NULL DEFAULT 10,
  max_daily_per_patient INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

INSERT INTO public.payment_reminder_settings (is_enabled, mode)
VALUES (false, 'manual_approval');

ALTER TABLE public.payment_reminder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read payment reminder settings"
ON public.payment_reminder_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can update payment reminder settings"
ON public.payment_reminder_settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_payment_reminder_settings_updated_at
BEFORE UPDATE ON public.payment_reminder_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Payment reminder log table for tracking sent reminders and anti-spam
CREATE TABLE public.payment_reminder_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  sale_id UUID REFERENCES public.sales(id),
  saldo_pendiente NUMERIC NOT NULL DEFAULT 0,
  dias_sin_pago INTEGER NOT NULL DEFAULT 0,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'sent', 'failed', 'cancelled')),
  message_content TEXT,
  sent_by UUID,
  sent_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  auto_message_log_id UUID REFERENCES public.auto_message_logs(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_reminder_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read payment reminder logs"
ON public.payment_reminder_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert payment reminder logs"
ON public.payment_reminder_log FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins can update payment reminder logs"
ON public.payment_reminder_log FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'cobrador'::app_role));
