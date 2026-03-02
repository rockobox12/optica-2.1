-- Tabla para historial de eventos de contacto (sin contenido de mensajes)
CREATE TABLE public.contact_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('WHATSAPP_OPENED', 'WHATSAPP_COPIED', 'CALL_STARTED', 'PHONE_COPIED')),
  channel TEXT NOT NULL CHECK (channel IN ('WHATSAPP', 'CALL', 'COPY')),
  phone_used TEXT,
  related_entity_type TEXT CHECK (related_entity_type IN ('APPOINTMENT', 'LAB_ORDER', 'SALE', NULL)),
  related_entity_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para consultas eficientes
CREATE INDEX idx_contact_events_patient_id ON public.contact_events(patient_id);
CREATE INDEX idx_contact_events_created_at ON public.contact_events(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.contact_events ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso
-- Lectura: usuarios autenticados pueden ver eventos de sus sucursales
CREATE POLICY "Authenticated users can view contact events"
ON public.contact_events
FOR SELECT
TO authenticated
USING (true);

-- Inserción: usuarios autenticados pueden crear eventos
CREATE POLICY "Authenticated users can create contact events"
ON public.contact_events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Comentario para documentación
COMMENT ON TABLE public.contact_events IS 'Historial de eventos de contacto con pacientes (sin contenido de mensajes)';