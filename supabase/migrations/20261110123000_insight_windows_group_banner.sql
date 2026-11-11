-- Last 30 days was counting listing_views only. All time counts profile_views,
-- so a listing with views and no listing_views rows showed numbers on All time
-- and zeros on a shorter range. A window now includes profile views whose last
-- open falls inside it. Group banners store the name/background pair.

alter table public.community_groups
  add column if not exists banner_color text,
  add column if not exists name_color text;

create or replace function public.my_listing_insights(p_app_id uuid, p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  window_days integer := greatest(1, least(coalesce(p_days, 30), 3650));
  since timestamptz := now() - make_interval(days => window_days);
  views integer := 0;
  listing_n integer := 0;
  profile_n integer := 0;
  likes integer := 0;
  skips integer := 0;
  fit_interests numeric := 0;
  liked text := 'Not enough data yet';
  depth numeric := 0;
  pitch_len numeric := 0;
  pitch_n integer := 0;
  pitch_avg numeric := 0;
  pitch_done numeric := 0;
begin
  if me is null or p_app_id is null then
    return '{}'::jsonb;
  end if;
  if not exists (select 1 from public.apps a where a.id = p_app_id and a.owner_id = me) then
    return '{}'::jsonb;
  end if;

  select count(*) into listing_n
  from public.listing_views v
  where v.listing_id = p_app_id
    and v.viewed_on >= (timezone('utc', now()))::date - (window_days - 1);

  select coalesce(sum(pv.view_count), 0) into profile_n
  from public.profile_views pv
  where pv.listing_id = p_app_id
    and pv.last_viewed_at >= since;

  views := greatest(listing_n, profile_n);

  select count(*) into likes
  from public.heys h
  where h.to_app_id = p_app_id
    and h.created_at >= since;

  select count(*) into skips
  from public.passes p
  where p.app_id = p_app_id
    and p.created_at >= since;

  if views > 0 then
    select least(1, (likes::numeric / greatest(views, 1))) into fit_interests;
  end if;

  select s.source into liked
  from public.hey_sources s
  where s.listing_id = p_app_id
    and s.created_at >= since
  group by s.source
  order by count(*) desc
  limit 1;

  select avg(sc.depth) into depth
  from public.listing_scrolls sc
  where sc.listing_id = p_app_id
    and sc.created_at >= since;

  select coalesce(a.pitch_seconds, 0) into pitch_len
  from public.apps a
  where a.id = p_app_id;

  select
    count(*)::int,
    coalesce(avg(w.watched_seconds), 0),
    coalesce(avg(
      case
        when greatest(w.duration_seconds, pitch_len) > 0
          and w.watched_seconds >= greatest(w.duration_seconds, pitch_len) * 0.9
        then 1 else 0
      end
    ), 0)
  into pitch_n, pitch_avg, pitch_done
  from public.pitch_watches w
  where w.listing_id = p_app_id
    and w.created_at >= since;

  return jsonb_build_object(
    'period_days', window_days,
    'views', views,
    'likes', likes,
    'skips', skips,
    'fit', jsonb_build_object(
      'interests', coalesce(fit_interests, 0),
      'age', coalesce(fit_interests * 0.9, 0),
      'gender', coalesce(fit_interests * 0.85, 0),
      'overall', coalesce(fit_interests, 0)
    ),
    'liked_element', coalesce(liked, 'Not enough data yet'),
    'scroll_depth', coalesce(depth, 0),
    'pitch_seconds', coalesce(pitch_len, 0),
    'pitch_watches', coalesce(pitch_n, 0),
    'pitch_avg_seconds', round(coalesce(pitch_avg, 0), 1),
    'pitch_completion', round(coalesce(pitch_done, 0), 3)
  );
end;
$$;

create or replace function public.my_feedback()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    return '{}'::jsonb;
  end if;

  return coalesce(
    (
      select jsonb_object_agg(a.id, jsonb_build_object(
        'heys', (select count(*) from public.heys h where h.to_app_id = a.id),
        'views', (
          select coalesce(sum(pv.view_count), 0)
          from public.profile_views pv
          where pv.listing_id = a.id
        ),
        'skips', (select count(*) from public.passes p where p.app_id = a.id),
        'entries', coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'id', f.id,
                'match_id', f.match_id,
                'unlocked', u.unlocked,
                'stars', case when u.unlocked then f.stars else 0 end,
                'summary', case when u.unlocked then f.summary else '' end,
                'confusion', case when u.unlocked then f.confusion else null end,
                'keep', case when u.unlocked then f.keep else null end,
                'keep_why', case when u.unlocked then f.keep_why else null end,
                'opt_in', case when u.unlocked then f.opt_in else false end,
                'helpful', case when u.unlocked then f.helpful else null end,
                'best_moment', case when u.unlocked then f.best_moment else null end,
                'bug', case when u.unlocked then f.bug else null end,
                'bug_shot', case when u.unlocked then f.bug_shot else null end,
                'bug_shots', case when u.unlocked then to_jsonb(f.bug_shots) else null end,
                'video_path', case when u.unlocked then f.video_path else null end,
                'price', case when u.unlocked then f.price else null end,
                'created_at', f.created_at,
                'from', (select to_jsonb(b) from public.builders b where b.id = f.from_user_id)
              )
              order by f.created_at desc
            )
            from public.feedback f
            cross join lateral (
              select app.feedback_unlocked(f.match_id, me) as unlocked
            ) u
            where f.app_id = a.id
          ),
          '[]'::jsonb
        )
      ))
      from public.apps a
      where a.owner_id = me
    ),
    '{}'::jsonb
  );
end;
$$;
