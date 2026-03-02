-- =============================================
-- MÓDULO DE PACIENTES - ÓPTICA ISTMEÑA SUITE
-- =============================================

-- Tabla de pacientes
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id),
  
  -- Datos personales
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  birth_date DATE,
  gender TEXT CHECK (gender IN ('masculino', 'femenino', 'otro')),
  
  -- Contacto
  email TEXT,
  phone TEXT,
  mobile TEXT,
  
  -- Dirección
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  
  -- Identificación
  curp TEXT,
  rfc TEXT,
  
  -- Datos médicos
  blood_type TEXT,
  allergies TEXT,
  medical_conditions TEXT,
  current_medications TEXT,
  
  -- Referencia
  referred_by TEXT,
  occupation TEXT,
  
  -- Control
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para búsqueda
CREATE INDEX idx_patients_name ON public.patients(first_name, last_name);
CREATE INDEX idx_patients_phone ON public.patients(phone);
CREATE INDEX idx_patients_mobile ON public.patients(mobile);
CREATE INDEX idx_patients_email ON public.patients(email);
CREATE INDEX idx_patients_branch ON public.patients(branch_id);
CREATE INDEX idx_patients_curp ON public.patients(curp);

-- Trigger para updated_at
CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Historial de graduaciones/recetas
CREATE TABLE public.patient_prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  examined_by UUID REFERENCES auth.users(id),
  branch_id UUID REFERENCES public.branches(id),
  exam_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Ojo derecho (OD)
  od_sphere DECIMAL(5,2),
  od_cylinder DECIMAL(5,2),
  od_axis INTEGER CHECK (od_axis >= 0 AND od_axis <= 180),
  od_add DECIMAL(4,2),
  od_prism DECIMAL(4,2),
  od_prism_base TEXT,
  od_va_sc TEXT, -- Agudeza visual sin corrección
  od_va_cc TEXT, -- Agudeza visual con corrección
  od_pupil_distance DECIMAL(4,2),
  
  -- Ojo izquierdo (OI)
  oi_sphere DECIMAL(5,2),
  oi_cylinder DECIMAL(5,2),
  oi_axis INTEGER CHECK (oi_axis >= 0 AND oi_axis <= 180),
  oi_add DECIMAL(4,2),
  oi_prism DECIMAL(4,2),
  oi_prism_base TEXT,
  oi_va_sc TEXT,
  oi_va_cc TEXT,
  oi_pupil_distance DECIMAL(4,2),
  
  -- Distancia pupilar total
  total_pd DECIMAL(4,2),
  
  -- Tipo de lente recomendado
  lens_type TEXT, -- monofocal, bifocal, progresivo
  lens_material TEXT,
  lens_treatment TEXT,
  
  -- Diagnóstico y notas
  diagnosis TEXT,
  recommendations TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prescriptions_patient ON public.patient_prescriptions(patient_id);
CREATE INDEX idx_prescriptions_date ON public.patient_prescriptions(exam_date DESC);

CREATE TRIGGER update_prescriptions_updated_at
  BEFORE UPDATE ON public.patient_prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Historial clínico / consultas
CREATE TABLE public.patient_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  prescription_id UUID REFERENCES public.patient_prescriptions(id),
  attended_by UUID REFERENCES auth.users(id),
  branch_id UUID REFERENCES public.branches(id),
  visit_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  visit_type TEXT NOT NULL DEFAULT 'consulta', -- consulta, seguimiento, ajuste, entrega
  
  -- Motivo y síntomas
  chief_complaint TEXT,
  symptoms TEXT,
  
  -- Examen
  examination_notes TEXT,
  
  -- Diagnóstico y plan
  diagnosis TEXT,
  treatment_plan TEXT,
  
  -- Próxima cita
  next_visit_date DATE,
  next_visit_notes TEXT,
  
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_visits_patient ON public.patient_visits(patient_id);
CREATE INDEX idx_visits_date ON public.patient_visits(visit_date DESC);

CREATE TRIGGER update_visits_updated_at
  BEFORE UPDATE ON public.patient_visits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Plantillas de formularios clínicos
CREATE TABLE public.clinical_form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  form_schema JSONB NOT NULL, -- Definición del formulario (campos, tipos, validaciones)
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_form_templates_updated_at
  BEFORE UPDATE ON public.clinical_form_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Formularios clínicos completados
CREATE TABLE public.patient_clinical_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.clinical_form_templates(id),
  visit_id UUID REFERENCES public.patient_visits(id),
  form_data JSONB NOT NULL, -- Datos del formulario completado
  completed_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE INDEX idx_clinical_forms_patient ON public.patient_clinical_forms(patient_id);

-- Storage bucket para archivos de pacientes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'patient-files',
  'patient-files',
  false,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
);

-- Tabla para tracking de archivos adjuntos
CREATE TABLE public.patient_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  visit_id UUID REFERENCES public.patient_visits(id),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  description TEXT,
  category TEXT DEFAULT 'general', -- receta, imagen, documento, otro
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attachments_patient ON public.patient_attachments(patient_id);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_clinical_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_attachments ENABLE ROW LEVEL SECURITY;

-- Patients: Solo admin puede eliminar
CREATE POLICY "Authenticated users can view patients"
  ON public.patients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create patients"
  ON public.patients FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update patients"
  ON public.patients FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can delete patients"
  ON public.patients FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Prescriptions
CREATE POLICY "Authenticated users can manage prescriptions"
  ON public.patient_prescriptions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Visits
CREATE POLICY "Authenticated users can manage visits"
  ON public.patient_visits FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Form Templates: Solo admin puede gestionar
CREATE POLICY "Authenticated users can view form templates"
  ON public.clinical_form_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage form templates"
  ON public.clinical_form_templates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Clinical Forms
CREATE POLICY "Authenticated users can manage clinical forms"
  ON public.patient_clinical_forms FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Attachments
CREATE POLICY "Authenticated users can manage attachments"
  ON public.patient_attachments FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Storage policies for patient-files bucket
CREATE POLICY "Authenticated users can upload patient files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'patient-files');

CREATE POLICY "Authenticated users can view patient files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'patient-files');

CREATE POLICY "Authenticated users can delete patient files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'patient-files');

-- Insertar plantillas de formularios predeterminadas
INSERT INTO public.clinical_form_templates (name, description, form_schema) VALUES
(
  'Historia Clínica Oftalmológica',
  'Formulario estándar para primera consulta oftalmológica',
  '{
    "fields": [
      {"name": "motivo_consulta", "label": "Motivo de consulta", "type": "textarea", "required": true},
      {"name": "antecedentes_oculares", "label": "Antecedentes oculares", "type": "textarea"},
      {"name": "antecedentes_familiares", "label": "Antecedentes familiares", "type": "textarea"},
      {"name": "usa_lentes", "label": "¿Usa lentes actualmente?", "type": "select", "options": ["Sí", "No"]},
      {"name": "ultimo_examen", "label": "Fecha último examen visual", "type": "date"},
      {"name": "enfermedades_sistemicas", "label": "Enfermedades sistémicas", "type": "textarea"},
      {"name": "medicamentos", "label": "Medicamentos actuales", "type": "textarea"}
    ]
  }'::jsonb
),
(
  'Examen de Retinoscopía',
  'Formulario para registro de retinoscopía',
  '{
    "fields": [
      {"name": "tecnica", "label": "Técnica utilizada", "type": "select", "options": ["Estática", "Dinámica", "Mohindra"]},
      {"name": "distancia_trabajo", "label": "Distancia de trabajo (cm)", "type": "number"},
      {"name": "od_resultado", "label": "OD - Resultado", "type": "text"},
      {"name": "oi_resultado", "label": "OI - Resultado", "type": "text"},
      {"name": "observaciones", "label": "Observaciones", "type": "textarea"}
    ]
  }'::jsonb
),
(
  'Examen de Fondo de Ojo',
  'Formulario para registro de oftalmoscopía',
  '{
    "fields": [
      {"name": "metodo", "label": "Método", "type": "select", "options": ["Directa", "Indirecta", "Biomicroscopía"]},
      {"name": "dilatacion", "label": "¿Se dilató?", "type": "select", "options": ["Sí", "No"]},
      {"name": "od_papila", "label": "OD - Papila", "type": "text"},
      {"name": "od_macula", "label": "OD - Mácula", "type": "text"},
      {"name": "od_vasos", "label": "OD - Vasos", "type": "text"},
      {"name": "od_retina", "label": "OD - Retina periférica", "type": "text"},
      {"name": "oi_papila", "label": "OI - Papila", "type": "text"},
      {"name": "oi_macula", "label": "OI - Mácula", "type": "text"},
      {"name": "oi_vasos", "label": "OI - Vasos", "type": "text"},
      {"name": "oi_retina", "label": "OI - Retina periférica", "type": "text"},
      {"name": "hallazgos", "label": "Hallazgos relevantes", "type": "textarea"}
    ]
  }'::jsonb
);