-- Two buckets, both public to read and owner-only to write.
--
-- Public read is a deliberate call: listing screenshots appear on
-- hey100.com/{slug} with no account, and a signed URL per image would mean a
-- round trip before the Discover deck can paint. The tradeoff is that a profile
-- photo stays fetchable by anyone holding the URL even if the owner later hides
-- it, so paths are keyed by a random id rather than anything guessable.
--
-- Writes are scoped to a folder named after the owner's id, which is the one
-- rule that keeps builders out of each other's media.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'listing-media',
    'listing-media',
    true,
    26214400, -- 25 MB, enough for a short screen recording
    array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
  ),
  (
    'avatars',
    'avatars',
    true,
    5242880, -- 5 MB
    array['image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Listing media is readable by everyone"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'listing-media');

create policy "Builders write listing media in their own folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'listing-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Builders replace their own listing media"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'listing-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Builders delete their own listing media"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'listing-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Avatars are readable by everyone"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'avatars');

create policy "People write avatars in their own folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "People replace their own avatar"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "People delete their own avatar"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
