# Setup & operating guide

## Live site

https://mppolicepyqs.vercel.app

## What visitors get

- Search across titles, folders and tags
- Folder chips built automatically from the folders you use
- Filter: **All / Not done / Done**
- Every card has **Open** (Drive viewer), **Download**, **Share** and a **Done** tick
- Progress bar for the visitor's own Done marks
- Dark mode follows the phone setting (with a manual toggle)

## What you (admin) get

- An **Add PDFs** panel, only visible to the library administrator
- Paste one Drive link per line, or `Title | link`. The file id is extracted for you.
- Pick a folder, tags and source (Official ESB page + link, or Own work)
- Edit and delete buttons on every card
- A small rail on every card: **drag the ⠿ grip, or tap ↑ / ↓**, to set the order everybody sees

## First-time admin login

1. Open the site and tap **Sign in** → **New account**.
2. Register with **arjunkumarahirwar01@gmail.com** (the address hard-coded in the
   `is_library_admin()` database function).
3. You now see the **Add PDFs** button, the FAB on mobile, and edit/delete controls.

Any other email can sign up as a normal student, but can never add or delete papers —
that is enforced in Postgres, not just in the UI.

## Forgot / change password

Say you are signed out → **Sign in** → **Forgot your password?** → type your e-mail.
Supabase mails a recovery link that lands back on the site, and the site immediately
asks for the new password twice (6+ characters). Nothing else is needed on your side.

Two things to know:

- **Mail limit.** The built-in Supabase mailer allows 2 e-mails per hour
  (`rate_limit_email_sent`). If a link never arrives, wait an hour or reset the
  password straight in the Supabase SQL editor with `crypt(...)`/`pgcrypto`.
- **The link is only as good as the domain.** The recovery link redirects to
  *Supabase → Authentication → URL Configuration → Site URL*. If the Vercel domain
  changes, that value must change with it, or the e-mail will point at a dead page.

## Adding papers

1. In Google Drive, right-click the PDF → **Share** → *Anyone with the link* →
   **Copy link**.
2. Tap **Add PDFs** and paste, one per line:

   ```
   MP Police Constable 2023 Shift 1 | https://drive.google.com/file/d/FILE_ID/view?usp=sharing
   https://drive.google.com/file/d/ANOTHER_ID/view
   ```

3. Give every row a title (titles are never read from Drive), choose the folder, add
   tags like `Shift 1, 2023, Solutions`, pick the source, then **Add to library**.
4. Links become `drive.google.com/file/d/<id>/view` (Open) and
   `drive.google.com/uc?export=download&id=<id>` (Download).

Folder links are rejected — only individual files open in the Drive viewer.

## Arranging the order

1. Sign in as the administrator — every card then shows a small rail on its left:
   a ⠿ grip button and ↑ / ↓ buttons.
2. Hold the grip (phone or mouse) and drag the card up or down — the card follows your
   finger pixel by pixel, the cards it passes glide one slot aside, and the list
   auto-scrolls when you reach the top or bottom edge. Release to drop it.
3. Let go — the new arrangement is saved for everyone, visitors included.
4. Prefer buttons? Tap **↑ / ↓** on any card — one step per tap, no dragging needed.
5. Prefer the keyboard? Tab to the grip and press **↑ / ↓**.

Notes:

- New PDFs always appear at the top (their `sort_order` is `0`), so fresh uploads are
  easy to spot. Drag them wherever you like afterwards.
- Dragging inside a folder chip or a search result only reshuffles those cards; the
  rest of the library keeps its slots.
- The order lives in `papers.sort_order` and is saved with the `reorder_papers()`
  function, which refuses to run for anyone but the administrator.
- If saving fails (no connection, say) the cards snap back to the previous order and a
  red toast appears.

## Local development

```bash
npm install
cp .env.example .env.local   # optional: defaults already point at the project
npm run dev                  # http://localhost:5173
npm run build                # production build in dist/
```

`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are public values; the anon /
publishable key can only do what the row level security policies allow. Never commit a
`service_role` key.

## Deployment (Vercel) — already done

Live at <https://mppolicepyqs.vercel.app>. Every push to
`arena/6d872d2b-storage` in the repo can be re-deployed from Vercel; the project is
`mp-police-pyq-library` (framework Vite, build `npm run build`, output `dist`).

> **Vercel Authentication / Deployment Protection:** this project also answers on the
> team alias `mp-police-pyq-library-arjunkumarahirwar.vercel.app`, but that host asks
> visitors to log in to Vercel. Use the short `mppolicepyqs.vercel.app` address
> (public), or turn off *Settings → Deployment Protection → Vercel Authentication*
> if you want every alias public.
>
> **The live domain changed once already.** `mp-police-pyq-library.vercel.app` no
> longer resolves to the project (it returns 404 DEPLOYMENT_NOT_FOUND). If the
> address ever changes again, update *Supabase → Authentication → URL
> Configuration* (`Site URL` + `Redirect URLs`) in the same sitting, otherwise
> password-reset e-mails will point at a dead page.

## Deployment settings

The site is a static Vite build. On Vercel the project needs:

- Framework preset: **Vite**
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`
- Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Database

`supabase/schema.sql` is the full, re-runnable schema (tables, checks, indexes, RLS,
policies and the admin check). It is already applied to the live project.

| Table | Purpose |
| --- | --- |
| `papers` | One row per PDF: title, `drive_file_id`, folder, tags, source |
| `paper_progress` | `(user_id, paper_id)` rows — each student's Done marks |

Security model:

- `papers` — readable by everyone, writable only by `is_library_admin()`
- `paper_progress` — each row is restricted to `auth.uid() = user_id`
- Guests who never sign in keep Done marks in `localStorage`; they are merged into the
  account on first sign-in.

## Known limits

- Drive files must be shared as *Anyone with the link can view*, with downloads on.
- Very large PDFs can show a Google virus-scan warning before downloading.
- Supabase's free tier pauses a project after ~a week without activity.
- The administrator email is hard-coded in `is_library_admin()`; change it in the SQL
  function to hand the library to someone else.

## Possible next steps

Title editor (done), download counter, Drive API folder sync, "recently added" row,
installable PWA, "Report a file" button.
