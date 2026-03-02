-- Create message template types enum
CREATE TYPE public.auto_message_type AS ENUM (
  'order_ready',
  'appointment_reminder',
  'post_sale_followup',
  'birthday_greeting',
  'order_delayed'
);

-- Create message channel enum
CREATE TYPE public.message_channel AS ENUM ('whatsapp', 'sms');

-- Create auto message templates table
CREATE TABLE public.auto_message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_type auto_message_type NOT NULL,
  channel message_channel NOT NULL,
  name TEXT NOT NULL,
  template_content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  trigger_config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(message_type, channel)
);

-- Create message send log table
CREATE TABLE public.auto_message_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.auto_message_templates(id),
  message_type auto_message_type NOT NULL,
  channel message_channel NOT NULL,
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT,
  patient_id UUID REFERENCES public.patients(id),
  message_content TEXT NOT NULL,
  variables_used JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'cancelled')),
  error_message TEXT,
  external_id TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reference_type TEXT,
  reference_id UUID
);

-- Create indexes
CREATE INDEX idx_auto_message_templates_type ON public.auto_message_templates(message_type);
CREATE INDEX idx_auto_message_templates_active ON public.auto_message_templates(is_active);
CREATE INDEX idx_auto_message_logs_patient ON public.auto_message_logs(patient_id);
CREATE INDEX idx_auto_message_logs_status ON public.auto_message_logs(status);
CREATE INDEX idx_auto_message_logs_created ON public.auto_message_logs(created_at DESC);
CREATE INDEX idx_auto_message_logs_type ON public.auto_message_logs(message_type);

-- Enable RLS
ALTER TABLE public.auto_message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_message_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for templates (admin only)
CREATE POLICY "Admin can manage message templates"
ON public.auto_message_templates
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for logs (admin and relevant staff)
CREATE POLICY "Staff can view message logs"
ON public.auto_message_logs
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'doctor'::app_role) OR
  public.has_role(auth.uid(), 'asistente'::app_role)
);

CREATE POLICY "System can insert message logs"
ON public.auto_message_logs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Insert default templates
INSERT INTO public.auto_message_templates (message_type, channel, name, template_content, trigger_config) VALUES
('order_ready', 'whatsapp', 'Orden Lista - WhatsApp', 'Hola {nombre}, tu pedido #{numero_orden} está listo para recoger en {sucursal}. Te esperamos. 😊', '{"auto_send": true}'),
('order_ready', 'sms', 'Orden Lista - SMS', 'Hola {nombre}, tu pedido #{numero_orden} está listo para recoger. Te esperamos en {sucursal}.', '{"auto_send": true}'),
('appointment_reminder', 'whatsapp', 'Recordatorio Cita - WhatsApp', 'Hola {nombre}, te recordamos tu cita mañana {fecha} a las {hora} con {doctor}. ¡Te esperamos! 📅', '{"hours_before": 24, "auto_send": true}'),
('appointment_reminder', 'sms', 'Recordatorio Cita - SMS', 'Recordatorio: Cita mañana {fecha} a las {hora}. Te esperamos en {sucursal}.', '{"hours_before": 24, "auto_send": true}'),
('post_sale_followup', 'whatsapp', 'Seguimiento Post-Venta - WhatsApp', 'Hola {nombre}, han pasado 7 días desde tu compra. ¿Cómo te ha ido con {producto}? Estamos para ayudarte. ⭐', '{"days_after": 7, "auto_send": false}'),
('post_sale_followup', 'sms', 'Seguimiento Post-Venta - SMS', 'Hola {nombre}, ¿cómo te ha ido con tu compra? Estamos para ayudarte. Óptica Istmeña.', '{"days_after": 7, "auto_send": false}'),
('birthday_greeting', 'whatsapp', 'Felicitación Cumpleaños - WhatsApp', '🎂 ¡Feliz cumpleaños {nombre}! Como regalo especial, te obsequiamos un 15% de descuento en tu próxima compra. ¡Úsalo este mes! Código: CUMPLE{año}', '{"auto_send": true}'),
('birthday_greeting', 'sms', 'Felicitación Cumpleaños - SMS', 'Feliz cumpleaños {nombre}! Regalo: 15% desc. en tu próxima compra. Código: CUMPLE{año}. Óptica Istmeña', '{"auto_send": true}'),
('order_delayed', 'whatsapp', 'Orden Atrasada - WhatsApp', 'Hola {nombre}, lamentamos informarte que tu pedido #{numero_orden} tiene un retraso. Nuevo tiempo estimado: {nueva_fecha}. Disculpa las molestias. 🙏', '{"auto_send": false}'),
('order_delayed', 'sms', 'Orden Atrasada - SMS', 'Hola {nombre}, tu pedido #{numero_orden} tiene retraso. Nueva fecha estimada: {nueva_fecha}. Disculpa las molestias.', '{"auto_send": false}');

-- Trigger for updated_at
CREATE TRIGGER update_auto_message_templates_updated_at
BEFORE UPDATE ON public.auto_message_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();