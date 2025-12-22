-- ============================================
-- MIGRATION: Replace Head of Programs with Administrator
-- This script updates all references from head_of_programs to administrator
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Update role values in profiles table
UPDATE public.profiles 
SET role = 'administrator' 
WHERE role = 'head_of_programs';

-- 2. Update comments to reflect new role name
COMMENT ON COLUMN public.profiles.role IS 
  'User role: instructor, senior_instructor, pc, amo, institution_manager, registration, records, administrator';

-- 3. Update RLS Policies - Profiles

-- Replace "Head of Programs can view all profiles"
DROP POLICY IF EXISTS "Head of Programs can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Administrator can view all profiles" ON public.profiles;

CREATE POLICY "Administrator can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'administrator'
  );

-- Replace "Head of Programs can update any profile"
DROP POLICY IF EXISTS "Head of Programs can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Administrator can update any profile" ON public.profiles;

CREATE POLICY "Administrator can update any profile"
  ON public.profiles FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'administrator'
  );

-- Replace "Head of Programs can delete any user"
DROP POLICY IF EXISTS "Head of Programs can delete any user" ON public.profiles;
DROP POLICY IF EXISTS "Administrator can delete any user" ON public.profiles;

CREATE POLICY "Administrator can delete any user"
  ON public.profiles FOR DELETE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'administrator' AND
    id != auth.uid()
  );

-- 4. Update RLS Policies - Submissions

-- Replace "Head of Programs can view all submissions"
DROP POLICY IF EXISTS "Head of Programs can view all submissions" ON public.submissions;
DROP POLICY IF EXISTS "Administrator can view all submissions" ON public.submissions;

CREATE POLICY "Administrator can view all submissions"
  ON public.submissions FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'administrator'
  );

-- Replace "Head of Programs can update any submission"
DROP POLICY IF EXISTS "Head of Programs can update any submission" ON public.submissions;
DROP POLICY IF EXISTS "Administrator can update any submission" ON public.submissions;

CREATE POLICY "Administrator can update any submission"
  ON public.submissions FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'administrator'
  );

-- 5. Update RLS Policies - Audit Logs

DROP POLICY IF EXISTS "Head of Programs can view all audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Administrator can view all audit logs" ON public.audit_logs;

CREATE POLICY "Administrator can view all audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'administrator'
  );

-- 6. Update Functions

-- Update delete_user_completely function
CREATE OR REPLACE FUNCTION delete_user_completely(
  user_id uuid
)
RETURNS void AS $$
DECLARE
  current_user_role text;
  current_user_institution institution_type;
  target_user_institution institution_type;
  target_user_role text;
BEGIN
  SELECT role, institution INTO current_user_role, current_user_institution
  FROM public.profiles
  WHERE id = auth.uid();
  
  SELECT institution, role INTO target_user_institution, target_user_role
  FROM public.profiles
  WHERE id = user_id;
  
  -- Check permissions
  IF current_user_role = 'administrator' THEN
    -- Administrator can delete anyone except themselves
    IF user_id = auth.uid() THEN
      RAISE EXCEPTION 'Cannot delete your own account';
    END IF;
  ELSIF current_user_role = 'institution_manager' THEN
    -- Institution Manager can only delete users from same institution
    IF target_user_institution != current_user_institution THEN
      RAISE EXCEPTION 'Institution Managers can only remove users from their own institution';
    END IF;
    IF user_id = auth.uid() THEN
      RAISE EXCEPTION 'Cannot delete your own account';
    END IF;
    -- Institution Manager cannot delete Administrator
    IF target_user_role = 'administrator' THEN
      RAISE EXCEPTION 'Institution Managers cannot remove Administrator accounts';
    END IF;
  ELSE
    RAISE EXCEPTION 'Only Institution Managers and Administrators can remove users';
  END IF;
  
  DELETE FROM auth.users WHERE id = user_id;
  DELETE FROM public.profiles WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION delete_user_completely IS 
  'Safely deletes a user and all related data. IM can delete users from same institution, Administrator can delete anyone.';

-- Update can_act_as_secondary_approver function
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
  
  -- Administrator and IM can approve both stages
  IF user_role IN ('administrator', 'institution_manager') THEN
    RETURN true;
  END IF;
  
  -- Senior instructors can only approve PC stage
  IF user_role = 'senior_instructor' AND review_stage = 'pc' THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update im_removable_users view
CREATE OR REPLACE VIEW im_removable_users AS
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.institution,
  p.approval_status,
  p.created_at,
  CASE 
    WHEN p.role = 'administrator' THEN false
    WHEN p.id = auth.uid() THEN false
    ELSE true
  END as can_remove
FROM public.profiles p
WHERE 
  (
    (
      p.institution = (SELECT institution FROM public.profiles WHERE id = auth.uid()) AND
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'institution_manager'
    ) OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'administrator'
  )
  AND p.id != auth.uid()
ORDER BY p.institution, p.full_name;

COMMENT ON VIEW im_removable_users IS 
  'Shows users that can be removed by the current Institution Manager or Administrator';

-- Update secondary_approver_capabilities view
CREATE OR REPLACE VIEW secondary_approver_capabilities AS
SELECT 
  id,
  full_name,
  email,
  role,
  CASE 
    WHEN role IN ('administrator', 'institution_manager') THEN ARRAY['pc', 'amo']
    WHEN role = 'senior_instructor' THEN ARRAY['pc']
    ELSE ARRAY[]::text[]
  END as can_approve_stages
FROM public.profiles
WHERE role IN ('senior_instructor', 'institution_manager', 'administrator');

COMMENT ON VIEW secondary_approver_capabilities IS 
  'Shows which users can act as secondary approvers and for which stages';

-- Update prevent_unauthorized_role_escalation function
CREATE OR REPLACE FUNCTION prevent_unauthorized_role_escalation()
RETURNS TRIGGER AS $$
DECLARE
  current_user_role text;
BEGIN
  SELECT role INTO current_user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- If Institution Manager is trying to assign Administrator role
  IF current_user_role = 'institution_manager' AND NEW.role = 'administrator' THEN
    RAISE EXCEPTION 'Institution Managers cannot assign the Administrator role';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update log_review_action function to handle administrator role
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
  
  IF reviewer_profile.role IN ('senior_instructor', 'institution_manager', 'administrator') THEN
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

-- 7. Update reviews policies to include administrator

DROP POLICY IF EXISTS "Users can view reviews from same institution" ON public.reviews;

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
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('administrator', 'records', 'institution_manager')
      )
    ) OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'administrator'
  );

DROP POLICY IF EXISTS "Reviewers can create reviews for same institution" ON public.reviews;

CREATE POLICY "Reviewers can create reviews for same institution"
  ON public.reviews FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id AND
    (
      submission_id IN (
        SELECT id FROM public.submissions 
        WHERE institution = (SELECT institution FROM public.profiles WHERE id = auth.uid())
      ) OR
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'administrator'
    ) AND
    (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('pc', 'amo') OR
      (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('senior_instructor', 'institution_manager', 'administrator') AND
        reviewer_role = 'pc'
      ) OR
      (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('institution_manager', 'administrator') AND
        reviewer_role = 'amo'
      )
    )
  );

DROP POLICY IF EXISTS "Reviewers can update their reviews in same institution" ON public.reviews;

CREATE POLICY "Reviewers can update their reviews in same institution"
  ON public.reviews FOR UPDATE
  USING (
    auth.uid() = reviewer_id AND
    (
      submission_id IN (
        SELECT id FROM public.submissions 
        WHERE institution = (SELECT institution FROM public.profiles WHERE id = auth.uid())
      ) OR
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'administrator'
    )
  );

-- 8. Update submission documents policies

DROP POLICY IF EXISTS "Users can view documents from same institution" ON public.submission_documents;

CREATE POLICY "Users can view documents from same institution"
  ON public.submission_documents FOR SELECT
  USING (
    submission_id IN (
      SELECT id FROM public.submissions 
      WHERE institution = (SELECT institution FROM public.profiles WHERE id = auth.uid())
      AND (
        auth.uid() = instructor_id OR
        auth.uid() = current_reviewer_id OR
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('administrator', 'records', 'pc', 'amo', 'institution_manager', 'senior_instructor')
      )
    ) OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'administrator'
  );

-- 9. Update submissions view policy

DROP POLICY IF EXISTS "Users can view submissions from same institution" ON public.submissions;

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

-- 10. Update archived submissions policies

DROP POLICY IF EXISTS "Users can view archived submissions from same institution" ON public.archived_submissions;

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
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'administrator'
  );

-- 11. Update any audit log entries that reference head_of_programs

UPDATE public.audit_logs
SET details = jsonb_set(
  details,
  '{changed_by_role}',
  '"administrator"'
)
WHERE details->>'changed_by_role' = 'head_of_programs';

UPDATE public.audit_logs
SET details = jsonb_set(
  details,
  '{reviewer_role}',
  '"administrator"'
)
WHERE details->>'reviewer_role' = 'head_of_programs';

UPDATE public.audit_logs
SET details = jsonb_set(
  details,
  '{old_role}',
  '"administrator"'
)
WHERE details->>'old_role' = 'head_of_programs';

UPDATE public.audit_logs
SET details = jsonb_set(
  details,
  '{new_role}',
  '"administrator"'
)
WHERE details->>'new_role' = 'head_of_programs';

-- 12. Add helpful comment
COMMENT ON TABLE public.profiles IS 
  'User profiles with role-based access control. Administrator role has system-wide access across all institutions.';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify no head_of_programs roles remain
SELECT 'Profiles updated' as status, COUNT(*) as remaining_old_roles
FROM public.profiles 
WHERE role = 'head_of_programs';

-- Verify administrator roles exist
SELECT 'Administrator roles created' as status, COUNT(*) as admin_count
FROM public.profiles 
WHERE role = 'administrator';

-- Verify policies were created
SELECT 'Policies verified' as status, COUNT(*) as policy_count
FROM pg_policies 
WHERE policyname LIKE '%Administrator%';

-- Show all current roles
SELECT role, COUNT(*) as count
FROM public.profiles
GROUP BY role
ORDER BY role;