
-- System version log table
CREATE TABLE public.system_version_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.system_version_log ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read versions
CREATE POLICY "Authenticated users can view version log"
  ON public.system_version_log FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only super_admin can insert
CREATE POLICY "Super admin can insert version log"
  ON public.system_version_log FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Seed V2.01
INSERT INTO public.system_version_log (version, title, notes)
VALUES (
  'V2.01',
  'Multi-sucursal corporativo + Pago cruzado',
  'Sistema de pacientes corporativos: atención en cualquier sucursal con trazabilidad completa. Control de versiones del sistema.'
);
