-- Dark Soon scoreboard. Paste all of this into Supabase: SQL Editor > New query > Run.
-- Players can only ADD a play or a score and READ the scores. Nobody can change or delete anything from the game.

create table if not exists public.plays (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  diff text not null check (diff in ('easy', 'medium', 'hard'))
);

create table if not exists public.scores (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 12 and name ~ '^[A-Za-z0-9 ._!''-]+$'),
  diff text not null check (diff in ('easy', 'medium', 'hard')),
  seconds integer not null check (seconds between 300 and 86400),
  golden integer not null default 0 check (golden between 0 and 17)
);

-- the game (the 'anon' role) may only add plays, and add or read scores
grant usage on schema public to anon;
grant insert on public.plays to anon;
grant select, insert on public.scores to anon;
grant usage on all sequences in schema public to anon;

alter table public.plays enable row level security;
alter table public.scores enable row level security;

create policy "anyone can log a play" on public.plays for insert to anon with check (true);
create policy "anyone can add a score" on public.scores for insert to anon with check (true);
create policy "anyone can read scores" on public.scores for select to anon using (true);

-- How many games have been started, without letting the game read the plays table itself.
create or replace function public.play_count() returns bigint
language sql security definer set search_path = public as $$ select count(*) from public.plays $$;
grant execute on function public.play_count() to anon;
