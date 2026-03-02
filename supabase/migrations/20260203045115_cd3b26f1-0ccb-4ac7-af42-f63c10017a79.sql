-- =============================================
-- MÓDULO CLÍNICO AVANZADO - ÓPTICA ISTMEÑA SUITE
-- =============================================

-- Exámenes visuales completos
CREATE TABLE public.visual_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  prescription_id UUID REFERENCES public.patient_prescriptions(id),
  examined_by UUID REFERENCES auth.users(id),
  branch_id UUID REFERENCES public.branches(id),
  exam_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Queratometría OD
  od_k1 DECIMAL(5,2), -- Meridiano más plano
  od_k1_axis INTEGER CHECK (od_k1_axis >= 0 AND od_k1_axis <= 180),
  od_k2 DECIMAL(5,2), -- Meridiano más curvo
  od_k2_axis INTEGER CHECK (od_k2_axis >= 0 AND od_k2_axis <= 180),
  od_k_avg DECIMAL(5,2), -- Promedio K
  od_corneal_astig DECIMAL(4,2), -- Astigmatismo corneal
  
  -- Queratometría OI
  oi_k1 DECIMAL(5,2),
  oi_k1_axis INTEGER CHECK (oi_k1_axis >= 0 AND oi_k1_axis <= 180),
  oi_k2 DECIMAL(5,2),
  oi_k2_axis INTEGER CHECK (oi_k2_axis >= 0 AND oi_k2_axis <= 180),
  oi_k_avg DECIMAL(5,2),
  oi_corneal_astig DECIMAL(4,2),
  
  -- Tonometría (presión intraocular)
  od_iop DECIMAL(4,1), -- mmHg
  oi_iop DECIMAL(4,1),
  iop_method TEXT, -- Goldman, NCT, iCare, etc.
  iop_time TIME,
  
  -- Biomicroscopía
  od_anterior_segment TEXT,
  oi_anterior_segment TEXT,
  
  -- Fondo de ojo
  od_fundus TEXT,
  oi_fundus TEXT,
  od_cup_disc_ratio DECIMAL(3,2),
  oi_cup_disc_ratio DECIMAL(3,2),
  
  -- Motilidad ocular
  cover_test TEXT,
  convergence_near_point TEXT,
  ductions TEXT,
  versions TEXT,
  
  -- Acomodación
  od_amplitude_accommodation DECIMAL(4,2),
  oi_amplitude_accommodation DECIMAL(4,2),
  
  -- Pupila
  od_pupil_size DECIMAL(3,1),
  oi_pupil_size DECIMAL(3,1),
  pupil_reaction TEXT,
  
  -- Campos visuales (básico)
  visual_field_notes TEXT,
  
  -- Diagnóstico
  diagnosis TEXT,
  icd_codes TEXT[], -- Códigos CIE-10
  
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_visual_exams_patient ON public.visual_exams(patient_id);
CREATE INDEX idx_visual_exams_date ON public.visual_exams(exam_date DESC);

CREATE TRIGGER update_visual_exams_updated_at
  BEFORE UPDATE ON public.visual_exams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Cálculos de lentes de contacto
CREATE TABLE public.contact_lens_fittings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  visual_exam_id UUID REFERENCES public.visual_exams(id),
  fitted_by UUID REFERENCES auth.users(id),
  branch_id UUID REFERENCES public.branches(id),
  fitting_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- OD Lente de contacto
  od_brand TEXT,
  od_material TEXT, -- Hidrogel, Silicona hidrogel, RGP
  od_type TEXT, -- Esférico, Tórico, Multifocal
  od_bc DECIMAL(4,2), -- Curva base
  od_diameter DECIMAL(4,2),
  od_sphere DECIMAL(5,2),
  od_cylinder DECIMAL(5,2),
  od_axis INTEGER,
  od_add DECIMAL(4,2),
  od_color TEXT,
  od_replacement TEXT, -- Diario, Quincenal, Mensual
  
  -- OI Lente de contacto
  oi_brand TEXT,
  oi_material TEXT,
  oi_type TEXT,
  oi_bc DECIMAL(4,2),
  oi_diameter DECIMAL(4,2),
  oi_sphere DECIMAL(5,2),
  oi_cylinder DECIMAL(5,2),
  oi_axis INTEGER,
  oi_add DECIMAL(4,2),
  oi_color TEXT,
  oi_replacement TEXT,
  
  -- Evaluación del ajuste
  od_centration TEXT,
  od_movement TEXT,
  od_coverage TEXT,
  od_comfort INTEGER CHECK (od_comfort >= 1 AND od_comfort <= 10),
  oi_centration TEXT,
  oi_movement TEXT,
  oi_coverage TEXT,
  oi_comfort INTEGER CHECK (oi_comfort >= 1 AND oi_comfort <= 10),
  
  -- Sobre-refracción
  od_over_refraction TEXT,
  oi_over_refraction TEXT,
  
  wearing_schedule TEXT, -- Uso diario, uso extendido
  care_solution TEXT,
  
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contact_lens_patient ON public.contact_lens_fittings(patient_id);

CREATE TRIGGER update_contact_lens_updated_at
  BEFORE UPDATE ON public.contact_lens_fittings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Recetas digitales
CREATE TABLE public.digital_prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  prescription_id UUID REFERENCES public.patient_prescriptions(id),
  contact_lens_fitting_id UUID REFERENCES public.contact_lens_fittings(id),
  created_by UUID REFERENCES auth.users(id),
  branch_id UUID REFERENCES public.branches(id),
  
  prescription_type TEXT NOT NULL, -- anteojos, lentes_contacto, ambos
  prescription_number TEXT NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  
  -- Datos de la receta (copia para historial)
  prescription_data JSONB NOT NULL,
  
  -- Estado
  status TEXT NOT NULL DEFAULT 'active', -- active, expired, cancelled
  
  -- Firma digital (base64 o referencia)
  doctor_signature TEXT,
  doctor_license TEXT,
  
  -- PDF generado
  pdf_path TEXT,
  
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_digital_prescriptions_patient ON public.digital_prescriptions(patient_id);
CREATE INDEX idx_digital_prescriptions_number ON public.digital_prescriptions(prescription_number);

-- Secuencia para número de receta
CREATE SEQUENCE IF NOT EXISTS prescription_number_seq START 1000;

-- Función para generar número de receta
CREATE OR REPLACE FUNCTION public.generate_prescription_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'RX-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || LPAD(nextval('prescription_number_seq')::TEXT, 5, '0');
END;
$$;

-- Función de transposición de cilindro
CREATE OR REPLACE FUNCTION public.transpose_cylinder(
  p_sphere DECIMAL,
  p_cylinder DECIMAL,
  p_axis INTEGER
)
RETURNS TABLE(
  new_sphere DECIMAL,
  new_cylinder DECIMAL,
  new_axis INTEGER
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  new_sphere := p_sphere + p_cylinder;
  new_cylinder := -p_cylinder;
  new_axis := CASE 
    WHEN p_axis <= 90 THEN p_axis + 90
    ELSE p_axis - 90
  END;
  RETURN NEXT;
END;
$$;

-- Función para calcular esférico equivalente
CREATE OR REPLACE FUNCTION public.spherical_equivalent(
  p_sphere DECIMAL,
  p_cylinder DECIMAL
)
RETURNS DECIMAL
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN p_sphere + (p_cylinder / 2);
END;
$$;

-- Función para calcular curva base sugerida para LC
CREATE OR REPLACE FUNCTION public.calculate_contact_lens_bc(
  p_k_avg DECIMAL
)
RETURNS DECIMAL
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Fórmula: BC = K promedio + 0.5 a 1.0 mm (ajuste estándar)
  RETURN ROUND(337.5 / p_k_avg + 0.5, 2);
END;
$$;

-- RLS Policies
ALTER TABLE public.visual_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_lens_fittings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage visual exams"
  ON public.visual_exams FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage contact lens fittings"
  ON public.contact_lens_fittings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage digital prescriptions"
  ON public.digital_prescriptions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);