-- 008_admin_approval_system.sql
-- Updates for Head of Programs admin and approval system

-- 1. Add approval status to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS rejected_reason text;

-- 2. Create index for approval queries
CREATE INDEX IF NOT EXISTS idx_profiles_approval_status ON public.profiles(approval_status);

-- 3. Update role comment to reflect new names
COMMENT ON COLUMN public.profiles.role IS 'User role: instructor, senior_instructor, pc, amo, institution_manager (formerly im), records, head_of_programs (formerly admin)';

-- 4. Create function to migrate existing roles
CREATE OR REPLACE FUNCTION migrate_role_names()
RETURNS void AS $$
BEGIN
  -- Update IM to institution_manager
  UPDATE public.profiles 
  SET role = 'institution_manager' 
  WHERE role = 'im';
  
  -- Update admin to head_of_programs
  UPDATE public.profiles 
  SET role = 'head_of_programs' 
  WHERE role = 'admin';
  
  -- Auto-approve existing users
  UPDATE public.profiles 
  SET approval_status = 'approved',
      approved_at = now()
  WHERE approval_status = 'pending';
END;
$$ LANGUAGE plpgsql;

-- Run the migration
SELECT migrate_role_names();

-- 5. Update RLS policies for Head of Programs (cross-institution access)

-- Profiles: Head of Programs can view ALL profiles across institutions
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles from same institution" ON public.profiles;

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

-- Update profile policy for role changes and approvals
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "IM and Admin can update profiles from same institution" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Head of Programs can update any profile"
  ON public.profiles FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'head_of_programs'
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'head_of_programs'
  );

CREATE POLICY "Institution managers can update profiles from same institution"
  ON public.profiles FOR UPDATE
  USING (
    institution = (SELECT institution FROM public.profiles WHERE id = auth.uid()) AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'institution_manager'
  )
  WITH CHECK (
    institution = (SELECT institution FROM public.profiles WHERE id = auth.uid()) AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'institution_manager'
  );

-- 6. Update submissions policies for Head of Programs

DROP POLICY IF EXISTS "Users can view submissions from same institution" ON public.submissions;

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

-- Head of Programs can update any submission
DROP POLICY IF EXISTS "Authorized users can update submissions from same institution" ON public.submissions;

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

-- 7. Update audit logs for Head of Programs
DROP POLICY IF EXISTS "Admins can view audit logs from same institution" ON public.audit_logs;

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

-- 8. Update reviews policies for new role names
DROP POLICY IF EXISTS "Reviewers can create reviews for same institution" ON public.reviews;

CREATE POLICY "Reviewers can create reviews for same institution"
  ON public.reviews FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id AND
    submission_id IN (
      SELECT id FROM public.submissions 
      WHERE institution = (SELECT institution FROM public.profiles WHERE id = auth.uid())
        OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'head_of_programs'
    ) AND
    (
      -- Primary reviewers
      (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('pc', 'amo') OR
      -- Secondary approvers for PC: senior instructors, institution_manager, head_of_programs
      (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('senior_instructor', 'institution_manager', 'head_of_programs') AND
        reviewer_role = 'pc'
      ) OR
      -- Secondary approvers for AMO: institution_manager, head_of_programs
      (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('institution_manager', 'head_of_programs') AND
        reviewer_role = 'amo'
      )
    )
  );

-- 9. Create function to approve user signup
CREATE OR REPLACE FUNCTION approve_user_signup(
  user_id uuid,
  approver_id uuid
)
RETURNS void AS $$
DECLARE
  approver_role text;
BEGIN
  -- Check if approver is Head of Programs
  SELECT role INTO approver_role
  FROM public.profiles
  WHERE id = approver_id;
  
  IF approver_role != 'head_of_programs' THEN
    RAISE EXCEPTION 'Only Head of Programs can approve signups';
  END IF;
  
  -- Approve the user
  UPDATE public.profiles
  SET approval_status = 'approved',
      approved_by = approver_id,
      approved_at = now()
  WHERE id = user_id;
  
  -- Log the approval
  INSERT INTO public.audit_logs (
    user_id,
    action,
    action_type,
    details
  )
  VALUES (
    approver_id,
    'Approved user signup',
    'user_approved',
    jsonb_build_object(
      'approved_user_id', user_id,
      'approver_id', approver_id
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create function to reject user signup
CREATE OR REPLACE FUNCTION reject_user_signup(
  user_id uuid,
  approver_id uuid,
  reason text
)
RETURNS void AS $$
DECLARE
  approver_role text;
BEGIN
  -- Check if approver is Head of Programs
  SELECT role INTO approver_role
  FROM public.profiles
  WHERE id = approver_id;
  
  IF approver_role != 'head_of_programs' THEN
    RAISE EXCEPTION 'Only Head of Programs can reject signups';
  END IF;
  
  -- Reject the user
  UPDATE public.profiles
  SET approval_status = 'rejected',
      rejected_reason = reason,
      approved_by = approver_id,
      approved_at = now()
  WHERE id = user_id;
  
  -- Log the rejection
  INSERT INTO public.audit_logs (
    user_id,
    action,
    action_type,
    details
  )
  VALUES (
    approver_id,
    'Rejected user signup',
    'user_rejected',
    jsonb_build_object(
      'rejected_user_id', user_id,
      'approver_id', approver_id,
      'reason', reason
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create function to remove/kick user
CREATE OR REPLACE FUNCTION remove_user(
  user_id uuid,
  remover_id uuid,
  reason text
)
RETURNS void AS $$
DECLARE
  remover_role text;
BEGIN
  -- Check if remover is Head of Programs
  SELECT role INTO remover_role
  FROM public.profiles
  WHERE id = remover_id;
  
  IF remover_role != 'head_of_programs' THEN
    RAISE EXCEPTION 'Only Head of Programs can remove users';
  END IF;
  
  -- Log the removal before deleting
  INSERT INTO public.audit_logs (
    user_id,
    action,
    action_type,
    details
  )
  VALUES (
    remover_id,
    'Removed user from system',
    'user_removed',
    jsonb_build_object(
      'removed_user_id', user_id,
      'remover_id', remover_id,
      'reason', reason
    )
  );
  
  -- Delete the user from auth.users (cascade will handle profiles)
  DELETE FROM auth.users WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Update profile creation to require approval for instructors
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
    'instructor', -- Force new signups to instructor role
    (new.raw_user_meta_data ->> 'institution')::institution_type,
    'pending' -- All new users start as pending
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- 13. Create view for pending approvals
CREATE OR REPLACE VIEW pending_user_approvals AS
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.institution,
  p.created_at,
  EXTRACT(DAY FROM (now() - p.created_at)) as days_pending
FROM public.profiles p
WHERE p.approval_status = 'pending'
ORDER BY p.created_at DESC;

COMMENT ON VIEW pending_user_approvals IS 'List of users awaiting approval by Head of Programs';

-- 14. Create view for all users (Head of Programs dashboard)
CREATE OR REPLACE VIEW all_users_overview AS
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.institution,
  p.approval_status,
  p.created_at,
  p.approved_at,
  approver.full_name as approved_by_name,
  COUNT(DISTINCT s.id) as submission_count
FROM public.profiles p
LEFT JOIN public.profiles approver ON p.approved_by = approver.id
LEFT JOIN public.submissions s ON s.instructor_id = p.id
GROUP BY p.id, p.email, p.full_name, p.role, p.institution, 
         p.approval_status, p.created_at, p.approved_at, approver.full_name
ORDER BY p.created_at DESC;

COMMENT ON VIEW all_users_overview IS 'Overview of all users for Head of Programs';

-- 15. Add constraint to prevent unapproved users from creating submissions
ALTER TABLE public.submissions
ADD CONSTRAINT check_instructor_approved 
CHECK (
  instructor_id IN (
    SELECT id FROM public.profiles 
    WHERE approval_status = 'approved'
  )
);

-- 16. Update can_act_as_secondary_approver function for new role names
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
  
  -- Head of Programs and Institution Manager can approve both stages
  IF user_role IN ('head_of_programs', 'institution_manager') THEN
    RETURN true;
  END IF;
  
  -- Senior instructors can only approve PC stage
  IF user_role = 'senior_instructor' AND review_stage = 'pc' THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17. Create notification for new user signups
CREATE OR REPLACE FUNCTION notify_head_of_programs_new_signup()
RETURNS trigger AS $$
DECLARE
  hop_user RECORD;
BEGIN
  -- Get all Head of Programs users
  FOR hop_user IN 
    SELECT id FROM public.profiles WHERE role = 'head_of_programs'
  LOOP
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      read
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

-- 18. Add RLS policy for notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE public.profiles IS 'User profiles with approval workflow. New signups require Head of Programs approval.';