-- Switch the Dark Soon scoreboard from 3-letter initials to names (up to 12 letters).
-- Paste into Supabase: SQL Editor > New query > Run. Safe to run once.
alter table public.scores drop constraint if exists scores_initials_check;
alter table public.scores rename column initials to name;
alter table public.scores add constraint scores_name_check
  check (char_length(name) between 1 and 12 and name ~ '^[A-Za-z0-9 ._!''-]+$');
