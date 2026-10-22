# Job Tracker

Next.js (App Router, TypeScript, Tailwind) + Supabase (Postgres, Auth, RLS). Free tiers only.

## Setup
1. Create a free project at supabase.com. In the SQL editor, run `supabase/schema.sql`.
   (Existing project? Run `supabase/add-offer-fields.sql` and `supabase/add-delete-account.sql` once instead.)
2. In Authentication → Providers → Email, turn off "Confirm email" while testing.
3. `cp .env.example .env.local` and fill in the project URL and anon key (Project Settings → API).
4. `npm install && npm run dev`, then open http://localhost:3000.
5. Deploy: import the repo into Vercel, add the same two env vars.

## Auth URLs (needed once deployed)
In Supabase → Authentication → URL Configuration, set Site URL to your Vercel domain and add
`https://YOUR-DOMAIN/login` and `http://localhost:3000/login` to Redirect URLs, so confirmation emails return to the right place.

## Exporting
The Export Excel / Export CSV buttons download every application (not just the current page or filter) from
`/api/export`. The columns use the same headers the importer reads, so an export can be re-imported
(existing company + role pairs are skipped).

## Importing from Google Sheets
In Sheets: File → Download → CSV or Microsoft Excel. Use a header row with Company and Role
(optional: Status, Location, URL, Source, Applied, Notes, Offer Min, Offer Max, Currency, Package). Duplicate company + role pairs are skipped.
Large files are sent in batches of up to 500 rows, with progress shown, so there is no practical row limit. If an import is
interrupted, re-import the same file: rows already saved are skipped.
