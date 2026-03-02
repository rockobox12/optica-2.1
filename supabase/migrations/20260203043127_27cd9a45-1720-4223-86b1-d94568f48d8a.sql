-- Add additional fields to profiles for doctors/optometrists
ALTER TABLE public.profiles
ADD COLUMN phone TEXT,
ADD COLUMN address TEXT,
ADD COLUMN birth_date DATE,
ADD COLUMN professional_license TEXT,
ADD COLUMN username TEXT UNIQUE;

-- Create index for username lookups
CREATE INDEX idx_profiles_username ON public.profiles(username);

-- Create index for birth_date to check birthdays efficiently
CREATE INDEX idx_profiles_birth_date ON public.profiles(birth_date);

-- Create function to check if today is user's birthday
CREATE OR REPLACE FUNCTION public.is_birthday(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND birth_date IS NOT NULL
      AND EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(DAY FROM birth_date) = EXTRACT(DAY FROM CURRENT_DATE)
  )
$$;

-- Create function to get users with birthday today
CREATE OR REPLACE FUNCTION public.get_birthday_users()
RETURNS TABLE(
  user_id UUID,
  full_name TEXT,
  phone TEXT,
  birth_date DATE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name, p.phone, p.birth_date
  FROM public.profiles p
  WHERE p.birth_date IS NOT NULL
    AND p.is_active = true
    AND EXTRACT(MONTH FROM p.birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(DAY FROM p.birth_date) = EXTRACT(DAY FROM CURRENT_DATE)
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.is_birthday TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_birthday_users TO authenticated;

-- Update RLS to allow admins to update any profile
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete profiles (for deactivation, though we prefer is_active flag)
CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));