-- Advanced analytics overlap the people who opened a listing with their
-- profile (interests, devices, job) and with hey, pass, scroll, and pitch rows.
-- Age and gender are not collected on a person, so those rates stay null.

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
  series_days integer := least(window_days, 90);
  series_since timestamptz := now() - make_interval(days => series_days);
  bucket interval := make_interval(secs => greatest(series_days, 1) * 86400.0 / 8);
  views integer := 0;
  listing_n integer := 0;
  profile_n integer := 0;
  likes integer := 0;
  skips integer := 0;
  viewer_n integer := 0;
  acted integer := 0;
  acted_hey integer := 0;
  interest_acted integer := 0;
  interest_hey integer := 0;
  device_acted integer := 0;
  device_hey integer := 0;
  fit_overall numeric;
  fit_interests numeric;
  fit_devices numeric;
  liked text;
  depth numeric;
  scroll_n integer := 0;
  pitch_len numeric := 0;
  pitch_n integer := 0;
  pitch_avg numeric := 0;
  pitch_done numeric := 0;
  target jsonb := '{}'::jsonb;
  interests_json jsonb := '[]'::jsonb;
  jobs_json jsonb := '[]'::jsonb;
  devices_json jsonb := '[]'::jsonb;
  views_series jsonb := '[]'::jsonb;
  heys_series jsonb := '[]'::jsonb;
  skips_series jsonb := '[]'::jsonb;
  scroll_series jsonb := '[]'::jsonb;
  pitch_series jsonb := '[]'::jsonb;
  i integer;
  b0 timestamptz;
  b1 timestamptz;
  bucket_n integer;
  bucket_avg numeric;
begin
  if me is null or p_app_id is null then
    return '{}'::jsonb;
  end if;
  if not exists (select 1 from public.apps a where a.id = p_app_id and a.owner_id = me) then
    return '{}'::jsonb;
  end if;

  select coalesce(a.ideal_users, '{}'::jsonb), coalesce(a.pitch_seconds, 0)
  into target, pitch_len
  from public.apps a
  where a.id = p_app_id;

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

  with viewers as (
    select v.viewer_id as id
    from public.listing_views v
    where v.listing_id = p_app_id
      and v.viewed_on >= (timezone('utc', now()))::date - (window_days - 1)
    union
    select pv.viewer_id
    from public.profile_views pv
    where pv.listing_id = p_app_id
      and pv.last_viewed_at >= since
  ),
  marked as (
    select
      vw.id,
      exists (
        select 1 from public.heys h
        where h.to_app_id = p_app_id
          and h.from_user_id = vw.id
          and h.created_at >= since
      ) as heyed,
      exists (
        select 1 from public.passes p
        where p.app_id = p_app_id
          and p.user_id = vw.id
          and p.created_at >= since
      ) as passed,
      exists (
        select 1
        from public.profiles pr
        cross join lateral unnest(coalesce(pr.app_interests, '{}')) interest
        join lateral jsonb_array_elements_text(coalesce(target->'interests', '[]'::jsonb)) want on true
        where pr.id = vw.id
          and lower(btrim(interest)) = lower(btrim(want))
          and btrim(want) <> ''
      ) as interest_match,
      exists (
        select 1
        from public.profiles pr
        cross join lateral unnest(coalesce(pr.test_devices, '{}')) device
        join lateral jsonb_array_elements_text(coalesce(target->'devices', '[]'::jsonb)) want on true
        where pr.id = vw.id
          and lower(btrim(device)) = lower(btrim(want))
          and btrim(want) <> ''
      ) as device_match
    from viewers vw
  )
  select
    count(*)::int,
    count(*) filter (where heyed or passed)::int,
    count(*) filter (where heyed and (heyed or passed))::int,
    count(*) filter (where interest_match and (heyed or passed))::int,
    count(*) filter (where interest_match and heyed)::int,
    count(*) filter (where device_match and (heyed or passed))::int,
    count(*) filter (where device_match and heyed)::int
  into viewer_n, acted, acted_hey, interest_acted, interest_hey, device_acted, device_hey
  from marked;

  if acted > 0 then
    fit_overall := acted_hey::numeric / acted;
  end if;
  if interest_acted > 0 then
    fit_interests := interest_hey::numeric / interest_acted;
  end if;
  if device_acted > 0 then
    fit_devices := device_hey::numeric / device_acted;
  end if;

  select label into liked
  from (
    select h.target_label as label, count(*) as n
    from public.heys h
    where h.to_app_id = p_app_id
      and h.created_at >= since
      and btrim(coalesce(h.target_label, '')) <> ''
    group by h.target_label
    union all
    select s.source, count(*)
    from public.hey_sources s
    where s.listing_id = p_app_id
      and s.created_at >= since
      and btrim(coalesce(s.source, '')) <> ''
    group by s.source
  ) sources
  group by label
  order by sum(n) desc
  limit 1;

  select avg(sc.depth), count(*)::int
  into depth, scroll_n
  from public.listing_scrolls sc
  where sc.listing_id = p_app_id
    and sc.created_at >= since;

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

  select coalesce(jsonb_agg(jsonb_build_object('label', label, 'pct', pct) order by n desc), '[]'::jsonb)
  into interests_json
  from (
    select label, n, round(100.0 * n / greatest(viewer_n, 1))::int as pct
    from (
      select btrim(tag) as label, count(distinct pr.id)::int as n
      from (
        select v.viewer_id as id
        from public.listing_views v
        where v.listing_id = p_app_id
          and v.viewed_on >= (timezone('utc', now()))::date - (window_days - 1)
        union
        select pv.viewer_id
        from public.profile_views pv
        where pv.listing_id = p_app_id
          and pv.last_viewed_at >= since
      ) vw
      join public.profiles pr on pr.id = vw.id
      cross join lateral unnest(coalesce(pr.app_interests, '{}')) tag
      where btrim(tag) <> ''
      group by btrim(tag)
    ) counted
    order by n desc
    limit 6
  ) ranked;

  select coalesce(jsonb_agg(jsonb_build_object('label', label, 'pct', pct) order by n desc), '[]'::jsonb)
  into jobs_json
  from (
    select label, n, round(100.0 * n / greatest(viewer_n, 1))::int as pct
    from (
      select label, count(*)::int as n
      from (
        select coalesce(nullif(btrim(pr.job), ''), nullif(btrim(pr.role_tags[1]), '')) as label
        from (
          select v.viewer_id as id
          from public.listing_views v
          where v.listing_id = p_app_id
            and v.viewed_on >= (timezone('utc', now()))::date - (window_days - 1)
          union
          select pv.viewer_id
          from public.profile_views pv
          where pv.listing_id = p_app_id
            and pv.last_viewed_at >= since
        ) vw
        join public.profiles pr on pr.id = vw.id
      ) named
      where label is not null
      group by label
    ) counted
    order by n desc
    limit 6
  ) ranked;

  select coalesce(jsonb_agg(jsonb_build_object('label', label, 'pct', pct) order by n desc), '[]'::jsonb)
  into devices_json
  from (
    select label, n, round(100.0 * n / greatest(viewer_n, 1))::int as pct
    from (
      select btrim(tag) as label, count(distinct pr.id)::int as n
      from (
        select v.viewer_id as id
        from public.listing_views v
        where v.listing_id = p_app_id
          and v.viewed_on >= (timezone('utc', now()))::date - (window_days - 1)
        union
        select pv.viewer_id
        from public.profile_views pv
        where pv.listing_id = p_app_id
          and pv.last_viewed_at >= since
      ) vw
      join public.profiles pr on pr.id = vw.id
      cross join lateral unnest(coalesce(pr.test_devices, '{}')) tag
      where btrim(tag) <> ''
      group by btrim(tag)
    ) counted
    order by n desc
    limit 6
  ) ranked;

  for i in 0..7 loop
    b0 := series_since + (i * bucket);
    b1 := series_since + ((i + 1) * bucket);

    select count(*)::int into bucket_n
    from (
      select v.viewer_id as id
      from public.listing_views v
      where v.listing_id = p_app_id
        and v.viewed_on >= b0::date
        and v.viewed_on < b1::date
      union
      select pv.viewer_id
      from public.profile_views pv
      where pv.listing_id = p_app_id
        and pv.last_viewed_at >= b0
        and pv.last_viewed_at < b1
    ) people;
    views_series := views_series || to_jsonb(bucket_n);

    select count(*)::int into bucket_n
    from public.heys h
    where h.to_app_id = p_app_id
      and h.created_at >= b0
      and h.created_at < b1;
    heys_series := heys_series || to_jsonb(bucket_n);

    select count(*)::int into bucket_n
    from public.passes p
    where p.app_id = p_app_id
      and p.created_at >= b0
      and p.created_at < b1;
    skips_series := skips_series || to_jsonb(bucket_n);

    select round(avg(sc.depth) * 100) into bucket_avg
    from public.listing_scrolls sc
    where sc.listing_id = p_app_id
      and sc.created_at >= b0
      and sc.created_at < b1;
    scroll_series := scroll_series || to_jsonb(coalesce(bucket_avg, 0));

    select round(avg(w.watched_seconds), 1) into bucket_avg
    from public.pitch_watches w
    where w.listing_id = p_app_id
      and w.created_at >= b0
      and w.created_at < b1;
    pitch_series := pitch_series || to_jsonb(coalesce(bucket_avg, 0));
  end loop;

  return jsonb_build_object(
    'period_days', window_days,
    'views', views,
    'likes', likes,
    'skips', skips,
    'viewers', viewer_n,
    'fit', jsonb_build_object(
      'interests', fit_interests,
      'devices', fit_devices,
      'age', null,
      'gender', null,
      'overall', fit_overall
    ),
    'liked_element', coalesce(liked, 'Not enough data yet'),
    'scroll_depth', case when scroll_n > 0 then depth else null end,
    'pitch_seconds', coalesce(pitch_len, 0),
    'pitch_watches', coalesce(pitch_n, 0),
    'pitch_avg_seconds', case when pitch_n > 0 then round(pitch_avg, 1) else null end,
    'pitch_completion', case when pitch_n > 0 then round(pitch_done, 3) else null end,
    'audience', jsonb_build_object(
      'viewers', viewer_n,
      'interests', interests_json,
      'jobs', jobs_json,
      'devices', devices_json
    ),
    'series', jsonb_build_object(
      'views', views_series,
      'heys', heys_series,
      'skips', skips_series,
      'scroll', scroll_series,
      'pitch', pitch_series
    )
  );
end;
$$;
