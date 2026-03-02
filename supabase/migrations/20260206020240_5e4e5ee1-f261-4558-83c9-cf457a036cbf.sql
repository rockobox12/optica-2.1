-- =====================================================
-- SECURITY FIX: Address Error-Level Security Issues
-- =====================================================
-- 1. Fix patient-files storage bucket access (role-based)
-- 2. Fix overly permissive RLS policies on clinical/financial tables
-- 3. Fix SECURITY DEFINER views

-- =====================================================
-- 1. FIX STORAGE BUCKET POLICIES (patient-files)
-- =====================================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload patient files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view patient files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete patient files" ON storage.objects;

-- Create role-based policies for clinical staff
CREATE POLICY "Clinical staff can view patient files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'patient-files' AND
    (public.has_role(auth.uid(), 'doctor') OR 
     public.has_role(auth.uid(), 'asistente') OR 
     public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Clinical staff can upload patient files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'patient-files' AND
    (public.has_role(auth.uid(), 'doctor') OR 
     public.has_role(auth.uid(), 'asistente') OR 
     public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Admins and doctors can delete patient files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'patient-files' AND
    (public.has_role(auth.uid(), 'admin') OR
     public.has_role(auth.uid(), 'doctor'))
  );

-- =====================================================
-- 2. FIX CLINICAL TABLE RLS POLICIES
-- =====================================================

-- patient_attachments
DROP POLICY IF EXISTS "Authenticated users can manage attachments" ON public.patient_attachments;

CREATE POLICY "Clinical staff can view patient attachments"
  ON public.patient_attachments FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'doctor') OR 
    public.has_role(auth.uid(), 'asistente') OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Clinical staff can create patient attachments"
  ON public.patient_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'doctor') OR 
    public.has_role(auth.uid(), 'asistente') OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Clinical staff can update patient attachments"
  ON public.patient_attachments FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'doctor') OR 
    public.has_role(auth.uid(), 'asistente') OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete patient attachments"
  ON public.patient_attachments FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- patient_visits
DROP POLICY IF EXISTS "Authenticated users can manage visits" ON public.patient_visits;

CREATE POLICY "Clinical staff can view patient visits"
  ON public.patient_visits FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'doctor') OR 
    public.has_role(auth.uid(), 'asistente') OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Clinical staff can create patient visits"
  ON public.patient_visits FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'doctor') OR 
    public.has_role(auth.uid(), 'asistente') OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Clinical staff can update patient visits"
  ON public.patient_visits FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'doctor') OR 
    public.has_role(auth.uid(), 'asistente') OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete patient visits"
  ON public.patient_visits FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- patient_clinical_forms
DROP POLICY IF EXISTS "Authenticated users can manage clinical forms" ON public.patient_clinical_forms;

CREATE POLICY "Clinical staff can view clinical forms"
  ON public.patient_clinical_forms FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'doctor') OR 
    public.has_role(auth.uid(), 'asistente') OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Clinical staff can create clinical forms"
  ON public.patient_clinical_forms FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'doctor') OR 
    public.has_role(auth.uid(), 'asistente') OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Clinical staff can update clinical forms"
  ON public.patient_clinical_forms FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'doctor') OR 
    public.has_role(auth.uid(), 'asistente') OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete clinical forms"
  ON public.patient_clinical_forms FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- visual_exams
DROP POLICY IF EXISTS "Authenticated users can manage visual exams" ON public.visual_exams;

CREATE POLICY "Clinical staff can view visual exams"
  ON public.visual_exams FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'doctor') OR 
    public.has_role(auth.uid(), 'asistente') OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Clinical staff can create visual exams"
  ON public.visual_exams FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'doctor') OR 
    public.has_role(auth.uid(), 'asistente') OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Clinical staff can update visual exams"
  ON public.visual_exams FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'doctor') OR 
    public.has_role(auth.uid(), 'asistente') OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete visual exams"
  ON public.visual_exams FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- contact_lens_fittings
DROP POLICY IF EXISTS "Authenticated users can manage lens fittings" ON public.contact_lens_fittings;

CREATE POLICY "Clinical staff can view lens fittings"
  ON public.contact_lens_fittings FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'doctor') OR 
    public.has_role(auth.uid(), 'asistente') OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Clinical staff can create lens fittings"
  ON public.contact_lens_fittings FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'doctor') OR 
    public.has_role(auth.uid(), 'asistente') OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Clinical staff can update lens fittings"
  ON public.contact_lens_fittings FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'doctor') OR 
    public.has_role(auth.uid(), 'asistente') OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete lens fittings"
  ON public.contact_lens_fittings FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- digital_prescriptions
DROP POLICY IF EXISTS "Authenticated users can manage digital prescriptions" ON public.digital_prescriptions;

CREATE POLICY "Clinical staff can view digital prescriptions"
  ON public.digital_prescriptions FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'doctor') OR 
    public.has_role(auth.uid(), 'asistente') OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Clinical staff can create digital prescriptions"
  ON public.digital_prescriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'doctor') OR 
    public.has_role(auth.uid(), 'asistente') OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Clinical staff can update digital prescriptions"
  ON public.digital_prescriptions FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'doctor') OR 
    public.has_role(auth.uid(), 'asistente') OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete digital prescriptions"
  ON public.digital_prescriptions FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- 3. FIX FINANCIAL TABLE RLS POLICIES
-- =====================================================

-- sale_items - ownership-based with admin override
DROP POLICY IF EXISTS "Authenticated users can manage sale items" ON public.sale_items;

CREATE POLICY "Authenticated users can view sale items"
  ON public.sale_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can create sale items"
  ON public.sale_items FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'asistente') OR 
    public.has_role(auth.uid(), 'doctor')
  );

CREATE POLICY "Admins can update sale items"
  ON public.sale_items FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete sale items"
  ON public.sale_items FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- sale_payments
DROP POLICY IF EXISTS "Authenticated users can manage sale payments" ON public.sale_payments;

CREATE POLICY "Authenticated users can view sale payments"
  ON public.sale_payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can create sale payments"
  ON public.sale_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'asistente') OR 
    public.has_role(auth.uid(), 'cobrador')
  );

CREATE POLICY "Admins can update sale payments"
  ON public.sale_payments FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete sale payments"
  ON public.sale_payments FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- credit_payments
DROP POLICY IF EXISTS "Authenticated users can manage credit payments" ON public.credit_payments;

CREATE POLICY "Authenticated users can view credit payments"
  ON public.credit_payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authorized staff can create credit payments"
  ON public.credit_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'cobrador') OR 
    public.has_role(auth.uid(), 'asistente')
  );

CREATE POLICY "Admins can update credit payments"
  ON public.credit_payments FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete credit payments"
  ON public.credit_payments FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- cash_registers - ownership-based
DROP POLICY IF EXISTS "Authenticated users can create cash registers" ON public.cash_registers;
DROP POLICY IF EXISTS "Authenticated users can update cash registers" ON public.cash_registers;

CREATE POLICY "Staff can create cash registers"
  ON public.cash_registers FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'asistente')
  );

CREATE POLICY "Users can update own or admin can update any cash register"
  ON public.cash_registers FOR UPDATE
  TO authenticated
  USING (
    opened_by = auth.uid() OR 
    public.has_role(auth.uid(), 'admin')
  );

-- cash_counts
DROP POLICY IF EXISTS "Authenticated users can create cash counts" ON public.cash_counts;

CREATE POLICY "Staff can create cash counts"
  ON public.cash_counts FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'asistente')
  );

-- expenses
DROP POLICY IF EXISTS "Authenticated users can create expenses" ON public.expenses;

CREATE POLICY "Staff can create expenses"
  ON public.expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'asistente')
  );

-- bank_transactions
DROP POLICY IF EXISTS "Authenticated users can create bank transactions" ON public.bank_transactions;

CREATE POLICY "Admin can create bank transactions"
  ON public.bank_transactions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- cash_movements
DROP POLICY IF EXISTS "Authenticated users can create cash movements" ON public.cash_movements;

CREATE POLICY "Staff can create cash movements"
  ON public.cash_movements FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'asistente')
  );

-- =====================================================
-- 4. FIX OPERATIONAL TABLE RLS POLICIES
-- =====================================================

-- appointment_reminders
DROP POLICY IF EXISTS "Authenticated users can manage reminders" ON public.appointment_reminders;

CREATE POLICY "Staff can view appointment reminders"
  ON public.appointment_reminders FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'asistente') OR 
    public.has_role(auth.uid(), 'doctor')
  );

CREATE POLICY "Staff can create appointment reminders"
  ON public.appointment_reminders FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'asistente') OR 
    public.has_role(auth.uid(), 'doctor')
  );

CREATE POLICY "Staff can update appointment reminders"
  ON public.appointment_reminders FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'asistente') OR 
    public.has_role(auth.uid(), 'doctor')
  );

CREATE POLICY "Admins can delete appointment reminders"
  ON public.appointment_reminders FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- waiting_room
DROP POLICY IF EXISTS "Authenticated users can manage waiting room" ON public.waiting_room;

CREATE POLICY "Staff can view waiting room"
  ON public.waiting_room FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'asistente') OR 
    public.has_role(auth.uid(), 'doctor')
  );

CREATE POLICY "Staff can create waiting room entries"
  ON public.waiting_room FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'asistente') OR 
    public.has_role(auth.uid(), 'doctor')
  );

CREATE POLICY "Staff can update waiting room"
  ON public.waiting_room FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'asistente') OR 
    public.has_role(auth.uid(), 'doctor')
  );

CREATE POLICY "Staff can delete waiting room entries"
  ON public.waiting_room FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'asistente') OR 
    public.has_role(auth.uid(), 'doctor')
  );

-- lab_orders
DROP POLICY IF EXISTS "Authenticated users can create lab orders" ON public.lab_orders;
DROP POLICY IF EXISTS "Authenticated users can update lab orders" ON public.lab_orders;

CREATE POLICY "Staff can create lab orders"
  ON public.lab_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'asistente') OR 
    public.has_role(auth.uid(), 'doctor')
  );

CREATE POLICY "Staff can update lab orders"
  ON public.lab_orders FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'asistente') OR 
    public.has_role(auth.uid(), 'doctor')
  );

-- =====================================================
-- 5. FIX SECURITY DEFINER VIEWS
-- =====================================================

-- Drop existing views (they may have SECURITY DEFINER)
DROP VIEW IF EXISTS public.comisiones_pendientes_resumen;
DROP VIEW IF EXISTS public.promotor_ranking_mensual;

-- Recreate views WITHOUT SECURITY DEFINER (uses SECURITY INVOKER by default)
CREATE VIEW public.comisiones_pendientes_resumen 
WITH (security_invoker = on) AS
SELECT 
  p.id AS promotor_id,
  p.nombre_completo,
  COUNT(*) AS comisiones_pendientes,
  COALESCE(SUM(pc.monto_comision), 0) AS total_pendiente
FROM public.promotores p
LEFT JOIN public.promotor_comisiones pc ON p.id = pc.promotor_id AND pc.status = 'PENDIENTE'
GROUP BY p.id, p.nombre_completo;

CREATE VIEW public.promotor_ranking_mensual 
WITH (security_invoker = on) AS
SELECT 
  p.id AS promotor_id,
  p.nombre_completo,
  COALESCE(SUM(pc.monto_venta), 0) AS total_ventas,
  COALESCE(SUM(pc.monto_comision), 0) AS total_comisiones,
  COUNT(pc.id) AS num_ventas,
  TO_CHAR(CURRENT_DATE, 'YYYY-MM') AS periodo
FROM public.promotores p
LEFT JOIN public.promotor_comisiones pc 
  ON p.id = pc.promotor_id 
  AND pc.periodo = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
GROUP BY p.id, p.nombre_completo
ORDER BY total_ventas DESC;