alter table public.game_guesses drop constraint if exists game_guesses_status_check;
alter table public.game_guesses add constraint game_guesses_status_check check (status in (
  'accepted', 'solved', 'rejected', 'not_in_dictionary', 'duplicate', 'invalid_format',
  'processing_error', 'configuration_error', 'gave_up'
));
