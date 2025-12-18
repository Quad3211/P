-- 007_add_institution_support.sql
-- Add institution support to the database

-- Create institutions enum type
CREATE TYPE institution_type AS ENUM ('Boys Town', 'Stony Hill', 'Leap');

-- Add institution column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS institution institution_type;

-- Make institution required for new users
ALTER TABLE public.profiles
ALTER COLUMN institution SET NOT NULL;

-- Add institution to submissions table
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS institution institution_type;

-- Make institution required for submissions
ALTER TABLE public.submissions
ALTER COLUMN institution SET NOT NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_institution ON public.profiles(institution);
CREATE INDEX IF NOT EXISTS idx_submissions_institution ON public.submissions(institution);

-- Update the profile creation trigger to include institution
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, institution)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.email),
    COALESCE(new.raw_user_meta_data ->> 'role', 'instructor'),
    (new.raw_user_meta_data ->> 'institution')::institution_type
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- Update RLS policies to include institution filtering

-- Profiles: Users can only view profiles from their institution
DROP POLICY IF EXISTS "Admin and IM can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users on own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can view profiles from same institution"
  ON public.profiles FOR SELECT
  USING (
    institution = (SELECT institution FROM public.profiles WHERE id = auth.uid()) AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'im', 'pc', 'amo', 'records')
  );

-- Update profile policy for role changes
DROP POLICY IF EXISTS "Users can update own profile or admins can update any" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "IM and Admin can update profiles from same institution"
  ON public.profiles FOR UPDATE
  USING (
    institution = (SELECT institution FROM public.profiles WHERE id = auth.uid()) AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'im')
  )
  WITH CHECK (
    institution = (SELECT institution FROM public.profiles WHERE id = auth.uid()) AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'im')
  );

-- Submissions: Users can only view submissions from their institution
DROP POLICY IF EXISTS "Users can view accessible submissions" ON public.submissions;

CREATE POLICY "Users can view submissions from same institution"
  ON public.submissions FOR SELECT
  USING (
    institution = (SELECT institution FROM public.profiles WHERE id = auth.uid()) AND
    (
      auth.uid() = instructor_id OR
      auth.uid() = current_reviewer_id OR
      (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'records', 'im', 'amo', 'pc', 'senior_instructor')
    )
  );

-- Instructors can only create submissions for their institution
DROP POLICY IF EXISTS "Instructors can create submissions" ON public.submissions;

CREATE POLICY "Instructors can create submissions for their institution"
  ON public.submissions FOR INSERT
  WITH CHECK (
    auth.uid() = instructor_id AND
    institution = (SELECT institution FROM public.profiles WHERE id = auth.uid()) AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('instructor', 'senior_instructor')
  );

-- Update submissions update policy
DROP POLICY IF EXISTS "Authorized users can update submissions" ON public.submissions;

CREATE POLICY "Authorized users can update submissions from same institution"
  ON public.submissions FOR UPDATE
  USING (
    institution = (SELECT institution FROM public.profiles WHERE id = auth.uid()) AND
    (
      auth.uid() = instructor_id OR
      (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'pc', 'amo', 'im', 'senior_instructor')
    )
  );

-- Submission Documents: Must be from same institution
DROP POLICY IF EXISTS "Users can view documents of submissions they can access" ON public.submission_documents;

CREATE POLICY "Users can view documents from same institution"
  ON public.submission_documents FOR SELECT
  USING (
    submission_id IN (
      SELECT id FROM public.submissions 
      WHERE institution = (SELECT institution FROM public.profiles WHERE id = auth.uid())
      AND (
        auth.uid() = instructor_id OR
        auth.uid() = current_reviewer_id OR
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'records', 'pc', 'amo', 'im', 'senior_instructor')
      )
    )
  );

DROP POLICY IF EXISTS "Users can upload documents to their own submissions" ON public.submission_documents;

CREATE POLICY "Users can upload documents to own submissions in same institution"
  ON public.submission_documents FOR INSERT
  WITH CHECK (
    submission_id IN (
      SELECT id FROM public.submissions 
      WHERE auth.uid() = instructor_id 
      AND institution = (SELECT institution FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Reviews: Must be from same institution
DROP POLICY IF EXISTS "Users can view reviews" ON public.reviews;

CREATE POLICY "Users can view reviews from same institution"
  ON public.reviews FOR SELECT
  USING (
    reviewer_id = auth.uid() OR
    submission_id IN (
      SELECT id FROM public.submissions 
      WHERE institution = (SELECT institution FROM public.profiles WHERE id = auth.uid())
      AND (
        auth.uid() = instructor_id OR 
        auth.uid() = current_reviewer_id OR
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'records', 'im')
      )
    )
  );

DROP POLICY IF EXISTS "Reviewers and secondary approvers can create reviews" ON public.reviews;

CREATE POLICY "Reviewers can create reviews for same institution"
  ON public.reviews FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id AND
    submission_id IN (
      SELECT id FROM public.submissions 
      WHERE institution = (SELECT institution FROM public.profiles WHERE id = auth.uid())
    ) AND
    (
      -- Primary reviewers
      (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('pc', 'amo') OR
      -- Secondary approvers for PC: senior instructors, IM, admin
      (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('senior_instructor', 'im', 'admin') AND
        reviewer_role = 'pc'
      ) OR
      -- Secondary approvers for AMO: IM, admin
      (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('im', 'admin') AND
        reviewer_role = 'amo'
      )
    )
  );

DROP POLICY IF EXISTS "Reviewers can update their own reviews" ON public.reviews;

CREATE POLICY "Reviewers can update their reviews in same institution"
  ON public.reviews FOR UPDATE
  USING (
    auth.uid() = reviewer_id AND
    submission_id IN (
      SELECT id FROM public.submissions 
      WHERE institution = (SELECT institution FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Archived Submissions: Must be from same institution
DROP POLICY IF EXISTS "Users can view archived submissions" ON public.archived_submissions;

CREATE POLICY "Users can view archived submissions from same institution"
  ON public.archived_submissions FOR SELECT
  USING (
    submission_id IN (
      SELECT id FROM public.submissions 
      WHERE institution = (SELECT institution FROM public.profiles WHERE id = auth.uid())
    ) AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'records')
  );

DROP POLICY IF EXISTS "Only records can archive" ON public.archived_submissions;

CREATE POLICY "Records can archive submissions from same institution"
  ON public.archived_submissions FOR INSERT
  WITH CHECK (
    submission_id IN (
      SELECT id FROM public.submissions 
      WHERE institution = (SELECT institution FROM public.profiles WHERE id = auth.uid())
    ) AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'records'
  );

-- Audit Logs: Must be from same institution
DROP POLICY IF EXISTS "Admins, records, and IM can view audit logs" ON public.audit_logs;

CREATE POLICY "Admins can view audit logs from same institution"
  ON public.audit_logs FOR SELECT
  USING (
    (
      submission_id IS NULL OR
      submission_id IN (
        SELECT id FROM public.submissions 
        WHERE institution = (SELECT institution FROM public.profiles WHERE id = auth.uid())
      )
    ) AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'records', 'im')
  );

-- Create helper function to get user's institution
CREATE OR REPLACE FUNCTION get_user_institution(user_id uuid)
RETURNS institution_type AS $$
DECLARE
  user_institution institution_type;
BEGIN
  SELECT institution INTO user_institution
  FROM public.profiles
  WHERE id = user_id;
  
  RETURN user_institution;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for institution statistics
CREATE OR REPLACE VIEW institution_stats AS
SELECT 
  institution,
  COUNT(*) FILTER (WHERE role = 'instructor') as instructor_count,
  COUNT(*) FILTER (WHERE role = 'senior_instructor') as senior_instructor_count,
  COUNT(*) FILTER (WHERE role = 'pc') as pc_count,
  COUNT(*) FILTER (WHERE role = 'amo') as amo_count,
  COUNT(*) FILTER (WHERE role = 'im') as im_count,
  COUNT(*) FILTER (WHERE role = 'records') as records_count,
  COUNT(*) FILTER (WHERE role = 'admin') as admin_count,
  COUNT(*) as total_users
FROM public.profiles
GROUP BY institution;

COMMENT ON VIEW institution_stats IS 'Statistics about users per institution';

-- Add institution to submission audit logs
CREATE OR REPLACE FUNCTION public.log_submission_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_profile RECORD;
BEGIN
  -- Get user profile
  SELECT full_name, role, institution INTO user_profile
  FROM public.profiles
  WHERE id = auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      user_id, 
      action, 
      action_type, 
      submission_id, 
      reviewer_name,
      details
    )
    VALUES (
      auth.uid(), 
      'Created submission: ' || NEW.title, 
      'created', 
      NEW.id, 
      user_profile.full_name,
      jsonb_build_object(
        'submission_id', NEW.submission_id,
        'title', NEW.title,
        'skill_area', NEW.skill_area,
        'cohort', NEW.cohort,
        'instructor_name', NEW.instructor_name,
        'institution', NEW.institution
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status != OLD.status THEN
      INSERT INTO public.audit_logs (
        user_id, 
        action, 
        action_type, 
        submission_id, 
        reviewer_name,
        previous_status,
        new_status,
        details
      )
      VALUES (
        auth.uid(), 
        'Status changed from ' || OLD.status || ' to ' || NEW.status, 
        NEW.status, 
        NEW.id, 
        user_profile.full_name,
        OLD.status,
        NEW.status,
        jsonb_build_object(
          'submission_id', NEW.submission_id,
          'title', NEW.title,
          'old_status', OLD.status,
          'new_status', NEW.status,
          'changed_by', user_profile.full_name,
          'changed_by_role', user_profile.role,
          'institution', NEW.institution
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON COLUMN public.profiles.institution IS 'Institution: Boys Town, Stony Hill, or Leap';
COMMENT ON COLUMN public.submissions.institution IS 'Institution where submission was created';