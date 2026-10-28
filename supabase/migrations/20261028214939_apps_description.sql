-- Longer listing description, shown under the tags on the app page.
alter table public.apps
  add column if not exists description text not null default '';

alter table public.apps
  drop constraint if exists apps_description_len;

alter table public.apps
  add constraint apps_description_len check (char_length(description) <= 330);
