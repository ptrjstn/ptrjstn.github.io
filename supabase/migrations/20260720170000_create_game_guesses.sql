-- Stores anonymous Neuronym guesses submitted through the server-side game API.
create table if not exists public.game_guesses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  puzzle_id text not null check (char_length(puzzle_id) between 1 and 64),
  guess text not null check (char_length(guess) between 1 and 40),
  normalized_guess text not null check (char_length(normalized_guess) between 1 and 40),
  dictionary_word text check (dictionary_word is null or char_length(dictionary_word) between 1 and 40),
  status text not null check (status in ('accepted', 'solved', 'not_in_dictionary', 'processing_error')),
  rank integer check (rank is null or rank between 1 and 1000),
  solved boolean not null default false
);

alter table public.game_guesses enable row level security;

revoke all on table public.game_guesses from anon, authenticated;
grant insert on table public.game_guesses to service_role;

create index if not exists game_guesses_created_at_idx
  on public.game_guesses (created_at desc);

create index if not exists game_guesses_puzzle_id_idx
  on public.game_guesses (puzzle_id);
