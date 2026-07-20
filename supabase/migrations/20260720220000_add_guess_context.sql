alter table public.game_guesses
  add column if not exists target_word text,
  add column if not exists attempt_number integer;

update public.game_guesses
set target_word = (array[
  'Sternwarte',
  'Gewitter',
  'Bibliothek',
  'Schatten',
  'Kompass',
  'Leuchtturm',
  'Sehnsucht'
])[mod(substring(puzzle_id from '-g([0-9]+)$')::integer, 7) + 1]
where target_word is null
  and puzzle_id ~ '-g[0-9]+$';

alter table public.game_guesses
  alter column target_word set not null,
  add constraint game_guesses_target_word_length
    check (char_length(target_word) between 1 and 40),
  add constraint game_guesses_attempt_number_range
    check (attempt_number is null or attempt_number between 1 and 10000);
