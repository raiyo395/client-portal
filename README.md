# Client Portal

A project workspace demo for freelancers and their clients. Administrators create projects and milestones; clients follow progress, review milestones, request changes, and access shared files.

## What you can explore

- Separate administrator and client workspaces
- Project and milestone management with progress summaries
- Milestone review and approval history
- Private project file storage with signed downloads
- Authentication and database-enforced access policies through Supabase
- Responsive Midnight Gold interface

## Demo guidance

For a live portfolio demo, use a **separate Supabase project** with disposable accounts and sample data. Keep your main administrator account private. A client account needs a project assigned to it before it can explore the project workflow. Do not use real client data or upload sensitive files to a public demo.

The current storage migration permits clients to upload and delete their own files through direct Supabase requests, even though the interface hides those controls. Tighten those policies before using this backend for real client documents.

## Technology

- React 19 and TypeScript
- Vite
- Tailwind CSS v4
- React Router v7
- Supabase Auth, Postgres, Storage, and Row Level Security
- Vitest and Testing Library

## Run locally

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create `.env.local` in the repository root with the URL and publishable key for your Supabase project:

   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```

   These values are used by the browser app. Never put a Supabase service-role key in frontend code or `.env.local`.

3. Apply the migrations, in order, to that Supabase project:

   - `supabase/migrations/20261018000100_client_portal_schema_rls.sql`
   - `supabase/migrations/20261018000200_project_files.sql`

   The second migration creates the private `project-files` bucket and file access policies. See [supabase/README.md](supabase/README.md) for applying migrations and promoting a trusted account to administrator.

4. Start the app:

   ```sh
   npm run dev
   ```

New accounts are assigned the `client` role. An administrator must assign a project to a client account for the client workspace to show project content.

## Project checks

```sh
npm test
npm run lint
npx tsc --noEmit
npm run build
```

## Deployment

Deploy the Vite app to a static hosting provider and configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as build environment variables. Configure the host to serve `index.html` for application routes so React Router links work after refresh. Use a dedicated demo Supabase project and non-sensitive data for a publicly accessible portfolio demo.
