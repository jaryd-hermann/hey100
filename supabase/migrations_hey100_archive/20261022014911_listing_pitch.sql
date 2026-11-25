-- Vertical elevator-pitch video on a listing.

alter table public.apps
  add column if not exists pitch_path text,
  add column if not exists pitch_seconds integer;
