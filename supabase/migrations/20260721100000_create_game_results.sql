create table if not exists public.game_results (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  puzzle_id text not null,
  steps integer not null check (steps between 1 and 10000),
  duration_seconds integer not null check (duration_seconds between 0 and 86400)
);
alter table public.game_results enable row level security;
revoke all on table public.game_results from anon, authenticated;
grant select, insert on table public.game_results to service_role;
create index if not exists game_results_puzzle_steps_idx on public.game_results (puzzle_id, steps);
