-- Update reviews table to support secondary approvers
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS review_type text DEFAULT 'primary'; -- 'primary' or 'secondary'

-- Update audit logs table to include more details
ALTER TABLE public.audit_logs
ADD COLUMN IF NOT EXISTS reviewer_name text,
ADD COLUMN IF NOT EXISTS previous_status text,
ADD COLUMN IF NOT EXISTS new_status text;

-- Create index for better performance on audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON public.audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_submission_id ON public.audit_logs(submission_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);

-- Update RLS policies for IM and Admin roles
DROP POLICY IF EXISTS "Admins and records can view audit logs" ON public.audit_logs;

CREATE POLICY "Admins, records, and IM can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'records', 'im')
  );

-- Update reviews policy to allow IM and Admin as secondary approvers
DROP POLICY IF EXISTS "Reviewers can create and update reviews" ON public.reviews;

CREATE POLICY "Reviewers and secondary approvers can create reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id AND
    (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('pc', 'amo', 'im', 'admin')
    )
  );

-- Update submissions view policy for IM and Admin
DROP POLICY IF EXISTS "Users can view their own submissions" ON public.submissions;

CREATE POLICY "Users can view accessible submissions"
  ON public.submissions FOR SELECT
  USING (
    auth.uid() = instructor_id OR
    auth.uid() = current_reviewer_id OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'records', 'im', 'amo', 'pc')
  );

-- Update submissions update policy for IM and Admin
DROP POLICY IF EXISTS "Users can update own submissions or admins" ON public.submissions;

CREATE POLICY "Authorized users can update submissions"
  ON public.submissions FOR UPDATE
  USING (
    auth.uid() = instructor_id OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'pc', 'amo', 'im')
  );

-- Function to log review actions with detailed information
CREATE OR REPLACE FUNCTION log_review_action()
RETURNS TRIGGER AS $$
DECLARE
  reviewer_profile RECORD;
  submission_info RECORD;
BEGIN
  -- Get reviewer profile
  SELECT full_name, role INTO reviewer_profile
  FROM public.profiles
  WHERE id = NEW.reviewer_id;
  
  -- Get submission info
  SELECT submission_id, title, status INTO submission_info
  FROM public.submissions
  WHERE id = NEW.submission_id;
  
  -- Insert detailed audit log
  INSERT INTO public.audit_logs (
    user_id,
    action,
    action_type,
    submission_id,
    reviewer_name,
    details
  )
  VALUES (
    NEW.reviewer_id,
    CASE 
      WHEN NEW.review_type = 'secondary' THEN
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
      'review_type', NEW.review_type,
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

-- Create trigger for review logging
DROP TRIGGER IF EXISTS log_review_actions ON public.reviews;
CREATE TRIGGER log_review_actions
  AFTER INSERT OR UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION log_review_action();

-- Function to create comprehensive submission change logs
CREATE OR REPLACE FUNCTION public.log_submission_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_profile RECORD;
BEGIN
  -- Get user profile
  SELECT full_name, role INTO user_profile
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
        'instructor_name', NEW.instructor_name
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
          'changed_by_role', user_profile.role
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS log_submissions ON public.submissions;
CREATE TRIGGER log_submissions
  AFTER INSERT OR UPDATE ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_submission_changes();

-- Add comment to explain secondary approvers
COMMENT ON COLUMN public.reviews.review_type IS 'Type of review: primary (PC/AMO) or secondary (IM/Admin when primary unavailable)';