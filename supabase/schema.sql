-- ============================================================================
-- MP Police PYQ Library — Supabase schema
-- Re-runnable. Apply with:  supabase db push   (or paste into the SQL editor)
-- ----------------------------------------------------------------------------
-- papers          one row per PDF stored in Google Drive
-- paper_progress  one row per student per finished paper
-- profiles        one row per person: username + avatar picture
-- paper_reports   student-submitted "this link is broken / wrong file" notes
-- avatars         public storage bucket holding those pictures
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- papers ----
create table if not exists public.papers (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  drive_file_id text not null unique,
  category      text not null default 'Previous papers',
  tags          text[] not null default '{}',
  source_type   text not null default 'own',
  source_url    text,
  -- Position in the library. 0 = "just added", shown above the rest.
  sort_order    integer not null default 0,
  -- The answer key attached to this paper (another row in this table).
  solution_paper_id uuid references public.papers (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Re-runs on an existing database keep the new columns.
alter table public.papers
  add column if not exists sort_order integer not null default 0,
  add column if not exists solution_paper_id uuid
    references public.papers (id) on delete set null;

alter table public.papers
  drop constraint if exists papers_title_check,
  drop constraint if exists papers_drive_file_id_check,
  drop constraint if exists papers_solution_self_check,
  drop constraint if exists papers_category_check,
  drop constraint if exists papers_tags_check,
  drop constraint if exists papers_source_type_check,
  drop constraint if exists papers_source_check;

alter table public.papers
  add constraint papers_title_check
    check (char_length(btrim(title)) between 1 and 180),
  add constraint papers_category_check
    check (char_length(btrim(category)) between 1 and 60),
  add constraint papers_drive_file_id_check
    check (drive_file_id ~ '^[A-Za-z0-9_-]{10,200}$'),
  add constraint papers_tags_check
    check (
      cardinality(tags) <= 12
      and array_position(tags, null) is null
      and char_length(array_to_string(tags, ',')) <= 300
    ),
  add constraint papers_source_type_check
    check (source_type in ('official', 'own')),
  add constraint papers_source_check
    check (
      (source_type = 'own' and source_url is null)
      or (source_type = 'official' and source_url ~* '^https://[^[:space:]]+$')
    ),
  add constraint papers_solution_self_check
    check (solution_paper_id is null or solution_paper_id <> id);

create index if not exists papers_category_idx on public.papers (category);
create index if not exists papers_created_at_idx on public.papers (created_at desc);
create index if not exists papers_tags_gin_idx on public.papers using gin (tags);
create index if not exists papers_sort_order_idx on public.papers (sort_order);
create index if not exists papers_solution_idx on public.papers (solution_paper_id);

-- Link every "<paper> Solution" row to the paper with the matching title.
-- Safe to re-run: only fills links that are still empty.
update public.papers p
set solution_paper_id = s.id
from public.papers s
where p.solution_paper_id is null
  and lower(btrim(s.title)) = lower(btrim(p.title)) || ' solution'
  and s.id <> p.id;

-- -------------------------------------------------------- paper_progress ----
create table if not exists public.paper_progress (
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  paper_id     uuid not null references public.papers (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, paper_id)
);

create index if not exists paper_progress_user_idx on public.paper_progress (user_id);

-- ------------------------------------------------------ reorder (admin) ----
-- Saves the whole arrangement in one call. The app sends every paper id with
-- its new position, so the order the administrator drags into place is the
-- order everybody sees. Guests cannot call this: the function re-checks the
-- administrator email itself.
create or replace function public.reorder_papers(p_ids uuid[], p_orders integer[])
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  if not public.is_library_admin() then
    raise exception 'Only the library administrator can reorder papers'
      using errcode = '42501';
  end if;

  if coalesce(cardinality(p_ids), 0) <> coalesce(cardinality(p_orders), 0) then
    raise exception 'p_ids and p_orders must be the same length'
      using errcode = '22023';
  end if;

  update public.papers p
     set sort_order = s.ord
    from unnest(p_ids, p_orders) as s(id, ord)
   where p.id = s.id;
end;
$$;

-- -------------------------------------------------------------- profiles ----
-- One row per signed-in person: the username and the picture shown in the app.
-- The app forces this row to exist right after the first sign-in.
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  username   text not null,
  avatar_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_check check (username ~ '^[A-Za-z0-9._]{3,24}$'),
  constraint profiles_avatar_check check (avatar_url ~* '^https://')
);

-- Usernames are unique regardless of upper/lower case.
create unique index if not exists profiles_username_lower_key
  on public.profiles (lower(username));

-- -------------------------------------------------------- paper_reports ----
-- "This Drive link does not open" / "wrong file" notes from students.
-- Students never need an account to send one; only the administrator reads them.
-- paper_title is copied in so a report survives the paper being deleted.
create table if not exists public.paper_reports (
  id          uuid primary key default gen_random_uuid(),
  paper_id    uuid references public.papers (id) on delete cascade,
  paper_title text not null,
  reason      text not null default 'link_broken',
  details     text,
  -- Filled in automatically for signed-in students, null for guests.
  reporter_id uuid default auth.uid() references auth.users (id) on delete set null,
  status      text not null default 'open',
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

-- Re-runs on an existing database pick up new columns / constraints.
alter table public.paper_reports
  add column if not exists details text,
  add column if not exists status text not null default 'open',
  add column if not exists resolved_at timestamptz;

alter table public.paper_reports
  drop constraint if exists paper_reports_title_check,
  drop constraint if exists paper_reports_reason_check,
  drop constraint if exists paper_reports_status_check,
  drop constraint if exists paper_reports_details_check;

alter table public.paper_reports
  add constraint paper_reports_title_check
    check (char_length(btrim(paper_title)) between 1 and 180),
  add constraint paper_reports_reason_check
    check (reason in ('link_broken', 'wrong_file', 'missing_key', 'wrong_key', 'other')),
  add constraint paper_reports_status_check
    check (status in ('open', 'resolved')),
  add constraint paper_reports_details_check
    check (details is null or char_length(details) <= 600);

create index if not exists paper_reports_paper_idx
  on public.paper_reports (paper_id);
create index if not exists paper_reports_open_idx
  on public.paper_reports (created_at desc)
  where status = 'open';

-- ------------------------------------------------------------ updated_at ----
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists papers_touch_updated_at on public.papers;
create trigger papers_touch_updated_at
  before update on public.papers
  for each row execute function public.touch_updated_at();

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- --------------------------------------------------------- admin check ------
-- The library administrator is whoever signs in with this confirmed email.
-- Change the address here to hand the library to another account.
create or replace function public.is_library_admin()
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (
    select 1
    from auth.users
    where id = (select auth.uid())
      and lower(email) = lower('arjunkumarahirwar01@gmail.com')
      and email_confirmed_at is not null
  );
$$;

-- ------------------------------------------------------------------ RLS -----
alter table public.papers enable row level security;
alter table public.paper_progress enable row level security;
alter table public.profiles enable row level security;
alter table public.paper_reports enable row level security;

drop policy if exists "Anyone can read the library" on public.papers;
create policy "Anyone can read the library"
  on public.papers for select
  to anon, authenticated
  using (true);

drop policy if exists "Only the administrator can add papers" on public.papers;
create policy "Only the administrator can add papers"
  on public.papers for insert
  to authenticated
  with check ((select public.is_library_admin()));

drop policy if exists "Only the administrator can edit papers" on public.papers;
create policy "Only the administrator can edit papers"
  on public.papers for update
  to authenticated
  using ((select public.is_library_admin()))
  with check ((select public.is_library_admin()));

drop policy if exists "Only the administrator can delete papers" on public.papers;
create policy "Only the administrator can delete papers"
  on public.papers for delete
  to authenticated
  using ((select public.is_library_admin()));

drop policy if exists "Read only your own progress" on public.paper_progress;
create policy "Read only your own progress"
  on public.paper_progress for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Create only your own progress" on public.paper_progress;
create policy "Create only your own progress"
  on public.paper_progress for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Update only your own progress" on public.paper_progress;
create policy "Update only your own progress"
  on public.paper_progress for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Delete only your own progress" on public.paper_progress;
create policy "Delete only your own progress"
  on public.paper_progress for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Profiles are readable" on public.profiles;
create policy "Profiles are readable"
  on public.profiles for select
  to anon, authenticated
  using (true);

drop policy if exists "Create your own profile" on public.profiles;
create policy "Create your own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "Update your own profile" on public.profiles;
create policy "Update your own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Anyone may report a problem, signed in or not. They cannot file a report as
-- somebody else, and they cannot file one that is already closed.
drop policy if exists "Anyone can report a problem" on public.paper_reports;
create policy "Anyone can report a problem"
  on public.paper_reports for insert
  to anon, authenticated
  with check (
    status = 'open'
    and resolved_at is null
    and (reporter_id is null or reporter_id = (select auth.uid()))
  );

-- Only the administrator ever sees the inbox.
drop policy if exists "Only the administrator reads reports" on public.paper_reports;
create policy "Only the administrator reads reports"
  on public.paper_reports for select
  to authenticated
  using ((select public.is_library_admin()));

drop policy if exists "Only the administrator closes reports" on public.paper_reports;
create policy "Only the administrator closes reports"
  on public.paper_reports for update
  to authenticated
  using ((select public.is_library_admin()))
  with check ((select public.is_library_admin()));

drop policy if exists "Only the administrator deletes reports" on public.paper_reports;
create policy "Only the administrator deletes reports"
  on public.paper_reports for delete
  to authenticated
  using ((select public.is_library_admin()));

-- ------------------------------------------------------- avatars (storage) --
-- Public bucket; every person may only write inside their own <user-id>/ folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp'];

drop policy if exists "Avatars are publicly readable" on storage.objects;
create policy "Avatars are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'avatars');

drop policy if exists "Users manage their own avatar" on storage.objects;
create policy "Users manage their own avatar"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ---------------------------------------------------------------- grants ----
grant select on public.papers to anon, authenticated;
grant insert, update, delete on public.papers to authenticated;
grant select, insert, update, delete on public.paper_progress to authenticated;
grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;
-- Reporting is open to guests; reading and closing reports is admin-only (RLS).
grant insert on public.paper_reports to anon, authenticated;
grant select, update, delete on public.paper_reports to authenticated;
grant execute on function public.is_library_admin() to authenticated;
revoke all on function public.reorder_papers(uuid[], integer[]) from public, anon;
grant execute on function public.reorder_papers(uuid[], integer[]) to authenticated;
