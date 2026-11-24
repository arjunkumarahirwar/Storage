# MP Police PYQ Library

A free, mobile-friendly study library for MP Police constable previous year papers.
You paste Google Drive links, students browse/search/open/download them, and each
student can tick papers off as **Done** without creating an account.

**Live:** https://mppolicepyqs.vercel.app

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Data & auth:** Supabase (Postgres + row level security)
- **Files:** stay in Google Drive — this site only stores the title, Drive file id,
  folder, tags and source link.
- **Installable:** a PWA with a service worker — add it to the home screen, and the last
  list of papers stays readable offline (PDFs still open from Drive).
- **Admin tools:** duplicate guard on upload, bulk edit, and a link check that asks Google
  Drive whether every paper and answer key still opens.

See [README-details.md](./README-details.md) for setup, admin login, deployment and
the database schema.
