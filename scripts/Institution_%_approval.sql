-- COMPLETE DATABASE SETUP SCRIPT
-- Run this as a single migration to set up the entire database

-- ============================================
-- 1. CREATE TABLES
-- ============================================

-- Create institution type
DO $$ BEGIN
  CREATE TYPE institution_type AS ENUM ('Boys Town', 'Stony Hill', 'Leap');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  full_name text,
  role text NOT NULL DEFAULT 'instructor', -- instructor, senior_instructor, pc, amo, institution_manager, records, head_of_programs
  institution institution_type NOT NULL,
  approval_status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamp with time zone,
  rejected_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create submissions table
CREATE TABLE IF NOT EXISTS public.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id text NOT NULL UNIQUE,
  title text NOT NULL,
  skill_area text NOT NULL,
  skill_code text,
  cluster text NOT NULL,
  cohort text NOT NULL,
  test_date date NOT NULL,
  instructor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  instructor_email text NOT NULL,
  instructor_name text NOT NULL,
  institution institution_type NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  current_reviewer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  submitted_at timestamp with time zone
);

-- Create submission documents table
CREATE TABLE IF NOT EXISTS public.submission_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  file_type text,
  version integer NOT NULL DEFAULT 1,
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  uploaded_at timestamp with time zone DEFAULT now()
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewer_role text NOT NULL,
  review_type text DEFAULT 'primary',
  status text NOT NULL DEFAULT 'pending',
  comments text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  reviewed_at timestamp with time zone,
  UNIQUE(submission_id, reviewer_role)
);

-- Create archived submissions table
CREATE TABLE IF NOT EXISTS public.archived_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  file_format text NOT NULL DEFAULT 'original',
  retention_until date,
  archive_notes text,
  archived_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  archived_at timestamp with time zone DEFAULT now()
);

-- Create audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  action_type text NOT NULL,
  submission_id uuid REFERENCES public.submissions(id) ON DELETE CASCADE,
  reviewer_name text,
  previous_status text,
  new_status text,
  details jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  submission_id text,
  read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- ============================================
-- 2. CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_institution ON public.profiles(institution);
CREATE INDEX IF NOT EXISTS idx_profiles_approval_status ON public.profiles(approval_status);
CREATE INDEX IF NOT EXISTS idx_submissions_institution ON public.submissions(institution);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_instructor_id ON public.submissions(instructor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON public.audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_submission_id ON public.audit_logs(submission_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

-- ============================================
-- 3. ENABLE RLS
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archived_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. RLS POLICIES - PROFILES
-- ============================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Head of Programs can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Institution managers can view profiles from same institution" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Head of Programs can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Institution managers can update profiles from same institution" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for auth users" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Head of Programs can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'head_of_programs'
  );

CREATE POLICY "Institution managers can view profiles from same institution"
  ON public.profiles FOR SELECT
  USING (
    institution = (SELECT institution FROM public.profiles WHERE id = auth.uid()) AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('institution_manager', 'pc', 'amo', 'records')
  );

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Head of Programs can update any profile"
  ON public.profiles FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'head_of_programs'
  );

CREATE POLICY "Institution managers can update profiles from same institution"
  ON public.profiles FOR UPDATE
  USING (
    institution = (SELECT institution FROM public.profiles WHERE id = auth.uid()) AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'institution_manager'
  );

CREATE POLICY "Enable insert for auth users"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- 5. RLS POLICIES - SUBMISSIONS
-- ============================================

DROP POLICY IF EXISTS "Head of Programs can view all submissions" ON public.submissions;
DROP POLICY IF EXISTS "Users can view submissions from same institution" ON public.submissions;
DROP POLICY IF EXISTS "Instructors can create submissions for their institution" ON public.submissions;
DROP POLICY IF EXISTS "Head of Programs can update any submission" ON public.submissions;
DROP POLICY IF EXISTS "Authorized users can update submissions from same institution" ON public.submissions;

CREATE POLICY "Head of Programs can view all submissions"
  ON public.submissions FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'head_of_programs'
  );

CREATE POLICY "Users can view submissions from same institution"
  ON public.submissions FOR SELECT
  USING (
    institution = (SELECT institution FROM public.profiles WHERE id = auth.uid()) AND
    (
      auth.uid() = instructor_id OR
      auth.uid() = current_reviewer_id OR
      (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('institution_manager', 'records', 'amo', 'pc', 'senior_instructor')
    )
  );

CREATE POLICY "Instructors can create submissions for their institution"
  ON public.submissions FOR INSERT
  WITH CHECK (
    auth.uid() = instructor_id AND
    institution = (SELECT institution FROM public.profiles WHERE id = auth.uid()) AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('instructor', 'senior_instructor') AND
    (SELECT approval_status FROM public.profiles WHERE id = auth.uid()) = 'approved'
  );

CREATE POLICY "Head of Programs can update any submission"
  ON public.submissions FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'head_of_programs'
  );

CREATE POLICY "Authorized users can update submissions from same institution"
  ON public.submissions FOR UPDATE
  USING (
    institution = (SELECT institution FROM public.profiles WHERE id = auth.uid()) AND
    (
      auth.uid() = instructor_id OR
      (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('pc', 'amo', 'institution_manager', 'senior_instructor')
    )
  );

-- ============================================
-- 6. RLS POLICIES - OTHER TABLES
-- ============================================

-- Submission Documents
DROP POLICY IF EXISTS "Users can view documents from same institution" ON public.submission_documents;
DROP POLICY IF EXISTS "Users can upload documents to own submissions in same institution" ON public.submission_documents;

CREATE POLICY "Users can view documents from same institution"
  ON public.submission_documents FOR SELECT
  USING (
    submission_id IN (
      SELECT id FROM public.submissions 
      WHERE institution = (SELECT institution FROM public.profiles WHERE id = auth.uid())
      AND (
        auth.uid() = instructor_id OR
        auth.uid() = current_reviewer_id OR
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('head_of_programs', 'records', 'pc', 'amo', 'institution_manager', 'senior_instructor')
      )
    ) OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'head_of_programs'
  );

CREATE POLICY "Users can upload documents to own submissions in same institution"
  ON public.submission_documents FOR INSERT
  WITH CHECK (
    submission_id IN (
      SELECT id FROM public.submissions 
      WHERE auth.uid() = instructor_id 
      AND institution = (SELECT institution FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Reviews
DROP POLICY IF EXISTS "Users can view reviews from same institution" ON public.reviews;
DROP POLICY IF EXISTS "Reviewers can create reviews for same institution" ON public.reviews;
DROP POLICY IF EXISTS "Reviewers can update their reviews in same institution" ON public.reviews;

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
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('head_of_programs', 'records', 'institution_manager')
      )
    ) OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'head_of_programs'
  );

CREATE POLICY "Reviewers can create reviews for same institution"
  ON public.reviews FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id AND
    (
      submission_id IN (
        SELECT id FROM public.submissions 
        WHERE institution = (SELECT institution FROM public.profiles WHERE id = auth.uid())
      ) OR
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'head_of_programs'
    ) AND
    (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('pc', 'amo') OR
      (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('senior_instructor', 'institution_manager', 'head_of_programs') AND
        reviewer_role = 'pc'
      ) OR
      (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('institution_manager', 'head_of_programs') AND
        reviewer_role = 'amo'
      )
    )
  );

CREATE POLICY "Reviewers can update their reviews in same institution"
  ON public.reviews FOR UPDATE
  USING (
    auth.uid() = reviewer_id AND
    (
      submission_id IN (
        SELECT id FROM public.submissions 
        WHERE institution = (SELECT institution FROM public.profiles WHERE id = auth.uid())
      ) OR
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'head_of_programs'
    )
  );

-- Notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Audit Logs
DROP POLICY IF EXISTS "Head of Programs can view all audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Institution managers can view audit logs from same institution" ON public.audit_logs;
DROP POLICY IF EXISTS "Only system can insert audit logs" ON public.audit_logs;

CREATE POLICY "Head of Programs can view all audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'head_of_programs'
  );

CREATE POLICY "Institution managers can view audit logs from same institution"
  ON public.audit_logs FOR SELECT
  USING (
    (
      submission_id IS NULL OR
      submission_id IN (
        SELECT id FROM public.submissions 
        WHERE institution = (SELECT institution FROM public.profiles WHERE id = auth.uid())
      )
    ) AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('institution_manager', 'records')
  );

CREATE POLICY "Only system can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Archived Submissions
DROP POLICY IF EXISTS "Users can view archived submissions from same institution" ON public.archived_submissions;
DROP POLICY IF EXISTS "Records can archive submissions from same institution" ON public.archived_submissions;

CREATE POLICY "Users can view archived submissions from same institution"
  ON public.archived_submissions FOR SELECT
  USING (
    (
      submission_id IN (
        SELECT id FROM public.submissions 
        WHERE institution = (SELECT institution FROM public.profiles WHERE id = auth.uid())
      ) AND
      (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('records', 'institution_manager')
    ) OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'head_of_programs'
  );

CREATE POLICY "Records can archive submissions from same institution"
  ON public.archived_submissions FOR INSERT
  WITH CHECK (
    submission_id IN (
      SELECT id FROM public.submissions 
      WHERE institution = (SELECT institution FROM public.profiles WHERE id = auth.uid())
    ) AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'records'
  );

-- ============================================
-- 7. TRIGGERS & FUNCTIONS
-- ============================================

-- Profile creation trigger
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
    'pending'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Submission timestamp trigger
CREATE OR REPLACE FUNCTION public.update_submission_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS update_submission_updated_at ON public.submissions;
CREATE TRIGGER update_submission_updated_at
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_submission_timestamp();

-- Submission changes logging
CREATE OR REPLACE FUNCTION public.log_submission_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_profile RECORD;
BEGIN
  SELECT full_name, role, institution INTO user_profile
  FROM public.profiles
  WHERE id = auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      user_id, action, action_type, submission_id, reviewer_name, details
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
        user_id, action, action_type, submission_id, reviewer_name,
        previous_status, new_status, details
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

DROP TRIGGER IF EXISTS log_submissions ON public.submissions;
CREATE TRIGGER log_submissions
  AFTER INSERT OR UPDATE ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_submission_changes();

-- Review logging
CREATE OR REPLACE FUNCTION log_review_action()
RETURNS TRIGGER AS $$
DECLARE
  reviewer_profile RECORD;
  submission_info RECORD;
  approval_type text;
BEGIN
  SELECT full_name, role INTO reviewer_profile
  FROM public.profiles
  WHERE id = NEW.reviewer_id;
  
  SELECT submission_id, title, status INTO submission_info
  FROM public.submissions
  WHERE id = NEW.submission_id;
  
  IF reviewer_profile.role IN ('senior_instructor', 'institution_manager', 'head_of_programs') THEN
    approval_type := 'secondary';
  ELSE
    approval_type := 'primary';
  END IF;
  
  INSERT INTO public.audit_logs (
    user_id, action, action_type, submission_id, reviewer_name, details
  )
  VALUES (
    NEW.reviewer_id,
    CASE 
      WHEN approval_type = 'secondary' THEN
        'Secondary review (' || reviewer_profile.role || '): ' || NEW.status || ' submission'
      ELSE
        NEW.reviewer_role || ' review: ' || NEW.status || ' submission'
    END,
    NEW.status,
    NEW.submission_id,
    reviewer_profile.full_name,
    jsonb_build_object(
      'reviewer_name', reviewer_profile.full_name,
      'reviewer_role', reviewer_profile.role,
      'review_type', approval_type,
      'review_stage', NEW.reviewer_role,
      'review_status', NEW.status,
      'comments', NEW.comments,
      'submission_title', submission_info.title,
      'submission_id', submission_info.submission_id,
      'submission_status', submission_info.status
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS log_review_actions ON public.reviews;
CREATE TRIGGER log_review_actions
  AFTER INSERT OR UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION log_review_action();

-- Role change logging
CREATE OR REPLACE FUNCTION log_role_changes()
RETURNS TRIGGER AS $$
DECLARE
  admin_profile RECORD;
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    SELECT full_name, role INTO admin_profile
    FROM public.profiles
    WHERE id = auth.uid();
    
    INSERT INTO public.audit_logs (
      user_id, action, action_type, reviewer_name, details
    )
    VALUES (
      auth.uid(),
      'Changed user role from ' || OLD.role || ' to ' || NEW.role,
      'role_change',
      admin_profile.full_name,
      jsonb_build_object(
        'target_user_id', NEW.id,
        'target_user_name', NEW.full_name,
        'target_user_email', NEW.email,
        'old_role', OLD.role,
        'new_role', NEW.role,
        'changed_by', admin_profile.full_name,
        'changed_by_role', admin_profile.role
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS log_role_changes_trigger ON public.profiles;
CREATE TRIGGER log_role_changes_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION log_role_changes();

-- New signup notification
CREATE OR REPLACE FUNCTION notify_head_of_programs_new_signup()
RETURNS trigger AS $$
DECLARE
  hop_user RECORD;
BEGIN
  FOR hop_user IN 
    SELECT id FROM public.profiles WHERE role = 'head_of_programs'
  LOOP
    INSERT INTO public.notifications (
      user_id, type, title, message, read
    )
    VALUES (
      hop_user.id,
      'user_signup',
      'New User Registration',
      NEW.full_name || ' (' || NEW.email || ') from ' || NEW.institution || ' has signed up and is awaiting approval.',
      false
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_new_signup ON public.profiles;
CREATE TRIGGER notify_new_signup
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.approval_status = 'pending')
  EXECUTE FUNCTION notify_head_of_programs_new_signup();

-- Storage bucket setup
INSERT INTO storage.buckets (id, name, public)
VALUES ('submissions', 'submissions', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload submission documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can read submission documents" ON storage.objects;

CREATE POLICY "Users can upload submission documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'submissions');

CREATE POLICY "Users can read submission documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'submissions');