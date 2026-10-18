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
    and owner = (select auth.uid())::text
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
    and owner = (select auth.uid())::text
    and exists (
      select 1
      from public.projects
      where projects.id::text = (storage.foldername(name))[1]
        and projects.client_id = (select auth.uid())
    )
  );
