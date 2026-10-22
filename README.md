# Job Tracker

Next.js (App Router, TypeScript, Tailwind) + Supabase (Postgres, Auth, RLS). Free tiers only.

## Setup
1. Create a free project at supabase.com. In the SQL editor, run `supabase/schema.sql`.
   (Existing project? Run `supabase/add-offer-fields.sql`, `supabase/add-delete-account.sql` and `supabase/add-resumes.sql` and `supabase/add-resume-photo.sql` once instead.)
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

## Resume Builder
The left-hand menu has a Resume Builder page. Users fill in their details, save a draft, and generate a PDF CV.
The form data lives in the `resumes` table (one row per user) and the PDF in a private Supabase Storage bucket at
`resumes/{user_id}/cv.pdf` (overwritten on each generation). Downloads go through `/api/resume`, which redirects to a
signed URL that expires after 60 seconds. The PDF is built in Node with `@react-pdf/renderer` (no TeX needed) using the
built-in Times fonts, so only Latin characters are supported for now. Deleting an account also deletes the stored PDF.

### CV photo
Optional. The browser crops the chosen JPG/PNG/WebP (max 10 MB) to a 480x480 JPEG, which also strips EXIF/GPS data, then the
server re-checks it (JPEG, at most 400 KB) and stores it in the private `resume-photos` bucket at `{user_id}/photo.jpg`.
It appears at the top right of the PDF header when you generate the CV. Deleting an account removes the photo too.
