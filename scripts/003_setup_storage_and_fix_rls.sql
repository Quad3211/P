-- Create the submissions storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('submissions', 'submissions', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on the bucket
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- Create policy for users to upload their own documents
CREATE POLICY "Users can upload submission documents"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'submissions'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create policy for users to read submission documents they have access to
CREATE POLICY "Users can read submission documents"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'submissions'
  );

-- Fix profiles RLS to remove infinite recursion
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Simple RLS policies without recursion
CREATE POLICY "Enable read access for authenticated users on own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Enable update access for authenticated users on own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable insert for auth users"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);
