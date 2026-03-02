
-- Settings for installment-based payment reminders
CREATE TABLE public.installment_reminder_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  days_before_due INTEGER NOT NULL DEFAULT 1,
  days_after_due INTEGER NOT NULL DEFAULT 1,
  overdue_repeat_interval_days INTEGER NOT NULL DEFAULT 15,
  send_hour INTEGER NOT NULL DEFAULT 10,
  max_hour INTEGER NOT NULL DEFAULT 21,
  min_hour INTEGER NOT NULL DEFAULT 8,
  max_per_patient_per_week INTEGER NOT NULL DEFAULT 2,
  template_before TEXT NOT NULL DEFAULT 'Hola {nombre}, te recordamos que tu próximo pago es el {fecha} por ${monto}. Sucursal: {sucursal}. ¡Gracias! 👓',
  template_overdue TEXT NOT NULL DEFAULT 'Hola {nombre}, tienes un pago vencido desde {fecha} por ${monto}. Saldo pendiente: ${saldo}. ¿Gustas realizar tu abono hoy?',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.installment_reminder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage installment reminder settings"
  ON public.installment_reminder_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can read installment reminder settings"
  ON public.installment_reminder_settings FOR SELECT TO authenticated
  USING (true);

-- Insert default row
INSERT INTO public.installment_reminder_settings (id) VALUES (gen_random_uuid());

-- Log table for installment reminders
CREATE TABLE public.installment_reminder_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id),
  plan_id UUID REFERENCES public.payment_plans(id),
  installment_id UUID REFERENCES public.payment_plan_installments(id),
  sale_id UUID,
  template_key TEXT NOT NULL, -- 'before' or 'overdue'
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  message_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed, manual_opened
  phone TEXT,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  auto_message_log_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.installment_reminder_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage installment reminder logs"
  ON public.installment_reminder_log FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can read installment reminder logs"
  ON public.installment_reminder_log FOR SELECT TO authenticated
  USING (true);

-- Index for anti-spam checks
CREATE INDEX idx_installment_reminder_log_patient_created 
  ON public.installment_reminder_log(patient_id, created_at DESC);
CREATE INDEX idx_installment_reminder_log_installment 
  ON public.installment_reminder_log(installment_id, template_key);
