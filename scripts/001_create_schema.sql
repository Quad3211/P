-- Create users/profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null default 'instructor', -- instructor, pc, amo, im, registration, records, admin
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create submissions table
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  submission_id text not null unique, -- RFA-2024-XXXXX
  title text not null,
  skill_area text not null,
  cohort text not null,
  test_date date not null,
  instructor_id uuid not null references public.profiles(id) on delete cascade,
  instructor_email text not null,
  instructor_name text not null,
  description text,
  status text not null default 'draft', -- draft, submitted, pc_review, amo_review, approved, rejected, archived
  current_reviewer_id uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  submitted_at timestamp with time zone
);

-- Create submission documents table
create table if not exists public.submission_documents (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_size integer,
  file_type text,
  version integer not null default 1,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  uploaded_at timestamp with time zone default now()
);

-- Create reviews table
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewer_role text not null, -- pc, amo
  status text not null default 'pending', -- pending, approved, rejected, reassigned
  comments text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  reviewed_at timestamp with time zone,
  unique(submission_id, reviewer_role)
);

-- Create archived submissions table
create table if not exists public.archived_submissions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  file_format text not null default 'original', -- original, pdf
  retention_until date,
  archive_notes text,
  archived_by uuid not null references public.profiles(id) on delete cascade,
  archived_at timestamp with time zone default now()
);

-- Create audit logs table
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  action_type text not null, -- submitted, approved, rejected, archived, etc.
  submission_id uuid references public.submissions(id) on delete cascade,
  details jsonb,
  created_at timestamp with time zone default now()
);

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_documents enable row level security;
alter table public.reviews enable row level security;
alter table public.archived_submissions enable row level security;
alter table public.audit_logs enable row level security;

-- RLS Policies for profiles
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admin can view all profiles"
  on public.profiles for select
  using (
    (select role from public.profiles where id = auth.uid()) in ('admin', 'records')
  );

-- RLS Policies for submissions
create policy "Users can view their own submissions"
  on public.submissions for select
  using (
    auth.uid() = instructor_id or
    auth.uid() = current_reviewer_id or
    (select role from public.profiles where id = auth.uid()) in ('admin', 'records')
  );

create policy "Instructors can create submissions"
  on public.submissions for insert
  with check (
    auth.uid() = instructor_id and
    (select role from public.profiles where id = auth.uid()) = 'instructor'
  );

create policy "Users can update own submissions or admins"
  on public.submissions for update
  using (
    auth.uid() = instructor_id or
    (select role from public.profiles where id = auth.uid()) in ('admin', 'pc', 'amo')
  );

-- RLS Policies for submission documents
create policy "Users can view documents of submissions they can access"
  on public.submission_documents for select
  using (
    submission_id in (
      select id from public.submissions where
        auth.uid() = instructor_id or
        auth.uid() = current_reviewer_id or
        (select role from public.profiles where id = auth.uid()) in ('admin', 'records')
    )
  );

create policy "Users can upload documents to their own submissions"
  on public.submission_documents for insert
  with check (
    submission_id in (
      select id from public.submissions where auth.uid() = instructor_id
    )
  );

-- RLS Policies for reviews
create policy "Users can view reviews"
  on public.reviews for select
  using (
    reviewer_id = auth.uid() or
    submission_id in (
      select id from public.submissions where auth.uid() = instructor_id or auth.uid() = current_reviewer_id
    ) or
    (select role from public.profiles where id = auth.uid()) in ('admin', 'records')
  );

create policy "Reviewers can create and update reviews"
  on public.reviews for insert
  with check (
    auth.uid() = reviewer_id
  );

create policy "Reviewers can update their own reviews"
  on public.reviews for update
  using (
    auth.uid() = reviewer_id
  );

-- RLS Policies for archived submissions
create policy "Users can view archived submissions"
  on public.archived_submissions for select
  using (
    (select role from public.profiles where id = auth.uid()) in ('admin', 'records')
  );

create policy "Only records can archive"
  on public.archived_submissions for insert
  with check (
    (select role from public.profiles where id = auth.uid()) = 'records'
  );

-- RLS Policies for audit logs
create policy "Admins and records can view audit logs"
  on public.audit_logs for select
  using (
    (select role from public.profiles where id = auth.uid()) in ('admin', 'records')
  );

create policy "Only system can insert audit logs"
  on public.audit_logs for insert
  with check (
    auth.uid() is not null
  );
