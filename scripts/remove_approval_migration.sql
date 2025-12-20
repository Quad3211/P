-- Migration: Remove approval requirement for new users
-- Run this SQL in your Supabase SQL editor

-- 1. Update the profiles table to set default approval_status to 'approved'
ALTER TABLE public.profiles 
  ALTER COLUMN approval_status SET DEFAULT 'approved';

-- 2. Update the handle_new_user function to auto-approve new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, institution, approval_status)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.email),
    'instructor',
    (new.raw_user_meta_data ->> 'institution')::institution_type,
    'approved' -- Changed from 'pending' to 'approved'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- 3. Remove the trigger that notifies Head of Programs about new signups
DROP TRIGGER IF EXISTS notify_new_signup ON public.profiles;
DROP FUNCTION IF EXISTS notify_head_of_programs_new_signup();

-- 4. Optional: Auto-approve all existing pending users
-- Uncomment the following line if you want to approve all pending users
-- UPDATE public.profiles SET approval_status = 'approved' WHERE approval_status = 'pending';

-- 5. Remove RLS policies that restrict unapproved users from creating submissions
DROP POLICY IF EXISTS "Instructors can create submissions for their institution" ON public.submissions;

CREATE POLICY "Instructors can create submissions for their institution"
  ON public.submissions FOR INSERT
  WITH CHECK (
    auth.uid() = instructor_id AND
    institution = (SELECT institution FROM public.profiles WHERE id = auth.uid()) AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('instructor', 'senior_instructor')
    -- Removed the approval_status check
  );

-- 6. Add a comment to document the change
COMMENT ON COLUMN public.profiles.approval_status IS 
  'User approval status - now defaults to approved for automatic access. Values: pending, approved, rejected (legacy fields kept for historical data)';