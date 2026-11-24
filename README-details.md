# Setup & operating guide

## Live site

https://mppolicepyqs.vercel.app

## What visitors get

- Search across titles, folders and tags
- Folder chips built automatically from the folders you use
- Filter: **All / Not done / Done**
- A **Recently added** shelf of the newest uploads, with a *N new* badge when
  something appeared since the visitor's last visit on that phone
- **Year** and **Shift** chips under the folder chips (they appear once the
  library holds more than one year / shift)
- Every card has **Open** (Drive viewer), **Download**, **Share** and a **Done** tick
- **Report a problem** on every card — no account needed
- Filtered lists are shareable: the search, folder and All/Not done/Done switch live in
  the address, and **Copy link** puts the whole view in WhatsApp
- **Practice** on every card: start a timer, solve the paper in Drive, then enter your
  score. The card keeps your best score and how many attempts you made, and the running
  clock stays visible in the corner while you read the PDF
- **Notes** on every card: a private note (up to 2000 characters) plus an easy / medium /
  hard rating, shown as a coloured chip on the card
- **Install it on the phone**: it opens full screen like an app, and the last library
  listing stays readable when the network drops
- Progress bar for the visitor's own Done marks
- Dark mode follows the phone setting (with a manual toggle)

## What you (admin) get

- An **Add PDFs** panel, only visible to the library administrator
- Paste one Drive link per line, or `Title | link`. The file id is extracted for you.
- Pick a folder, tags and source (Official ESB page + link, or Own work)
- Edit and delete buttons on every card
- A small rail on every card: **drag the ⠿ grip, or tap ↑ / ↓**, to set the order everybody sees
- A **Problem reports** inbox in the avatar menu, with a badge for open reports
- An **Answer key link** box in the edit form: paste a key's Drive link, no card needed
- **Bulk edit** — tick many cards at once and change their folder, tags, year or shift,
  or delete them together
- **Library check** — asks Google Drive whether every paper and answer key still opens,
  and lists anything that looks like it was uploaded twice
- Duplicate guard: pasting a Drive link that is already in the library is refused
  before it is saved

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

## Answer keys

Every paper can carry its own answer key, so a student never has to hunt for it. The key
is **a Drive file attached to the paper row** (`papers.solution_file_id`) — it has no
card, no folder and no title of its own, and it never appears in the list.

1. The paper's card shows a green **Answer key** pill next to its folder chip. Tapping it
   opens the key PDF in the Google Drive viewer, exactly like **Open**.
2. To attach, change or remove a key later: **Edit** on the paper → **Answer key link** →
   paste the Drive link (or clear the box).
3. To attach it while uploading: paste it in the *Answer key Drive link* field under each
   row of **Add PDFs**, or as a third pipe part —
   `Title | paper link | answer key link`. See [Adding papers](#adding-papers).

Notes:

- **Searching** `answer key` finds the papers that have one.
- **One row per PDF.** The key shares the paper's row, so there is nothing extra to
  title, no folder chip for it, and no tags. Deleting the paper deletes the reference.
- **The old solution cards are gone.** The 15 pairs that used to be separate cards in
  *MP Police Constable 2025 Solutions* were folded into their papers — those papers now
  open their key from the green pill, and the folder no longer exists.
- `papers.solution_paper_id` still exists for a card-style link (a PDF titled
  `… Solution` uploaded on its own is still auto-linked to the paper of the same name),
  but the app no longer offers a picker for it.

## Install it like an app (PWA)

The site is a proper installable app — `public/manifest.webmanifest`, the icons in
`public/`, and `public/sw.js`, a service worker with no build step.

**Installing.** On Android / desktop Chrome, an **Install app** card appears under the
progress bar once the browser offers the prompt (also in the browser's own menu as
*Install*). On iPhone and iPad there is no prompt, so the card shows the manual route:
**Share → Add to Home Screen**. Either way it opens without the address bar, keeps its own
icon, and starts on the same library.

**What works offline**

| Offline | Why |
| --- | --- |
| The app opens | the shell (`index.html`, the hashed JS/CSS, icons, fonts) is cached on install |
| The paper list, folders, year/shift chips | the last listing from Supabase is saved |
| Search and filters | they run in the page, over the saved list |
| Opening a PDF | **no** — PDFs live in Google Drive and need a connection |

So the phone can show *what* is in the library on a dead network, and the student opens the
paper when they are back online. An amber strip says **You are offline** while that is
happening.

**How it caches.** Pages and the `papers` request are *network first* (4–5 second budget,
cache as the fallback), so a deploy or an admin edit shows up immediately when online.
Hashed `/assets/…` files, icons and fonts are *cache first*, because a filename with a hash
in it can never change. `/api/link-health` is never cached — the checker must be live.

**First-visit warm-up.** Once the worker takes control it asks the page for the exact
listing request (URL plus the public Supabase key) and saves the answer straight away, so
one visit online is enough; the student does not have to open the app twice.

**Updates.** A new build is fetched as soon as it is visited; when the new worker takes
over, a **A new version is ready** bar with a *Refresh* button appears. The cache is
versioned (`pyq-shell-v1`, …) and older versions are deleted on activate — bump `VERSION`
in `public/sw.js` when you change the cache strategy itself.

**Testing it.** `npm run test:sw` runs `scripts/sw-test.mjs`: it loads the real `sw.js`
against a fake Cache API and network and checks the promises above (offline boot, saved
listing, warmed install, live API, cache cleanup). No browser needed.

**In development** the worker is not registered (it would cache the dev server's modules and
confuse the next deploy). Use `npm run build && npm run preview` to try install and offline.

**Limits worth knowing.** Signed-in Done ticks, notes and practice scores come from
Supabase, so offline they fall back to the device copy until the network returns (nothing is
lost — the account rows are untouched). A PDF that a student has open in Drive keeps working
only as far as Drive itself does. Clearing site data removes the saved list.

## Practice and notes

Both live on each card, in the small link row under the buttons.

**Practice** — tap *Practice* → *Start & open paper*. The timer starts and the PDF opens in
Drive; the clock also sits in the bottom-left corner of the site, so it keeps running while
the student reads or scrolls. Tapping *Finish* asks for marks scored and out of how many
(defaults to 100). The card then shows **Best 68/100 · 2×**, and the dialog lists the last
five attempts with time taken and date, each removable. Nothing is enforced — it is a
self-timed record, which is what makes it work without an account.

**Notes** — tap *Notes* to pick Easy / Medium / Hard and write a note. The rating shows as a
chip on the card; the note itself only opens in the dialog. Nobody else can see either, not
even the admin.

Guests keep both on the device. On first sign-in the device's notes and attempts are copied
into the account (same pattern as the Done ticks), then the device copy is cleared.

## Report a problem

Students never have to sign in to tell you a PDF is broken.

1. On any card, tap **Report a problem** (next to *Added …* at the bottom of the card).
2. Pick a reason — the PDF does not open, it is a different paper, the answer key is
   missing, the answer key is wrong, or something else. There is an optional free-text
   box (600 characters).
3. Tap **Send report**. The card then reads **Reported** on that phone, so the same
   student is not asked again.

You read them from the avatar menu → **Problem reports**. Each report shows the paper
title, the reason, the note, the date, and whether it came from a signed-in student or
a guest. From there you can **Open PDF**, **Fix paper** (jumps straight into the edit
form) or **Mark resolved**.

- The paper title is copied into the report, so a report survives the paper being
  deleted — you still see what was wrong.
- Open reports are counted on the menu item; resolved ones drop to the bottom of the
  dialog automatically.
- The database lets anyone *insert* a report, but only the administrator may *read* or
  *close* them (`paper_reports` policies). A guest asking for the list gets nothing.

## Shareable filtered lists

The current view lives in the address bar:

| Part of the link | Means |
| --- | --- |
| `?q=nov+2025` | the search box |
| `&cat=MATHS%20MATERIAL` | the folder chip that is selected |
| `&show=done` (or `open`) | the All / Not done / Done switch |
| `&y=2023` | the year chip |
| `&shift=2` | the shift chip |

When any of those is set, a **Copy link** button appears next to the filter tabs. Paste
that link into WhatsApp or Telegram and whoever opens it lands on exactly that list —
search text, folder and filter included. Nothing is stored on the server for this; the
link is just the page's address.

If a shared link names a folder you have since renamed, the app shows every paper and
says so, instead of an empty screen.

## Year and shift filters

Two rows of chips sit under the folder chips:

- **Year** — one chip per exam year (`2025`, `2023`, …), newest first
- **Shift** — `Any`, `1`, `2`, …

A row only appears once your library actually holds more than one value for it, so a
single-exam library does not show a filter that filters nothing. Tap an active chip again
to clear it. `All` / `Any` clears the row.

Where the values come from:

- New PDFs: the year and shift are **read out of the title** (`… 07 Nov 2025 Shift 2`).
  The Add panel also has optional **Exam year** and **Shift** fields; fill them only
  when the title does not carry the date.
- Existing PDFs: back-filled from their titles by the database migration.
- Maths material has no year or shift, so it drops out of the list when a shift is
  selected — that is intended.
- Edit a paper to change either value by hand.

## Recently added

The shelf above the folder chips shows the **six newest uploads by date**, whatever order
you have dragged the main list into. Tapping a tile opens the PDF in Drive.

- The *N new* badge counts papers that were not in the library on this phone's last
  visit (`pyq:seenPapers` in `localStorage`). A first visit shows no badge.
- The shelf is hidden while a search or any filter is active — then the list itself is
  what the student asked for.
- Your manual order is untouched: the shelf is a shortcut, not a re-sort.

## Tags

Tags are tidied on the way into the database (`normaliseTags` in `src/lib/exam.ts`, and
the same rules in `schema.sql`):

| You type | Stored |
| --- | --- |
| `BATTA`, `batta` | `Batta` |
| `SQUARES 1 to 50`, `squares` | `Squares` |
| `CUBES`, `cubes 1 to 40` | `Cubes` |
| `Multiple tables`, `tables` | `Tables` |
| `PRIME NUMBERS`, `prime numbers between 1 to 1000` | `Prime numbers` |
| `Maths formulae`, `maths formula` | `Maths formula` |

Tags that only repeat something the card already shows are dropped:
`Shift 1`, `08 Nov 2025`, `Solution`, `Question paper`, `Answer key`, and a bare year
such as `2023` (the year chips cover that). Duplicates ignoring case are collapsed, and
the list is kept within the database limits (12 tags, 300 characters).

## Profile — username and picture

The first time somebody signs in, a dialog opens that cannot be closed until they pick
a **username** and a **profile picture**. That is the only gate; after saving, the site
behaves normally and the dialog never comes back unless the profile is somehow empty.

- **Username:** 3–24 characters, letters, numbers, dots and underscores only.
  Case-insensitive unique — `Arjun` and `arjun` cannot both exist.
- **Picture:** any JPG/PNG/WebP up to 15 MB. The browser crops it to a square and
  shrinks it to 320×320 before uploading, so a 4 MB camera photo becomes ~20 kB.
  Files live in the public Supabase Storage bucket `avatars`, one folder per user id,
  and the old file is deleted when a new one is uploaded.
- **Top-right button:** shows the avatar and `@username`. Tapping it opens the menu with
  **Edit profile** (change name or photo later) and **Sign out**.
- **Privacy:** row level security means a person can only insert or update their own
  `profiles` row, and can only write inside their own storage folder. Anybody can read
  a profile (names and avatars are shown publicly), never change someone else's.

If a picture upload fails, the dialog says so and nothing is saved — the person can
sign out from inside the dialog if they get stuck.

## Adding papers

1. In Google Drive, right-click the PDF → **Share** → *Anyone with the link* →
   **Copy link**.
2. Tap **Add PDFs** and paste, one per line:

   ```
   MP Police Constable 2023 Shift 1 | https://drive.google.com/file/d/FILE_ID/view?usp=sharing
   https://drive.google.com/file/d/ANOTHER_ID/view
   ```

3. Give every row a title (titles are never read from Drive), choose the folder, add
   tags like `Batta, Tables`, pick the source, then **Add to library**.
4. Links become `drive.google.com/file/d/<id>/view` (Open) and
   `drive.google.com/uc?export=download&id=<id>` (Download).

Folder links are rejected — only individual files open in the Drive viewer.

### Attaching the answer key while you upload

Upload the question paper and its answer key in one go. Only the **paper** needs a
title, folder, tags, year and shift — the answer key is just a Drive file stuck to it,
so it needs none of those.

Two ways, in the **Add PDFs** panel:

- **The field under each row** — every pasted link gets an *Answer key Drive link
  (optional)* box. Paste the key there and the row turns green.
- **The third pipe part** — one line can carry both links:

  ```
  MP Police Constable 12 Nov 2025 Shift 1 | https://drive.google.com/file/d/PAPER/view | https://drive.google.com/file/d/KEY/view
  ```

What gets saved:

- **One row per question paper.** The key's file id is stored in
  `papers.solution_file_id` on that same row — no second card, no folder chip, no title
  to invent, no tags. It never shows up in the list as its own paper.
- The paper's card shows the green **Answer key** button, which opens the key PDF in the
  Drive viewer. Search for `answer key` finds every paper that has one.
- An answer key can be changed or added later in **Edit paper → Answer key link**.
- Bad links are caught before anything is saved: a folder link, a Google Docs link, or a
  key that is the same file as the question paper blocks the upload with a message under
  that row.
- The toast counts both: *“1 paper with an answer key added to the library.”*

The old card-style pairs are gone: the 15 solution cards were folded into their papers
by moving each card's file id into `solution_file_id` and deleting the card row. Nothing
about those papers' green button changed — it still opens the same PDF. The
*MP Police Constable 2025 Solutions* folder disappeared with the cards.

## Bulk edit

Tap **Bulk edit** under the filters (or *avatar menu → Bulk edit*). Every card grows a tick
box; the bar at the bottom counts what you picked.

1. Tick the cards — or **All N** to take everything the current filters show.
2. **Edit fields** opens one form: folder, tags to add, tags to remove, exam year, shift.
   Only the fields you fill in change; **Keep each shift** and a blank year leave those
   alone. A tag that already exists is not duplicated, and spelling is tidied as usual.
3. **Delete** asks once, then removes the whole selection for everybody. The Drive files
   are never touched.

Close the bar with the ✕ to go back to normal browsing.

## Library check

*Avatar menu → Library check* (or the **Link check** button under the filters). Two things
live here:

**Link health.** Tap **Check all links**. A small server function asks Google Drive about
every paper and every attached answer key, and answers with one of four words:

| Result | Meaning | What to do |
| --- | --- | --- |
| Works | Anyone with the link can open it | Nothing |
| Not public | The file exists but is not shared | Share it as *Anyone with the link* |
| Missing | Deleted, or the id is wrong | Find the file again, or delete the card |
| Unclear | Drive did not answer in time | Check again in a moment |

Every link that is not "Works" is listed with **Edit** and **Delete** buttons, so a broken
card can be fixed from the same screen. Results are remembered in the browser (and only
in the browser), so reopening the panel does not re-check everything; **Clear** forgets
them and **Recheck** runs again. Cards also get a small dot on the PDF icon while a
problem is known.

**Duplicates.** Three kinds are looked for, in this order:

1. the same Drive file on two cards,
2. two cards with the same title (punctuation and capitals ignored),
3. two cards claiming the same folder + exam year + shift — usually the same paper
   uploaded twice under slightly different names.

Each group lists the cards with their folder and upload date, with **Edit** and **Delete**
on every row. The numbers at the top also flag papers with no exam year set.

> The check runs in `api/link-health.js`, a Vercel serverless function. It calls Drive from
> the server because a browser cannot read a cross-origin Drive response; it reads only
> the first part of each preview page and never downloads a file. `vercel.json` gives it a
> 30-second budget. If the function is missing (a local `npm run dev`, say) the panel
> simply reports that the checker could not be reached.

## Duplicate guard on upload

The **Add PDFs** panel and the edit form both compare what you are about to save with the
whole library:

- the same Drive file as a card → **refused**, with the name of the card that has it;
- a file that is already somebody's answer key → **refused**;
- a file used as a paper, pasted as an answer key → **refused**;
- only a matching title → a warning, plus an **Add them anyway** tick box in case two
  different papers really are called the same thing.

The database backs this up: `papers.drive_file_id` has a unique index, so even two tabs
saving at the same moment cannot create the same card twice. A rejected duplicate comes
back as "Already in the library".

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

The site is a static Vite build plus one serverless function (`api/link-health.js`, for the
link check). On Vercel the project needs:

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
| `papers` | One row per PDF: title, `drive_file_id` (unique index), folder, tags, source, `exam_year`, `exam_shift`, `solution_file_id` (its answer key) |
| `paper_progress` | `(user_id, paper_id)` rows — each student's Done marks |
| `profiles` | One row per account: username + avatar URL |
| `paper_reports` | Student-submitted problem notes (reason, details, status) |
| `paper_notes` | `(user_id, paper_id)` — one private note + easy/medium/hard rating per paper per student |
| `practice_attempts` | One row per timed run: `seconds`, `score`, `total`, `created_at` |

Security model:

- `papers` — readable by everyone, writable only by `is_library_admin()`
- `paper_progress` — each row is restricted to `auth.uid() = user_id`
- `profiles` — readable by everyone (that is how usernames show), writable only by its
  owner (`auth.uid() = id`); RLS is enabled on this table too
- `paper_reports` — anyone may insert; only `is_library_admin()` may select, update or
  delete
- `paper_notes` — select, insert, update and delete are restricted to `auth.uid() = user_id`
- `practice_attempts` — select, insert and delete are restricted to `auth.uid() = user_id`
  (attempts are never updated, so there is no update policy)
- Guests who never sign in keep Done marks, notes and practice attempts in `localStorage`;
  all three are merged into the account on first sign-in.

## Known limits

- Drive files must be shared as *Anyone with the link can view*, with downloads on.
- Very large PDFs can show a Google virus-scan warning before downloading.
- Practice scores are self-reported. They are a personal record, not an exam result.
- A practice timer lives on one device and in one tab; clearing site data clears it.
- Offline, the app shows the saved list and the device copy of progress; PDFs still need
  Google Drive.
- The saved list is per browser: installing on a second phone saves its own copy.
- Notes and attempts only reach the account while signed in — a guest who later signs in
  gets one merge, on that device.
- Supabase's free tier pauses a project after ~a week without activity.
- The administrator email is hard-coded in `is_library_admin()`; change it in the SQL
  function to hand the library to someone else.

## Possible next steps

Done: answer keys, report a problem, shareable filtered lists, recently added,
year/shift filters, tidy tags. Still open: bookmarks, notes and difficulty ratings,
self-reported timed practice, a small dashboard, installable PWA, Hindi UI, and admin
bulk tools (link-health checks need a server-side job — Drive blocks browser CORS).
