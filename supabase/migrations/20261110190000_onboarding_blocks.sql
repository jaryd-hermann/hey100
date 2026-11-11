-- Blocks earned while building a profile in onboarding. The client reports
-- the total once, at sign-in. Activity karma stays separate and is added on
-- top whenever the app syncs, so a later sync cannot wipe the onboarding earn.

alter table public.profiles
  add column if not exists onboarding_blocks integer not null default 0;

comment on column public.profiles.onboarding_blocks is
  'Block Points earned by completing onboarding. Written once by record_onboarding_blocks.';

create or replace function public.record_onboarding_blocks(p_blocks integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  incoming integer := least(greatest(coalesce(p_blocks, 0), 0), 400);
  already integer := 0;
begin
  if me is null then
    return;
  end if;

  select onboarding_blocks into already
  from public.profiles
  where id = me
  for update;

  if incoming <= coalesce(already, 0) then
    return;
  end if;

  update public.profiles
  set
    onboarding_blocks = incoming,
    karma = coalesce(karma, 0) + (incoming - coalesce(already, 0))
  where id = me;
end;
$$;

revoke all on function public.record_onboarding_blocks(integer) from public;
grant execute on function public.record_onboarding_blocks(integer) to authenticated;

-- Activity score is synced on its own. Onboarding blocks are added here so the
-- stored total keeps both, including when the client has not loaded the column yet.
create or replace function public.sync_my_karma(p_karma integer)
returns jsonb
language plpgsql
security definer
set search_path = public, app
as $$
declare
  me uuid := auth.uid();
  old_karma integer := 0;
  already timestamptz;
  onboarded integer := 0;
  next_karma integer := 0;
  unlocked boolean := false;
begin
  if me is null then
    return jsonb_build_object('ok', false);
  end if;

  select karma, verified_at, onboarding_blocks into old_karma, already, onboarded
  from public.profiles
  where id = me;

  next_karma := greatest(coalesce(p_karma, 0), 0) + greatest(coalesce(onboarded, 0), 0);

  update public.profiles
  set karma = next_karma
  where id = me;

  if already is null and coalesce(old_karma, 0) < 100 and next_karma >= 100 then
    update public.profiles
    set verified_at = now()
    where id = me;
    unlocked := true;
    perform app.enqueue_push(
      me,
      'verified',
      'verified:' || me::text,
      'You earned a verified badge',
      'Thanks for being a great community member. Tap to see your badge.',
      '/profile?verified=1',
      jsonb_build_object('path', '/profile?verified=1')
    );
  end if;

  return jsonb_build_object('ok', true, 'unlocked', unlocked);
end;
$$;
