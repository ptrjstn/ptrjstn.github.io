alter table public.game_guesses
  alter column guess drop not null,
  alter column normalized_guess drop not null,
  drop constraint if exists game_guesses_status_check,
  drop constraint if exists game_guesses_attempt_number_range;

alter table public.game_guesses
  add constraint game_guesses_status_check
    check (status in (
      'accepted',
      'solved',
      'not_in_dictionary',
      'duplicate',
      'invalid_format',
      'processing_error',
      'configuration_error',
      'gave_up'
    )),
  add constraint game_guesses_attempt_number_range
    check (attempt_number is null or attempt_number between 0 and 10000),
  add constraint game_guesses_guess_payload
    check (
      (status = 'gave_up' and guess is null and normalized_guess is null)
      or
      (status <> 'gave_up' and guess is not null and normalized_guess is not null)
    );
