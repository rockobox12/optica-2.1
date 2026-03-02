-- Create ADD clinical configuration table
CREATE TABLE public.add_clinical_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edad_minima_add integer NOT NULL DEFAULT 40,
  permitir_add_menores boolean NOT NULL DEFAULT false,
  mostrar_sugerencia_add boolean NOT NULL DEFAULT true,
  add_min numeric(4,2) NOT NULL DEFAULT 0.50,
  add_max numeric(4,2) NOT NULL DEFAULT 3.50,
  add_step numeric(4,2) NOT NULL DEFAULT 0.25,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Add comment
COMMENT ON TABLE public.add_clinical_config IS 'Configuración clínica para campo ADD (Adición) basada en edad';

-- Create age-based ADD suggestions table
CREATE TABLE public.add_age_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_age integer NOT NULL,
  max_age integer,
  suggested_add numeric(4,2) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add default suggestions based on standard presbicia ranges
INSERT INTO public.add_age_suggestions (min_age, max_age, suggested_add) VALUES
  (40, 44, 1.00),
  (45, 49, 1.50),
  (50, 54, 2.00),
  (55, 59, 2.25),
  (60, NULL, 2.50);

-- Insert default config (only one row allowed)
INSERT INTO public.add_clinical_config (id) VALUES ('00000000-0000-0000-0000-000000000001');

-- Create unique constraint to ensure only one config row exists
CREATE UNIQUE INDEX add_clinical_config_singleton ON public.add_clinical_config ((true));

-- Enable RLS
ALTER TABLE public.add_clinical_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.add_age_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS policies: Anyone authenticated can read, only admin can modify
CREATE POLICY "Anyone can read ADD config"
  ON public.add_clinical_config
  FOR SELECT
  USING (true);

CREATE POLICY "Only admin can update ADD config"
  ON public.add_clinical_config
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read age suggestions"
  ON public.add_age_suggestions
  FOR SELECT
  USING (true);

CREATE POLICY "Only admin can manage age suggestions"
  ON public.add_age_suggestions
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_add_clinical_config_updated_at
  BEFORE UPDATE ON public.add_clinical_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get ADD suggestion by age
CREATE OR REPLACE FUNCTION public.get_add_suggestion_by_age(p_age integer)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT suggested_add
  FROM public.add_age_suggestions
  WHERE p_age >= min_age
    AND (max_age IS NULL OR p_age <= max_age)
    AND is_active = true
  ORDER BY min_age DESC
  LIMIT 1;
$$;