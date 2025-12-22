-- 008_registration_role_complete.sql
-- Complete implementation of Registration role with read-only access

-- ============================================
-- 1. UPDATE ROLE COMMENT
-- ============================================
COMMENT ON COLUMN public.profiles.role IS 
  'User role: instructor, senior_instructor, pc, amo, institution_manager, registration, records, administrator, head_of_programs';

-- ============================================
-- 2. ADD REGISTRATION TO VIEWING POLICIES
-- ============================================

-- Allow registration to view all profiles (read-only)
DROP POLICY IF EXISTS "Registration can view all profiles" ON public.profiles;
CREATE POLICY "Registration can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'registration'
  );

-- Allow registration to view all submissions (read-only)
DROP POLICY IF EXISTS "Registration can view all submissions" ON public.submissions;
CREATE POLICY "Registration can view all submissions"
  ON public.submissions FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'registration'
  );

-- Allow registration to view all submission documents (read-only)
DROP POLICY IF EXISTS "Registration can view all documents" ON public.submission_documents;
CREATE POLICY "Registration can view all documents"
  ON public.submission_documents FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'registration'
  );

-- Allow registration to view all reviews (read-only)
DROP POLICY IF EXISTS "Registration can view all reviews" ON public.reviews;
CREATE POLICY "Registration can view all reviews"
  ON public.reviews FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'registration'
  );

-- Allow registration to view audit logs (read-only)
DROP POLICY IF EXISTS "Registration can view audit logs" ON public.audit_logs;
CREATE POLICY "Registration can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'registration'
  );

-- ============================================
-- 3. CREATE VIEW FOR REGISTRATION STATISTICS
-- ============================================

CREATE OR REPLACE VIEW registration_statistics AS
SELECT 
  p.institution,
  p.role,
  COUNT(*) as user_count,
  COUNT(*) FILTER (WHERE p.approval_status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE p.approval_status = 'approved') as approved_count,
  COUNT(*) FILTER (WHERE p.approval_status = 'rejected') as rejected_count,
  COUNT(*) FILTER (WHERE p.created_at > NOW() - INTERVAL '30 days') as new_users_30_days,
  COUNT(*) FILTER (WHERE p.created_at > NOW() - INTERVAL '7 days') as new_users_7_days
FROM public.profiles p
GROUP BY p.institution, p.role
ORDER BY p.institution, p.role;

COMMENT ON VIEW registration_statistics IS 
  'Provides registration officers with statistical overview of users by institution and role';

-- Grant access to registration role
GRANT SELECT ON registration_statistics TO authenticated;

-- ============================================
-- 4. CREATE VIEW FOR SUBMISSION OVERVIEW
-- ============================================

CREATE OR REPLACE VIEW registration_submission_overview AS
SELECT 
  s.institution,
  s.status,
  COUNT(*) as submission_count,
  COUNT(DISTINCT s.instructor_id) as unique_instructors,
  MIN(s.created_at) as earliest_submission,
  MAX(s.created_at) as latest_submission,
  AVG(EXTRACT(EPOCH FROM (s.updated_at - s.created_at))/86400)::numeric(10,2) as avg_days_to_complete
FROM public.submissions s
GROUP BY s.institution, s.status
ORDER BY s.institution, s.status;

COMMENT ON VIEW registration_submission_overview IS 
  'Provides registration officers with submission statistics across institutions';

-- Grant access to registration role
GRANT SELECT ON registration_submission_overview TO authenticated;

-- ============================================
-- 5. CREATE FUNCTION TO GET USER ACTIVITY
-- ============================================

CREATE OR REPLACE FUNCTION get_user_activity_summary(
  target_institution institution_type DEFAULT NULL,
  days_back integer DEFAULT 30
)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  role text,
  institution institution_type,
  total_submissions bigint,
  pending_submissions bigint,
  approved_submissions bigint,
  last_activity timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.email,
    p.role,
    p.institution,
    COUNT(s.id) FILTER (WHERE s.created_at > NOW() - make_interval(days => days_back)),
    COUNT(s.id) FILTER (WHERE s.status IN ('submitted', 'pc_review', 'amo_review') AND s.created_at > NOW() - make_interval(days => days_back)),
    COUNT(s.id) FILTER (WHERE s.status IN ('approved', 'amo_approved', 'pc_approved') AND s.created_at > NOW() - make_interval(days => days_back)),
    MAX(GREATEST(s.created_at, s.updated_at))
  FROM public.profiles p
  LEFT JOIN public.submissions s ON p.id = s.instructor_id
  WHERE (target_institution IS NULL OR p.institution = target_institution)
    AND p.role IN ('instructor', 'senior_instructor')
  GROUP BY p.id, p.full_name, p.email, p.role, p.institution
  ORDER BY p.institution, p.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_activity_summary IS 
  'Returns activity summary for instructors, filtered by institution and time period';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_user_activity_summary TO authenticated;

-- ============================================
-- 6. CREATE AUDIT LOG FOR REGISTRATION ACCESS
-- ============================================

CREATE OR REPLACE FUNCTION log_registration_access()
RETURNS trigger AS $$
DECLARE
  user_profile RECORD;
BEGIN
  SELECT full_name, role INTO user_profile
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- Only log if user is registration role
  IF user_profile.role = 'registration' THEN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      action_type,
      reviewer_name,
      details
    )
    VALUES (
      auth.uid(),
      'Registration officer accessed ' || TG_TABLE_NAME || ' data',
      'registration_access',
      user_profile.full_name,
      jsonb_build_object(
        'table', TG_TABLE_NAME,
        'operation', TG_OP,
        'timestamp', NOW()
      )
    );
  END IF;
  
  RETURN NULL; -- After trigger, return value doesn't matter
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers for registration access (optional - can be heavy)
-- Uncomment if you want to track all registration access
-- DROP TRIGGER IF EXISTS audit_registration_profiles_access ON public.profiles;
-- CREATE TRIGGER audit_registration_profiles_access
--   AFTER SELECT ON public.profiles
--   FOR EACH STATEMENT
--   EXECUTE FUNCTION log_registration_access();

-- ============================================
-- 7. CREATE HELPER FUNCTIONS
-- ============================================

-- Function to check if user is registration role
CREATE OR REPLACE FUNCTION is_registration_role()
RETURNS boolean AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'registration';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_registration_role IS 
  'Returns true if current user has registration role';

-- Function to get registration dashboard stats
CREATE OR REPLACE FUNCTION get_registration_dashboard_stats()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM public.profiles),
    'total_submissions', (SELECT COUNT(*) FROM public.submissions),
    'pending_approvals', (SELECT COUNT(*) FROM public.profiles WHERE approval_status = 'pending'),
    'active_instructors', (SELECT COUNT(DISTINCT instructor_id) FROM public.submissions WHERE created_at > NOW() - INTERVAL '30 days'),
    'by_institution', (
      SELECT json_object_agg(
        institution,
        json_build_object(
          'total_users', user_count,
          'pending', pending_count,
          'approved', approved_count
        )
      )
      FROM (
        SELECT 
          institution,
          COUNT(*) as user_count,
          COUNT(*) FILTER (WHERE approval_status = 'pending') as pending_count,
          COUNT(*) FILTER (WHERE approval_status = 'approved') as approved_count
        FROM public.profiles
        GROUP BY institution
      ) stats
    ),
    'recent_signups', (
      SELECT json_agg(
        json_build_object(
          'id', id,
          'full_name', full_name,
          'email', email,
          'institution', institution,
          'created_at', created_at
        )
      )
      FROM (
        SELECT id, full_name, email, institution, created_at
        FROM public.profiles
        ORDER BY created_at DESC
        LIMIT 10
      ) recent
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_registration_dashboard_stats IS 
  'Returns comprehensive dashboard statistics for registration officers';

GRANT EXECUTE ON FUNCTION get_registration_dashboard_stats TO authenticated;

-- ============================================
-- 8. ADD INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_role_institution 
  ON public.profiles(role, institution);

CREATE INDEX IF NOT EXISTS idx_submissions_institution_status 
  ON public.submissions(institution, status);

-- ============================================
-- 9. FINAL SECURITY CHECK
-- ============================================

-- Ensure registration CANNOT modify any data
-- These policies explicitly deny INSERT, UPDATE, DELETE for registration role

-- Profiles - no modifications
CREATE POLICY "Registration cannot modify profiles"
  ON public.profiles FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) != 'registration'
  );

-- Submissions - no modifications
CREATE POLICY "Registration cannot modify submissions"
  ON public.submissions FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) != 'registration'
  );

CREATE POLICY "Registration cannot create submissions"
  ON public.submissions FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) != 'registration'
  );

-- Reviews - no modifications
CREATE POLICY "Registration cannot create reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) != 'registration'
  );

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these to verify the setup:
-- 
-- Check registration can view profiles:
-- SELECT * FROM profiles LIMIT 5;
--
-- Check registration stats view:
-- SELECT * FROM registration_statistics;
--
-- Check submission overview:
-- SELECT * FROM registration_submission_overview;
--
-- Get dashboard stats:
-- SELECT get_registration_dashboard_stats();
--
-- Get user activity:
-- SELECT * FROM get_user_activity_summary('Boys Town', 30);