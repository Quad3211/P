-- ============================================
-- Migration: Enable Institution Managers to Remove Users
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Add RLS policy to allow IM to delete profiles from same institution
DROP POLICY IF EXISTS "Institution managers can delete users from same institution" ON public.profiles;

CREATE POLICY "Institution managers can delete users from same institution"
  ON public.profiles FOR DELETE
  USING (
    institution = (SELECT institution FROM public.profiles WHERE id = auth.uid()) AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'institution_manager' AND
    id != auth.uid() -- Cannot delete themselves
  );

-- 2. Add RLS policy to allow Head of Programs to delete any user
DROP POLICY IF EXISTS "Head of Programs can delete any user" ON public.profiles;

CREATE POLICY "Head of Programs can delete any user"
  ON public.profiles FOR DELETE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'head_of_programs' AND
    id != auth.uid() -- Cannot delete themselves
  );

-- 3. Create a function to safely delete a user and their related data
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
  -- Get current user's role and institution
  SELECT role, institution INTO current_user_role, current_user_institution
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- Get target user's institution and role
  SELECT institution, role INTO target_user_institution, target_user_role
  FROM public.profiles
  WHERE id = user_id;
  
  -- Check permissions
  IF current_user_role = 'head_of_programs' THEN
    -- Head of Programs can delete anyone except themselves
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
    -- Institution Manager cannot delete Head of Programs
    IF target_user_role = 'head_of_programs' THEN
      RAISE EXCEPTION 'Institution Managers cannot remove Head of Programs accounts';
    END IF;
  ELSE
    RAISE EXCEPTION 'Only Institution Managers and Head of Programs can remove users';
  END IF;
  
  -- Delete the user (cascade will handle related records)
  DELETE FROM auth.users WHERE id = user_id;
  DELETE FROM public.profiles WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION delete_user_completely IS 
  'Safely deletes a user and all related data. IM can delete users from same institution, Head of Programs can delete anyone.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION delete_user_completely TO authenticated;

-- 4. Update the audit log function to track deletions
CREATE OR REPLACE FUNCTION log_user_deletion()
RETURNS TRIGGER AS $$
DECLARE
  admin_profile RECORD;
BEGIN
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
    'Removed user from system: ' || OLD.full_name,
    'user_deleted',
    admin_profile.full_name,
    jsonb_build_object(
      'deleted_user_id', OLD.id,
      'deleted_user_name', OLD.full_name,
      'deleted_user_email', OLD.email,
      'deleted_user_role', OLD.role,
      'deleted_user_institution', OLD.institution,
      'deleted_by', admin_profile.full_name,
      'deleted_by_role', admin_profile.role
    )
  );
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS log_user_deletions ON public.profiles;
CREATE TRIGGER log_user_deletions
  BEFORE DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_user_deletion();

-- 5. Create a view for Institution Managers to see removable users
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
    WHEN p.role = 'head_of_programs' THEN false
    WHEN p.id = auth.uid() THEN false
    ELSE true
  END as can_remove
FROM public.profiles p
WHERE 
  (
    -- Institution Manager sees users from same institution
    (
      p.institution = (SELECT institution FROM public.profiles WHERE id = auth.uid()) AND
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'institution_manager'
    ) OR
    -- Head of Programs sees all users
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'head_of_programs'
  )
  AND p.id != auth.uid() -- Don't show themselves
ORDER BY p.institution, p.full_name;

COMMENT ON VIEW im_removable_users IS 
  'Shows users that can be removed by the current Institution Manager or Head of Programs';

GRANT SELECT ON im_removable_users TO authenticated;

-- 6. Additional safety check: Prevent IM from escalating to Head of Programs
CREATE OR REPLACE FUNCTION prevent_unauthorized_role_escalation()
RETURNS TRIGGER AS $$
DECLARE
  current_user_role text;
BEGIN
  SELECT role INTO current_user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- If Institution Manager is trying to assign Head of Programs role
  IF current_user_role = 'institution_manager' AND NEW.role = 'head_of_programs' THEN
    RAISE EXCEPTION 'Institution Managers cannot assign the Head of Programs role';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS check_role_escalation ON public.profiles;
CREATE TRIGGER check_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION prevent_unauthorized_role_escalation();

-- ============================================
-- VERIFICATION
-- ============================================

-- Test that the function exists
SELECT 'delete_user_completely function created' as status
WHERE EXISTS (
  SELECT 1 FROM pg_proc WHERE proname = 'delete_user_completely'
);

-- Test that the policies exist
SELECT 'RLS policies created' as status
WHERE EXISTS (
  SELECT 1 FROM pg_policies 
  WHERE policyname = 'Institution managers can delete users from same institution'
);

-- Test that the view exists
SELECT 'im_removable_users view created' as status
WHERE EXISTS (
  SELECT 1 FROM pg_views WHERE viewname = 'im_removable_users'
);