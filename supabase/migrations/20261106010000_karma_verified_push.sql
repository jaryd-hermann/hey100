-- Persist karma, show it on builders, and push when someone unlocks verified.

alter table public.profiles
  add column if not exists verified_at timestamptz;

create or replace view public.builders with (security_invoker = false) as
select
  p.id,
  p.username,
  p.display_pref,
  p.photo_url,
  case when coalesce((p.visibility ->> 'job')::boolean, true) then p.job end as job,
  case when coalesce((p.visibility ->> 'workplace')::boolean, true) then p.workplace end
    as workplace,
  p.role_tags,
  p.looking_for,
  p.app_interests,
  p.life_tags,
  p.own_words,
  p.links,
  p.created_at,
  case
    when exists (
      select 1 from public.matches m
      where (m.user_a = p.id and m.user_b = (select auth.uid()))
         or (m.user_b = p.id and m.user_a = (select auth.uid()))
    )
    then p.real_name
  end as real_name,
  p.skills,
  p.github_login,
  p.github_commits,
  p.karma
from public.profiles p;

create or replace function public.community_member_directory(p_group_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_community_member(p_group_id) then
    raise exception 'not a member';
  end if;

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'user_id', m.user_id,
          'role', m.role,
          'status', m.status,
          'name', coalesce(nullif(b.real_name, ''), nullif(b.username, ''), 'A builder'),
          'photo', b.photo_url,
          'bio', coalesce(nullif(b.own_words ->> 'bio', ''), nullif(b.job, '')),
          'apps', coalesce(a.apps, 0),
          'commits', b.github_commits,
          'revenue', coalesce(a.revenue, '—'),
          'app_ids', coalesce(a.app_ids, '[]'::jsonb),
          'listings', coalesce(a.listings, '[]'::jsonb),
          'karma', coalesce(b.karma, 0)
        )
        order by m.joined_at
      )
      from public.community_group_members m
      left join public.builders b on b.id = m.user_id
      left join lateral (
        select
          count(*)::int as apps,
          case when bool_or(apps.stage = 'Revenue') then 'Revenue' else '—' end as revenue,
          coalesce(jsonb_agg(apps.id), '[]'::jsonb) as app_ids,
          coalesce(jsonb_agg(jsonb_build_object(
            'id', apps.id,
            'name', apps.name,
            'hue', apps.hue,
            'icon', apps.icon_path
          )), '[]'::jsonb) as listings
        from public.apps
        where apps.owner_id = m.user_id
          and apps.published_at is not null
      ) a on true
      where m.group_id = p_group_id
        and m.status = 'active'
    ),
    '[]'::jsonb
  );
end;
$$;

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
  unlocked boolean := false;
begin
  if me is null then
    return jsonb_build_object('ok', false);
  end if;

  select karma, verified_at into old_karma, already
  from public.profiles
  where id = me;

  update public.profiles
  set karma = greatest(coalesce(p_karma, 0), 0)
  where id = me;

  if already is null and coalesce(old_karma, 0) < 100 and coalesce(p_karma, 0) >= 100 then
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

revoke all on function public.sync_my_karma(integer) from public;
grant execute on function public.sync_my_karma(integer) to authenticated;

update public.profiles p
set
  karma = greatest(p.karma, 100),
  verified_at = coalesce(p.verified_at, now())
from auth.users u
where u.id = p.id
  and lower(u.email) = 'hermannjaryd@gmail.com';
