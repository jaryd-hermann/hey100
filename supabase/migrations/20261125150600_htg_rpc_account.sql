-- htg.chat RPCs: account state, consent, invites, account deletion.

-- Everything the app needs to route a signed-in user (onboarding step, plan,
-- placement) and render their entitlements, in one round trip.
create or replace function public.me()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, app
as $$
declare
  me uuid := auth.uid();
  v_plan text;
  asks_used integer;
begin
  if me is null then
    return null;
  end if;

  v_plan := app.user_plan(me);

  select count(*)::integer into asks_used
  from public.tldr_asks a
  join public.profiles p on p.id = a.user_id
  where a.user_id = me
    and a.created_at >= date_trunc('month', now() at time zone p.timezone) at time zone p.timezone;

  return (
    select jsonb_build_object(
      'profile', to_jsonb(p) - 'notification_prefs',
      'notification_prefs', p.notification_prefs,
      'product', (select to_jsonb(pr) from public.products pr where pr.user_id = me),
      'revenue', (
        select jsonb_build_object(
          'provider', rc.provider,
          'status', rc.status,
          'band_id', rc.band_id,
          'mrr_cents', rc.mrr_cents,
          'subscriptions', rc.subscriptions,
          'commits_90d', rc.commits_90d,
          'verified_at', rc.verified_at,
          'grace_until', rc.grace_until,
          'error', rc.error
        )
        from public.revenue_connections rc where rc.user_id = me
      ),
      'band_id', app.user_band(me),
      'plan', v_plan,
      'primary_group_id', app.primary_group(me),
      'invite_code', (select code from public.invite_codes where user_id = me),
      'entitlements', jsonb_build_object(
        'weekly_peeks_total', case when v_plan = 'pro' then app.setting_int('pro_peeks_per_week') else 0 end,
        'weekly_peeks_used', app.weekly_peeks_used(me),
        'peek_credits', app.peek_credits(me),
        'peek_band_range', case when v_plan = 'ultimate' then null else app.setting_int('pro_peek_band_range') end,
        'can_eavesdrop', v_plan = 'ultimate',
        'asks_total', case when v_plan = 'member' then app.setting_int('member_asks_per_month') end,
        'asks_used', asks_used,
        'category_changes_left', greatest(0, app.setting_int('category_changes_per_month') - (
          select count(*)::integer from public.category_changes c
          where c.user_id = me
            and c.created_at >= date_trunc('month', now() at time zone p.timezone) at time zone p.timezone
        ))
      )
    )
    from public.profiles p
    where p.id = me
  );
end;
$$;

-- Apple 1.2: terms (zero tolerance for objectionable content) before any UGC.
create or replace function public.accept_terms()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles set terms_accepted_at = coalesce(terms_accepted_at, now()) where id = auth.uid();
$$;

-- Apple 5.1.2(i): explicit consent before answers reach third-party AI.
-- AI jobs skip anyone without ai_consent_at.
create or replace function public.set_ai_consent(p_consent boolean)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set ai_consent_at = case when p_consent then coalesce(ai_consent_at, now()) end
  where id = auth.uid();
$$;

-- The hey100.com/i/{code} landing page asks this before sign-in.
create or replace function public.invite_code_status(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select jsonb_build_object('valid', true, 'inviter', nullif(p.name, ''))
      from public.invite_codes c
      join public.profiles p on p.id = c.user_id
      where c.code = upper(btrim(p_code)) and p.banned_at is null
    ),
    jsonb_build_object('valid', false, 'inviter', null)
  );
$$;

-- Stores the code someone arrived with. Credits are granted later, when they
-- are placed and subscribed (app.grant_invite_credits).
create or replace function public.redeem_invite(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  inviter uuid;
  clean text := upper(btrim(p_code));
begin
  if me is null then
    return jsonb_build_object('status', 'error', 'reason', 'not_signed_in');
  end if;

  select user_id into inviter from public.invite_codes where code = clean;
  if inviter is null then
    return jsonb_build_object('status', 'error', 'reason', 'unknown_code');
  end if;
  if inviter = me then
    return jsonb_build_object('status', 'error', 'reason', 'own_code');
  end if;

  insert into public.invite_redemptions (code, inviter_id, invitee_id)
  values (clean, inviter, me)
  on conflict (invitee_id) do nothing;

  return jsonb_build_object('status', 'ok');
end;
$$;

-- Account deletion, step 1 (called by the delete-account function with the
-- service role, after it removes storage objects and before it deletes the
-- auth user). Group messages stay as "Deleted account" with the body wiped,
-- so other people's thread replies survive; everything else cascades.
create or replace function app.scrub_user_content(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  media_paths text[];
  dm_paths text[];
begin
  select coalesce(array_agg(mm.path), '{}') into media_paths
  from public.message_media mm
  join public.messages m on m.id = mm.message_id
  where m.author_id = p_user;

  select coalesce(array_agg(dm.path), '{}') into dm_paths
  from public.dm_media dm
  join public.dm_messages m on m.id = dm.dm_message_id
  where m.sender_id = p_user;

  delete from public.message_media mm using public.messages m
  where m.id = mm.message_id and m.author_id = p_user;

  update public.messages
  set body = '', deleted_at = coalesce(deleted_at, now())
  where author_id = p_user;

  update public.dm_messages
  set body = '', quote_snapshot = null, deleted_at = coalesce(deleted_at, now())
  where sender_id = p_user;

  delete from public.revenue_secrets where user_id = p_user;

  return jsonb_build_object('message_media', to_jsonb(media_paths), 'dm_media', to_jsonb(dm_paths));
end;
$$;

create or replace function public.admin_scrub_user_content(p_user uuid)
returns jsonb
language sql
security definer
set search_path = app, public
as $$
  select app.scrub_user_content(p_user);
$$;

revoke all on function public.me() from public, anon;
revoke all on function public.accept_terms() from public, anon;
revoke all on function public.set_ai_consent(boolean) from public, anon;
revoke all on function public.redeem_invite(text) from public, anon;
revoke all on function public.admin_scrub_user_content(uuid) from public, anon, authenticated;

grant execute on function public.me() to authenticated;
grant execute on function public.accept_terms() to authenticated;
grant execute on function public.set_ai_consent(boolean) to authenticated;
grant execute on function public.redeem_invite(text) to authenticated;
grant execute on function public.invite_code_status(text) to anon, authenticated;
grant execute on function public.admin_scrub_user_content(uuid) to service_role;
