-- Cubi's Reef Rush: online ranking table.
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

create table if not exists public.scores (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name       text    not null check (char_length(name) between 1 and 16),
  level      int     not null check (level between 0 and 50),
  score      int     not null check (score between 0 and 100000),
  pearls     int     not null default 0 check (pearls between 0 and 1000),
  distance   int     not null default 0 check (distance between 0 and 5000),
  won        boolean not null default false
);

create index if not exists scores_level_score on public.scores (level, score desc);

-- Row Level Security: players may only READ scores and ADD new ones.
-- There are no update/delete policies, so nobody can change or remove scores from the game.
alter table public.scores enable row level security;

drop policy if exists "read scores" on public.scores;
create policy "read scores" on public.scores for select to anon using (true);

drop policy if exists "add scores" on public.scores;
create policy "add scores" on public.scores for insert to anon with check (true);

grant select, insert on public.scores to anon;
