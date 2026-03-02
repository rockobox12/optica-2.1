
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS antecedentes_personales TEXT DEFAULT NULL;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS antecedentes_familiares TEXT DEFAULT NULL;
