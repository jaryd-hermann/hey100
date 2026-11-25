-- Two fields the client already renders that section 9 does not list.
--
-- `app_media.label` is the caption under a shot ("Home screen"), which the
-- design uses as the placeholder before an image finishes uploading.
--
-- `apps.test_code` is the TestFlight or promo code the trade card offers, which
-- is the thing actually being swapped once two builders match.

alter table public.app_media
  add column label text check (char_length(label) <= 40);

alter table public.apps
  add column test_code text check (char_length(test_code) <= 40);

grant insert (test_code), update (test_code) on public.apps to authenticated;
