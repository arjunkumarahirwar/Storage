-- ============================================================================
-- MP Police PYQ Library — Supabase schema
-- Re-runnable. Apply with:  supabase db push   (or paste into the SQL editor)
-- ----------------------------------------------------------------------------
-- papers          one row per PDF stored in Google Drive
-- paper_progress  one row per student per finished paper
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
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.papers
  drop constraint if exists papers_title_check,
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
    );

create index if not exists papers_category_idx on public.papers (category);
create index if not exists papers_created_at_idx on public.papers (created_at desc);
create index if not exists papers_tags_gin_idx on public.papers using gin (tags);

-- -------------------------------------------------------- paper_progress ----
create table if not exists public.paper_progress (
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  paper_id     uuid not null references public.papers (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, paper_id)
);

create index if not exists paper_progress_user_idx on public.paper_progress (user_id);

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

-- ---------------------------------------------------------------- grants ----
grant select on public.papers to anon, authenticated;
grant insert, update, delete on public.papers to authenticated;
grant select, insert, update, delete on public.paper_progress to authenticated;
grant execute on function public.is_library_admin() to authenticated;
