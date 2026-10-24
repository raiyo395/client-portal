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
