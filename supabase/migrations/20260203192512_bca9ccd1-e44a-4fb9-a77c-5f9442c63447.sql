-- =====================================================
-- SECURITY FIX: Complete RLS policy fixes
-- =====================================================

-- 7. FIX USER_ROLES TABLE - Drop existing and recreate
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 8. FIX SALES TABLE - Role-based access
DROP POLICY IF EXISTS "Authenticated users can view sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can create sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can update sales" ON public.sales;

CREATE POLICY "Sales and admin staff can view sales"
  ON public.sales FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'vendedor'::app_role)
    OR public.has_role(auth.uid(), 'cobrador'::app_role)
  );

CREATE POLICY "Sales staff can create sales"
  ON public.sales FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'vendedor'::app_role)
  );

CREATE POLICY "Admin and sales can update sales"
  ON public.sales FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'vendedor'::app_role)
    OR public.has_role(auth.uid(), 'cobrador'::app_role)
  );

-- 9. FIX PATIENT_PRESCRIPTIONS TABLE - Clinical staff only
DROP POLICY IF EXISTS "Authenticated users can view prescriptions" ON public.patient_prescriptions;
DROP POLICY IF EXISTS "Authenticated users can manage prescriptions" ON public.patient_prescriptions;

CREATE POLICY "Clinical staff can view prescriptions"
  ON public.patient_prescriptions FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'doctor'::app_role)
    OR public.has_role(auth.uid(), 'asistente'::app_role)
    OR public.has_role(auth.uid(), 'vendedor'::app_role)
  );

CREATE POLICY "Doctors and admins can manage prescriptions"
  ON public.patient_prescriptions FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'doctor'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'doctor'::app_role)
  );