-- Trigger to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    coalesce(new.raw_user_meta_data ->> 'role', 'instructor')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Trigger to update submission timestamps
create or replace function public.update_submission_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_submission_updated_at on public.submissions;
create trigger update_submission_updated_at
  before update on public.submissions
  for each row
  execute function public.update_submission_timestamp();

-- Trigger to log all submission changes
create or replace function public.log_submission_changes()
returns trigger
language plpgsql
security definer
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (user_id, action, action_type, submission_id, details)
    values (auth.uid(), 'Created submission', 'submitted', new.id, to_jsonb(new));
  elsif tg_op = 'UPDATE' then
    if new.status != old.status then
      insert into public.audit_logs (user_id, action, action_type, submission_id, details)
      values (auth.uid(), 'Updated status to ' || new.status, new.status, new.id, 
        jsonb_build_object('old_status', old.status, 'new_status', new.status));
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists log_submissions on public.submissions;
create trigger log_submissions
  after insert or update on public.submissions
  for each row
  execute function public.log_submission_changes();
