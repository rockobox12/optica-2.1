-- Migrar datos existentes antes de cambiar el constraint
UPDATE patients SET gender = 'HOMBRE' WHERE gender = 'MASCULINO';
UPDATE patients SET gender = 'MUJER' WHERE gender = 'FEMENINO';

-- Eliminar el constraint anterior
ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_gender_check;

-- Crear el nuevo constraint con los valores correctos
ALTER TABLE patients ADD CONSTRAINT patients_gender_check CHECK (gender IN ('HOMBRE', 'MUJER'));