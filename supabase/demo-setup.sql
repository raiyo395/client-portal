-- supabase/migrations/20261018000100_client_portal_schema_rls.sql
-- Client portal schema and row level security.
-- Safe to apply when these tables already exist with the columns below.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'client' check (role in ('admin', 'client')),
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete restrict,
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'paused', 'completed')),
  created_at timestamptz not null default now()
);

create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  sort_order integer not null default 0,
  status text not null default 'pending' check (status in ('pending', 'in_review', 'approved', 'changes_requested')),
  created_at timestamptz not null default now()
);

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.milestones (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  decision text not null check (decision in ('approved', 'changes_requested')),
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists projects_client_id_idx on public.projects (client_id);
create index if not exists milestones_project_id_idx on public.milestones (project_id);
create index if not exists approvals_milestone_id_idx on public.approvals (milestone_id);
create index if not exists approvals_author_id_idx on public.approvals (author_id);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    'client'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.create_profile_for_new_user() from public;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

create or replace function public.prevent_own_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) = old.id and new.role is distinct from old.role then
    raise exception 'Users cannot change their own role.' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_own_role_change() from public;
drop trigger if exists profiles_prevent_own_role_change on public.profiles;
create trigger profiles_prevent_own_role_change
  before update of role on public.profiles
  for each row execute function public.prevent_own_role_change();

create or replace function public.validate_approval_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  milestone_status text;
begin
  select status into milestone_status
  from public.milestones
  where id = new.milestone_id
  for update;

  if not found then
    raise exception 'Milestone does not exist.' using errcode = '23503';
  end if;
  if milestone_status <> 'in_review' then
    raise exception 'A decision can only be recorded for a milestone in review.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function public.apply_approval_decision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.milestones
  set status = new.decision
  where id = new.milestone_id;
  return new;
end;
$$;

revoke all on function public.validate_approval_insert() from public;
revoke all on function public.apply_approval_decision() from public;
drop trigger if exists approvals_validate_insert on public.approvals;
create trigger approvals_validate_insert
  before insert on public.approvals
  for each row execute function public.validate_approval_insert();
drop trigger if exists approvals_apply_decision on public.approvals;
create trigger approvals_apply_decision
  after insert on public.approvals
  for each row execute function public.apply_approval_decision();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.milestones enable row level security;
alter table public.approvals enable row level security;

drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists profiles_insert_admin on public.profiles;
create policy profiles_insert_admin on public.profiles
  for insert to authenticated
  with check ((select public.is_admin()));
drop policy if exists profiles_update_self_or_admin on public.profiles;
create policy profiles_update_self_or_admin on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists profiles_delete_admin on public.profiles;
create policy profiles_delete_admin on public.profiles
  for delete to authenticated
  using ((select public.is_admin()));

drop policy if exists projects_admin_all on public.projects;
create policy projects_admin_all on public.projects
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
drop policy if exists projects_client_select_own on public.projects;
create policy projects_client_select_own on public.projects
  for select to authenticated
  using (client_id = (select auth.uid()));

drop policy if exists milestones_admin_all on public.milestones;
create policy milestones_admin_all on public.milestones
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
drop policy if exists milestones_client_select_own_projects on public.milestones;
create policy milestones_client_select_own_projects on public.milestones
  for select to authenticated
  using (
    exists (
      select 1
      from public.projects
      where projects.id = milestones.project_id
        and projects.client_id = (select auth.uid())
    )
  );

drop policy if exists approvals_admin_all on public.approvals;
create policy approvals_admin_all on public.approvals
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
drop policy if exists approvals_client_select_own_projects on public.approvals;
create policy approvals_client_select_own_projects on public.approvals
  for select to authenticated
  using (
    exists (
      select 1
      from public.milestones
      join public.projects on projects.id = milestones.project_id
      where milestones.id = approvals.milestone_id
        and projects.client_id = (select auth.uid())
    )
  );
drop policy if exists approvals_client_insert_in_review on public.approvals;
create policy approvals_client_insert_in_review on public.approvals
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1
      from public.milestones
      join public.projects on projects.id = milestones.project_id
      where milestones.id = approvals.milestone_id
        and projects.client_id = (select auth.uid())
        and milestones.status = 'in_review'
    )
  );
-- supabase/migrations/20261018000200_project_files.sql
-- Private project file storage and metadata.

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  uploaded_by uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  file_name text not null,
  storage_path text not null unique,
  size_bytes bigint not null check (size_bytes > 0),
  mime_type text,
  created_at timestamptz default now()
);

create index if not exists project_files_project_id_idx on public.project_files (project_id);

alter table public.project_files enable row level security;

drop policy if exists project_files_admin_all on public.project_files;
create policy project_files_admin_all on public.project_files
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists project_files_client_select_own on public.project_files;
create policy project_files_client_select_own on public.project_files
  for select to authenticated
  using (
    exists (
      select 1
      from public.projects
      where projects.id = project_files.project_id
        and projects.client_id = (select auth.uid())
    )
  );

drop policy if exists project_files_client_insert_own on public.project_files;
create policy project_files_client_insert_own on public.project_files
  for insert to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and exists (
      select 1
      from public.projects
      where projects.id = project_files.project_id
        and projects.client_id = (select auth.uid())
    )
  );

drop policy if exists project_files_client_delete_own on public.project_files;
create policy project_files_client_delete_own on public.project_files
  for delete to authenticated
  using (
    uploaded_by = (select auth.uid())
    and exists (
      select 1
      from public.projects
      where projects.id = project_files.project_id
        and projects.client_id = (select auth.uid())
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-files',
  'project-files',
  false,
  10485760,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'text/plain'
  ]::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists project_files_storage_admin_all on storage.objects;
create policy project_files_storage_admin_all on storage.objects
  for all to authenticated
  using (
    bucket_id = 'project-files'
    and (select public.is_admin())
  )
  with check (
    bucket_id = 'project-files'
    and (select public.is_admin())
  );

drop policy if exists project_files_storage_client_select on storage.objects;
create policy project_files_storage_client_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'project-files'
    and exists (
      select 1
      from public.projects
      where projects.id::text = (storage.foldername(name))[1]
        and projects.client_id = (select auth.uid())
    )
  );

drop policy if exists project_files_storage_client_insert on storage.objects;
create policy project_files_storage_client_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'project-files'
    and owner_id = (select auth.uid())::text
    and exists (
      select 1
      from public.projects
      where projects.id::text = (storage.foldername(name))[1]
        and projects.client_id = (select auth.uid())
    )
  );

drop policy if exists project_files_storage_client_delete_own on storage.objects;
create policy project_files_storage_client_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'project-files'
    and owner_id = (select auth.uid())::text
    and exists (
      select 1
      from public.projects
      where projects.id::text = (storage.foldername(name))[1]
        and projects.client_id = (select auth.uid())
    )
  );
-- supabase/seed-demo.sql
-- Repeatable demo dataset for the separate demo Supabase project.
-- Apply after both migrations. Run public.reset_demo_data('demo-client@example.com')
-- with the configured demo client email to seed or reset the demo data.

create or replace function public.reset_demo_data(p_demo_client_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  demo_client_id uuid;
  brand_project_id uuid;
  website_project_id uuid;
  launch_project_id uuid;
  milestone_id uuid;
begin
  if nullif(btrim(p_demo_client_email), '') is null then
    raise exception 'A demo client email is required.' using errcode = '22023';
  end if;

  select profiles.id into demo_client_id
  from auth.users
  join public.profiles on profiles.id = auth.users.id
  where lower(auth.users.email) = lower(btrim(p_demo_client_email))
    and profiles.role = 'client';

  if demo_client_id is null then
    raise exception 'No client profile was found for demo email %.', p_demo_client_email using errcode = 'P0002';
  end if;

  -- Project deletion cascades to milestones, approvals, and project_files rows.
  -- Storage objects are removed by create-demo-users.ts before this function runs.
  delete from public.projects where name like 'Demo:%';

  insert into public.projects (client_id, name, description, status)
  values (demo_client_id, 'Demo: Brand refresh', 'A sample identity refresh for the fictional Northstar Studio.', 'active')
  returning id into brand_project_id;

  insert into public.projects (client_id, name, description, status)
  values (demo_client_id, 'Demo: Website redesign', 'A sample responsive website redesign with review checkpoints.', 'active')
  returning id into website_project_id;

  insert into public.projects (client_id, name, description, status)
  values (demo_client_id, 'Demo: Launch campaign', 'A sample launch plan for a fictional product release.', 'paused')
  returning id into launch_project_id;

  -- Decisions are inserted from in_review so the existing approval trigger
  -- applies the final approved / changes_requested milestone statuses.
  insert into public.milestones (project_id, title, description, due_date, sort_order, status)
  values (brand_project_id, 'Creative brief', 'Goals, audience, and visual direction.', current_date - 7, 1, 'in_review')
  returning id into milestone_id;
  insert into public.approvals (milestone_id, author_id, decision, comment)
  values (milestone_id, demo_client_id, 'approved', 'The direction looks clear. Please move ahead.');

  insert into public.milestones (project_id, title, description, due_date, sort_order, status)
  values (brand_project_id, 'Visual concepts', 'Review the initial identity concepts.', current_date + 5, 2, 'in_review');

  insert into public.milestones (project_id, title, description, due_date, sort_order, status)
  values (brand_project_id, 'Final brand kit', 'Prepare final logo and usage files.', current_date + 14, 3, 'pending');

  insert into public.milestones (project_id, title, description, due_date, sort_order, status)
  values (website_project_id, 'Page structure', 'Confirm the key pages and navigation.', current_date - 10, 1, 'in_review')
  returning id into milestone_id;
  insert into public.approvals (milestone_id, author_id, decision, comment)
  values (milestone_id, demo_client_id, 'approved', 'Approved. The page structure covers what we need.');

  insert into public.milestones (project_id, title, description, due_date, sort_order, status)
  values (website_project_id, 'Landing page draft', 'Review the first landing page layout.', current_date - 2, 2, 'in_review')
  returning id into milestone_id;
  insert into public.approvals (milestone_id, author_id, decision, comment)
  values (milestone_id, demo_client_id, 'changes_requested', 'Please make the call to action more prominent.');

  insert into public.milestones (project_id, title, description, due_date, sort_order, status)
  values (website_project_id, 'Responsive QA', 'Check the final pages at mobile and desktop widths.', current_date + 9, 3, 'pending');

  insert into public.milestones (project_id, title, description, due_date, sort_order, status)
  values (launch_project_id, 'Campaign outline', 'Agree on the launch message and channel plan.', current_date - 12, 1, 'in_review')
  returning id into milestone_id;
  insert into public.approvals (milestone_id, author_id, decision, comment)
  values (milestone_id, demo_client_id, 'approved', 'Looks good. The channel mix makes sense.');

  insert into public.milestones (project_id, title, description, due_date, sort_order, status)
  values (launch_project_id, 'Launch assets', 'Prepare final campaign copy and creative.', current_date + 3, 2, 'pending');

  insert into public.milestones (project_id, title, description, due_date, sort_order, status)
  values (launch_project_id, 'Release checklist', 'Review the final release checklist.', current_date + 7, 3, 'in_review')
  returning id into milestone_id;
  insert into public.approvals (milestone_id, author_id, decision, comment)
  values (milestone_id, demo_client_id, 'changes_requested', 'Please add the support contact to the final checklist.');

  -- These rows match the fixture objects uploaded by scripts/upload-demo-files.ts.
  insert into public.project_files (project_id, uploaded_by, file_name, storage_path, size_bytes, mime_type)
  values
    (brand_project_id, demo_client_id, 'demo-brand-brief.txt', brand_project_id::text || '/demo-brand-brief.txt', octet_length('Project brief: Refresh the brand identity and core digital assets.'), 'text/plain'),
    (launch_project_id, demo_client_id, 'demo-launch-checklist.txt', launch_project_id::text || '/demo-launch-checklist.txt', octet_length('Launch checklist: Final copy, accessible assets, and release sign-off.'), 'text/plain');
end;
$$;

revoke all on function public.reset_demo_data(text) from public, anon, authenticated;
grant execute on function public.reset_demo_data(text) to service_role;
