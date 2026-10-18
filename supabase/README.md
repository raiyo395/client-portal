# Supabase database setup

## Apply the migration

Open the SQL Editor in the Supabase project connected to this app, paste the contents of the migration file, and run it. Confirm that the project is the intended one before applying it. The migration expects the standard Supabase `auth` schema and an existing `auth.users` table. Review the target project and take a database backup before applying schema changes to a database that already contains data.

The migration creates profile rows for new sign-ups with the `client` role. It enables RLS on all four application tables and installs policies and triggers for admin access, client project access, approval insertion, role protection, and milestone decision updates.

## Promote a user to admin

As a project owner or trusted database operator, find the account under **Authentication → Users**, copy its UUID, and update that user's `role` to `admin` in **Table Editor → profiles**. Perform this as the database operator; the trigger intentionally prevents a signed-in user from changing their own role. Only promote trusted accounts.
