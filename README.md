# Client Portal

A project workspace for freelancers and their clients. Administrators create projects and milestones. Clients follow progress, review milestones, approve them or request changes, and download shared files.

**Live demo:** [YOUR-LIVE-URL](YOUR-LIVE-URL)

Choose **Try as Admin** or **Try as Client** on the login page. No sign-up is needed.

## Features

- Separate administrator and client workspaces
- Project and milestone management with progress summaries
- Milestone review with approval and change-request history
- Private file storage per project, with download access for project members
- Authentication and database-enforced access control through Supabase Row Level Security
- Responsive "Midnight Gold" interface

## About the demo

The public demo runs on its own Supabase project with fake projects, milestones, and sample files. After either demo account signs in, the app shows a dismissible "Demo mode: data resets daily" banner.

A scheduled GitHub Actions workflow resets the demo accounts and data every night at 03:00 UTC. You can also start it manually from the Actions tab. Please don't upload real client data or sensitive files to the public demo.

## Tech stack

- React `^19.2.8` and TypeScript `~6.0.2`
- Vite `^8.3.0`
- Tailwind CSS `^4.3.3`
- React Router `^7.18.4`
- Supabase (`@supabase/supabase-js ^2.117.3`): Auth, Postgres, Storage, and Row Level Security
- Vitest `^5.0.5` and Testing Library

## Security model

- Row Level Security is enabled on every table. Clients can read only the projects assigned to them (`projects.client_id`), plus those projects' milestones, approvals, and files.
- Clients can record a decision only on a milestone that is in review. A database trigger enforces this.
- Users cannot change their own role. New sign-ups are always created as `client`.
- The `project-files` Storage bucket is private, with a 10 MB size limit and an allowlist of file types.
- Clients can upload files to their own projects and delete their own uploads. The interface exposes viewing and downloading only, but the database policies also allow these actions.

## Run locally

1. Install dependencies:

   ```sh
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in the values for your Supabase project. The browser app needs:

   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```

   `VITE_*` values are visible in the browser bundle. The service-role key is used only by the local demo scripts, as `DEMO_SERVICE_ROLE_KEY`, and by the nightly GitHub Action, which reads it from a GitHub secret. Never give it a `VITE_` prefix, commit it, or add it to your hosting environment.

3. Apply the migrations to your Supabase project, in order:

   - `supabase/migrations/20261018000100_client_portal_schema_rls.sql`
   - `supabase/migrations/20261018000200_project_files.sql`

   See [supabase/README.md](supabase/README.md) for details and for promoting a trusted account to administrator.

4. Start the app:

   ```sh
   npm run dev
   ```

New accounts get the `client` role. An administrator must assign a project to a client account before the client workspace shows any content.

## Set up your own demo

Use a **separate** Supabase project with fake data only. The full steps are in [supabase/README.md](supabase/README.md). In short:

1. Fill in the `VITE_DEMO_*` and `DEMO_*` variables in `.env.local` (see `.env.example`).
2. Run `npm run demo:users` to create the demo admin and client accounts.
3. Apply `supabase/seed-demo.sql` in the SQL Editor, then run `select public.reset_demo_data('your-demo-client-email');`.
4. Run `npm run demo:files` to upload the sample files.
5. For the nightly reset, add the `DEMO_SUPABASE_URL`, `DEMO_SERVICE_ROLE_KEY`, and `DEMO_PASSWORD` secrets and the `DEMO_ADMIN_EMAIL` and `DEMO_CLIENT_EMAIL` variables in your GitHub repository's Actions settings.

### Troubleshooting

If the second migration fails on a brand-new Supabase project with `operator does not exist: uuid = text`, change `owner = (select auth.uid())::text` to `owner_id = (select auth.uid())::text` in the two client storage policies. On newer projects, `storage.objects.owner` is a `uuid` column and `owner_id` is the text column.

## Project checks

```sh
npm test
npm run lint
npx tsc --noEmit
npm run build
```

`npm run build` runs `tsc -b` and then the Vite production build.

## Deployment

Deploy to any static host (Vercel, Netlify, or Cloudflare Pages):

- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and, for a demo deployment, `VITE_DEMO_ADMIN_EMAIL`, `VITE_DEMO_CLIENT_EMAIL`, and `VITE_DEMO_PASSWORD`
- Never add `DEMO_SERVICE_ROLE_KEY` to hosting settings.
- Add a rewrite rule so every route serves `index.html`. Without it, refreshing a page other than the home page returns a 404 (React Router handles routing in the browser).

## Screenshots

_Screenshots coming soon._