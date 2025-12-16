-- 005_senior_instructor_role.sql
-- Add senior instructor role and update permissions

-- Update the role comment to include senior_instructor
COMMENT ON COLUMN public.profiles.role IS 'User role: instructor, senior_instructor, pc, amo, im, registration, records, admin';

-- Update RLS policy for viewing all profiles to include IM
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;

CREATE POLICY "Admin and IM can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'im', 'records')
  );

-- Allow Admin and IM to update user roles
DROP POLICY IF EXISTS "Enable update access for authenticated users on own profile" ON public.profiles;

CREATE POLICY "Users can update own profile or admins can update any"
  ON public.profiles FOR UPDATE
  USING (
    auth.uid() = id OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'im')
  )
  WITH CHECK (
    auth.uid() = id OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'im')
  );

-- Update reviews policy to allow senior instructors as secondary approvers for PC
DROP POLICY IF EXISTS "Reviewers and secondary approvers can create reviews" ON public.reviews;

CREATE POLICY "Reviewers and secondary approvers can create reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id AND
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

-- Update submissions view policy to include senior instructors
DROP POLICY IF EXISTS "Users can view accessible submissions" ON public.submissions;

CREATE POLICY "Users can view accessible submissions"
  ON public.submissions FOR SELECT
  USING (
    auth.uid() = instructor_id OR
    auth.uid() = current_reviewer_id OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'records', 'im', 'amo', 'pc', 'senior_instructor')
  );

-- Update submissions update policy to include senior instructors for secondary approval
DROP POLICY IF EXISTS "Authorized users can update submissions" ON public.submissions;

CREATE POLICY "Authorized users can update submissions"
  ON public.submissions FOR UPDATE
  USING (
    auth.uid() = instructor_id OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'pc', 'amo', 'im', 'senior_instructor')
  );

-- Add index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Create a function to check if a user can act as secondary approver
CREATE OR REPLACE FUNCTION can_act_as_secondary_approver(
  user_id uuid,
  review_stage text
)
RETURNS boolean AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = user_id;
  
  -- Admin and IM can approve both stages
  IF user_role IN ('admin', 'im') THEN
    RETURN true;
  END IF;
  
  -- Senior instructors can only approve PC stage
  IF user_role = 'senior_instructor' AND review_stage = 'pc' THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the review logging function to track senior instructor approvals
CREATE OR REPLACE FUNCTION log_review_action()
RETURNS TRIGGER AS $$
DECLARE
  reviewer_profile RECORD;
  submission_info RECORD;
  approval_type text;
BEGIN
  -- Get reviewer profile
  SELECT full_name, role INTO reviewer_profile
  FROM public.profiles
  WHERE id = NEW.reviewer_id;
  
  -- Get submission info
  SELECT submission_id, title, status INTO submission_info
  FROM public.submissions
  WHERE id = NEW.submission_id;
  
  -- Determine approval type
  IF reviewer_profile.role IN ('senior_instructor', 'im', 'admin') THEN
    approval_type := 'secondary';
  ELSE
    approval_type := 'primary';
  END IF;
  
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

-- Add audit log for role changes
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
      user_id,
      action,
      action_type,
      reviewer_name,
      details
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

-- Add helpful view for secondary approvers
CREATE OR REPLACE VIEW secondary_approver_capabilities AS
SELECT 
  id,
  full_name,
  email,
  role,
  CASE 
    WHEN role IN ('admin', 'im') THEN ARRAY['pc', 'amo']
    WHEN role = 'senior_instructor' THEN ARRAY['pc']
    ELSE ARRAY[]::text[]
  END as can_approve_stages
FROM public.profiles
WHERE role IN ('senior_instructor', 'im', 'admin');

COMMENT ON VIEW secondary_approver_capabilities IS 'Shows which users can act as secondary approvers and for which stages';