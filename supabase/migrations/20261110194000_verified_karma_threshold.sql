-- The verified badge used to unlock at 100 Block Points. A finished
-- onboarding pays about 325, so that bar was cleared before anyone matched,
-- replied, or gave feedback. 500 sits above a complete onboarding.

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

  if already is null and coalesce(old_karma, 0) < 500 and next_karma >= 500 then
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
