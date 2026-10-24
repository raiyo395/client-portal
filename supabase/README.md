# Supabase database setup

## Apply the migration

Open the SQL Editor in the Supabase project connected to this app, paste the contents of the migration file, and run it. Confirm that the project is the intended one before applying it. The migration expects the standard Supabase `auth` schema and an existing `auth.users` table. Review the target project and take a database backup before applying schema changes to a database that already contains data.

The migration creates profile rows for new sign-ups with the `client` role. It enables RLS on all four application tables and installs policies and triggers for admin access, client project access, approval insertion, role protection, and milestone decision updates.

## Promote a user to admin

As a project owner or trusted database operator, find the account under **Authentication → Users**, copy its UUID, and update that user's `role` to `admin` in **Table Editor → profiles**. Perform this as the database operator; the trigger intentionally prevents a signed-in user from changing their own role. Only promote trusted accounts.

## Set up the separate portfolio demo

Use a second Supabase project dedicated to the public demo. Do not point the demo deployment or reset workflow at a production project. Use fake data and demo-only accounts.

1. Create the demo Supabase project, then apply both migrations above in order. The file migration creates the private `project-files` bucket with a 10 MB size limit and an allowlist of supported MIME types.
2. Copy `.env.example` to `.env.local` and fill in the demo project's values. `DEMO_SERVICE_ROLE_KEY` is used only by local Node scripts; never expose it as a `VITE_` variable or put it in the deployed app's environment.
3. Run `npm run demo:users`. This creates or updates the demo admin and client through Supabase's Admin API, confirms their emails, resets both passwords from `DEMO_PASSWORD`, upserts their profile rows, and removes old demo Storage objects before a reset.
4. In the demo project's SQL Editor, run `supabase/seed-demo.sql` once to create the `reset_demo_data(text)` function. Then run the function with the exact demo client email:

   ```sql
   select public.reset_demo_data('demo-client@example.com');
   ```

   Replace the example with the value of `DEMO_CLIENT_EMAIL`. The function looks up that user's client profile and creates the three `Demo:` projects, milestone decisions, and file metadata. It is safe to rerun. Storage objects are cleaned by `npm run demo:users` before the SQL reset; run that script before manually calling the function again.
5. Run `npm run demo:files` to upload the small text fixtures referenced by the seeded file records.
6. In the GitHub repository, add these **Actions secrets** for the demo project only:
   - `DEMO_SUPABASE_URL`
   - `DEMO_SERVICE_ROLE_KEY`
   - `DEMO_PASSWORD`

   Add these **Actions variables** (the addresses are not passwords):
   - `DEMO_ADMIN_EMAIL`
   - `DEMO_CLIENT_EMAIL`

   The `Reset demo data` workflow runs daily at 03:00 UTC and can also be started with **Actions → Reset demo data → Run workflow**. It resets the demo account passwords, clears prior demo objects, calls `reset_demo_data` with the client email, and uploads the fixtures. It references only the `DEMO_*` secrets and variables listed here.
7. Configure the demo site's build environment with `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_DEMO_ADMIN_EMAIL`, `VITE_DEMO_CLIENT_EMAIL`, and `VITE_DEMO_PASSWORD`. These enable the demo sign-in buttons and banner. Never add the service-role key to the site environment.

The SQL reset deletes every project whose name starts with `Demo:` in this Supabase project. Keep the demo project separate, since the existing schema scopes client access through `projects.client_id` and this reset is intentionally not tenant-scoped.
