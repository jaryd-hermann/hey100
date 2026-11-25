-- `onboarded_at` has been waiting for an owner since the profiles migration.
-- Publishing a first listing is what finishing onboarding actually means, so
-- the server stamps it and the client never has to be trusted with it.
--
-- This is why onboarded_at is absent from the client's column grants: an
-- account that signed in but never published should resume onboarding, and a
-- client that could set this flag could skip it.

create or replace function app.stamp_onboarded()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.published_at is null then
    return new;
  end if;

  update public.profiles
  set onboarded_at = coalesce(onboarded_at, now())
  where id = new.owner_id
    and onboarded_at is null;

  return new;
end;
$$;

create trigger apps_stamp_onboarded
  after insert or update of published_at on public.apps
  for each row execute function app.stamp_onboarded();
