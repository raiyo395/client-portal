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
