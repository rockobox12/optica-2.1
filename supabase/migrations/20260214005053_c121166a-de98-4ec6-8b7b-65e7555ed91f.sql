
-- 1) Add level-based templates to installment_reminder_settings
ALTER TABLE public.installment_reminder_settings
  ADD COLUMN IF NOT EXISTS template_level1 text NOT NULL DEFAULT 'Hola {nombre}, notamos que tu pago programado del {fecha} aún no se ha registrado. Si ya realizaste tu abono, ignora este mensaje. Si necesitas apoyo, estamos para ayudarte. 👓',
  ADD COLUMN IF NOT EXISTS template_level2 text NOT NULL DEFAULT 'Hola {nombre}, tu cuenta presenta un atraso de {dias} días. Saldo vencido: ${monto}. Te invitamos a regularizar tu pago para evitar suspensión de beneficios. Sucursal: {telefono_sucursal}',
  ADD COLUMN IF NOT EXISTS template_level3 text NOT NULL DEFAULT 'Hola {nombre}, tu cuenta presenta un atraso prolongado de {dias} días. Saldo pendiente: ${saldo}. Favor de comunicarte a la óptica para regularizar tu situación. Tel: {telefono_sucursal}',
  ADD COLUMN IF NOT EXISTS level_cooldown_days integer NOT NULL DEFAULT 15;

-- 2) Add delinquency_level to installment_reminder_log for audit
ALTER TABLE public.installment_reminder_log
  ADD COLUMN IF NOT EXISTS delinquency_level integer,
  ADD COLUMN IF NOT EXISTS days_overdue_at_send integer;

-- 3) Add block_moroso_30plus and allow_only_payments to credit_settings
ALTER TABLE public.credit_settings
  ADD COLUMN IF NOT EXISTS block_moroso_30plus boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_only_payments_when_blocked boolean NOT NULL DEFAULT true;
