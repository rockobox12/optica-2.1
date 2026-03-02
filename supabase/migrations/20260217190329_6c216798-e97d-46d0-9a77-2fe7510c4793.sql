
-- 1. Helper function: get current user's branch_id from their profile
CREATE OR REPLACE FUNCTION public.current_user_branch_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT default_branch_id FROM public.profiles WHERE user_id = auth.uid()
$$;

-- 2. Helper function: check if current user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
$$;

-- 3. Helper function: check if user can access a given branch_id
-- super_admin can access everything; others only their own branch
CREATE OR REPLACE FUNCTION public.can_access_branch(p_branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.is_super_admin()
    OR p_branch_id = public.current_user_branch_id()
    OR p_branch_id IS NULL
$$;

-- 4. Assign branch_id to user_roles for non-super_admin users who don't have one
UPDATE public.user_roles
SET branch_id = (
  SELECT default_branch_id FROM profiles WHERE profiles.user_id = user_roles.user_id
)
WHERE branch_id IS NULL
  AND role != 'super_admin'
  AND EXISTS (
    SELECT 1 FROM profiles WHERE profiles.user_id = user_roles.user_id AND default_branch_id IS NOT NULL
  );

-- 5. Assign branch_id to patients that don't have one (default to Matriz)
UPDATE public.patients
SET branch_id = '2b808200-040d-40c2-972e-af2f54d13fff'
WHERE branch_id IS NULL;

-- 6. Assign branch_id to sales that don't have one
UPDATE public.sales
SET branch_id = '2b808200-040d-40c2-972e-af2f54d13fff'
WHERE branch_id IS NULL;

-- 7. Assign branch_id to lab_orders that don't have one
UPDATE public.lab_orders
SET branch_id = '2b808200-040d-40c2-972e-af2f54d13fff'
WHERE branch_id IS NULL;

-- 8. Assign branch_id to appointments that don't have one
UPDATE public.appointments
SET branch_id = '2b808200-040d-40c2-972e-af2f54d13fff'
WHERE branch_id IS NULL;

-- 9. Assign branch_id to cash_registers that don't have one
UPDATE public.cash_registers
SET branch_id = '2b808200-040d-40c2-972e-af2f54d13fff'
WHERE branch_id IS NULL;

-- 10. Assign branch_id to visual_exams that don't have one
UPDATE public.visual_exams
SET branch_id = '2b808200-040d-40c2-972e-af2f54d13fff'
WHERE branch_id IS NULL;

-- 11. Assign branch_id to patient_prescriptions that don't have one
UPDATE public.patient_prescriptions
SET branch_id = '2b808200-040d-40c2-972e-af2f54d13fff'
WHERE branch_id IS NULL;

-- 12. RLS policies for patients table (branch-scoped)
-- Drop existing SELECT policy if it exists and recreate with branch filter
DO $$
BEGIN
  -- Drop existing policies that don't filter by branch
  DROP POLICY IF EXISTS "Users can view patients" ON public.patients;
  DROP POLICY IF EXISTS "Authenticated users can view patients" ON public.patients;
  DROP POLICY IF EXISTS "Authenticated users can view active patients" ON public.patients;
  DROP POLICY IF EXISTS "Users can view active patients" ON public.patients;
  DROP POLICY IF EXISTS "patients_select_policy" ON public.patients;
END $$;

CREATE POLICY "patients_branch_select"
ON public.patients FOR SELECT TO authenticated
USING (
  public.is_super_admin()
  OR branch_id = public.current_user_branch_id()
  OR branch_id IS NULL
);

-- Drop existing INSERT policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can create patients" ON public.patients;
  DROP POLICY IF EXISTS "Authenticated users can create patients" ON public.patients;
  DROP POLICY IF EXISTS "patients_insert_policy" ON public.patients;
END $$;

CREATE POLICY "patients_branch_insert"
ON public.patients FOR INSERT TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR branch_id = public.current_user_branch_id()
);

-- Drop existing UPDATE policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can update patients" ON public.patients;
  DROP POLICY IF EXISTS "Authenticated users can update patients" ON public.patients;
  DROP POLICY IF EXISTS "patients_update_policy" ON public.patients;
END $$;

CREATE POLICY "patients_branch_update"
ON public.patients FOR UPDATE TO authenticated
USING (
  public.is_super_admin()
  OR branch_id = public.current_user_branch_id()
  OR branch_id IS NULL
);

-- 13. RLS policies for sales table (branch-scoped)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view sales" ON public.sales;
  DROP POLICY IF EXISTS "Authenticated users can view sales" ON public.sales;
  DROP POLICY IF EXISTS "sales_select_policy" ON public.sales;
END $$;

CREATE POLICY "sales_branch_select"
ON public.sales FOR SELECT TO authenticated
USING (
  public.is_super_admin()
  OR branch_id = public.current_user_branch_id()
  OR branch_id IS NULL
);

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can create sales" ON public.sales;
  DROP POLICY IF EXISTS "Authenticated users can create sales" ON public.sales;
  DROP POLICY IF EXISTS "sales_insert_policy" ON public.sales;
END $$;

CREATE POLICY "sales_branch_insert"
ON public.sales FOR INSERT TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR branch_id = public.current_user_branch_id()
);

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can update sales" ON public.sales;
  DROP POLICY IF EXISTS "Authenticated users can update sales" ON public.sales;
  DROP POLICY IF EXISTS "sales_update_policy" ON public.sales;
END $$;

CREATE POLICY "sales_branch_update"
ON public.sales FOR UPDATE TO authenticated
USING (
  public.is_super_admin()
  OR branch_id = public.current_user_branch_id()
  OR branch_id IS NULL
);

-- 14. RLS policies for lab_orders (branch-scoped)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can view lab orders" ON public.lab_orders;
  DROP POLICY IF EXISTS "lab_orders_select_policy" ON public.lab_orders;
END $$;

CREATE POLICY "lab_orders_branch_select"
ON public.lab_orders FOR SELECT TO authenticated
USING (
  public.is_super_admin()
  OR branch_id = public.current_user_branch_id()
  OR branch_id IS NULL
);

DO $$
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can create lab orders" ON public.lab_orders;
  DROP POLICY IF EXISTS "lab_orders_insert_policy" ON public.lab_orders;
END $$;

CREATE POLICY "lab_orders_branch_insert"
ON public.lab_orders FOR INSERT TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR branch_id = public.current_user_branch_id()
);

-- 15. RLS policies for appointments (branch-scoped)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can view appointments" ON public.appointments;
  DROP POLICY IF EXISTS "appointments_select_policy" ON public.appointments;
END $$;

CREATE POLICY "appointments_branch_select"
ON public.appointments FOR SELECT TO authenticated
USING (
  public.is_super_admin()
  OR branch_id = public.current_user_branch_id()
  OR branch_id IS NULL
);

DO $$
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can create appointments" ON public.appointments;
  DROP POLICY IF EXISTS "appointments_insert_policy" ON public.appointments;
END $$;

CREATE POLICY "appointments_branch_insert"
ON public.appointments FOR INSERT TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR branch_id = public.current_user_branch_id()
);

-- 16. RLS policies for cash_registers (branch-scoped)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can view cash registers" ON public.cash_registers;
  DROP POLICY IF EXISTS "cash_registers_select_policy" ON public.cash_registers;
END $$;

CREATE POLICY "cash_registers_branch_select"
ON public.cash_registers FOR SELECT TO authenticated
USING (
  public.is_super_admin()
  OR branch_id = public.current_user_branch_id()
  OR branch_id IS NULL
);
