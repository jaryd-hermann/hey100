-- Ten media slots per listing instead of six. The App Store allows ten
-- screenshots and builders arrive with all of them, so the carousel holds the
-- same number rather than making them choose six.
--
-- The composite primary key still does the capping; only the range moves.
alter table public.app_media
  drop constraint app_media_position_check,
  add constraint app_media_position_check check (position between 0 and 9);
