# Client Portal

A shared workspace where clients and administrators can follow project milestones, review completed work, and keep approval decisions together.

## Features

- Role-based client and administrator workspaces
- Project and milestone tracking with progress summaries
- Client approval and change-request workflow
- Approval history attached to each milestone
- Private project file uploads and signed downloads
- Supabase authentication and row-level security

## Stack

- React 19 and TypeScript
- Vite
- Tailwind CSS v4
- React Router v7
- Supabase Auth, Postgres, and Row Level Security

## Setup

1. Install dependencies with `npm install`.
2. Create `.env.local` in the repository root with the Supabase project URL and publishable key:

   ```env
   VITE_SUPABASE_URL=
   VITE_SUPABASE_PUBLISHABLE_KEY=
   ```

   Copy these values from the Supabase project settings. These are browser-safe project settings; never put a service-role key in this app.

3. Apply `supabase/migrations/20261018000100_client_portal_schema_rls.sql`, then apply `supabase/migrations/20261018000200_project_files.sql` to the intended Supabase project. The second migration adds private storage and project file access policies. See [supabase/README.md](supabase/README.md) for the SQL Editor steps and administrator promotion instructions.
4. Start the development server with `npm run dev` and open the local URL printed by Vite.

## Commands

- `npm run dev` — start the local development server
- `npm run lint` — run ESLint
- `npx tsc --noEmit` — check TypeScript types
- `npm run build` — create a production build

New accounts receive the `client` role. A trusted project operator must promote administrator accounts in Supabase as described in the database setup guide.
