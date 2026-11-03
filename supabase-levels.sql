-- Cubi's Reef Rush: shared player levels (run once in Supabase -> SQL Editor -> Run).

create table if not exists public.levels (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name       text not null check (char_length(name) between 1 and 40),
  author     text not null check (char_length(author) between 1 and 16),
  length     int  not null check (length between 60 and 2000),
  items      int  not null default 0 check (items between 3 and 600),
  data       jsonb not null check (octet_length(data::text) < 120000),
  plays      int  not null default 0,
  likes      int  not null default 0
);
create index if not exists levels_created on public.levels (created_at desc);

alter table public.levels enable row level security;
drop policy if exists "read levels" on public.levels;
create policy "read levels" on public.levels for select to anon using (true);
-- new levels always start with 0 plays / 0 likes
drop policy if exists "add levels" on public.levels;
create policy "add levels" on public.levels for insert to anon with check (plays = 0 and likes = 0);
grant select, insert on public.levels to anon;

-- counting plays and likes goes through these two functions only (players cannot edit levels directly)
create or replace function public.play_level(lid bigint) returns void
  language sql security definer set search_path = public as
  $$ update public.levels set plays = plays + 1 where id = lid; $$;
create or replace function public.like_level(lid bigint) returns void
  language sql security definer set search_path = public as
  $$ update public.levels set likes = likes + 1 where id = lid; $$;
grant execute on function public.play_level(bigint) to anon;
grant execute on function public.like_level(bigint) to anon;

-- rankings for shared levels use level numbers 1000 + level id
alter table public.scores drop constraint if exists scores_level_check;
alter table public.scores add constraint scores_level_check check (level between 0 and 1000000000);
