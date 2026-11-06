-- Daily listing visibility, richer feedback, listing insights, builder groups, karma.

alter table public.feedback
  add column if not exists keep_why text,
  add column if not exists bug_shots text[],
  add column if not exists video_path text;

alter table public.profiles
  add column if not exists karma integer not null default 0;

create table if not exists public.listing_views (
  listing_id uuid not null references public.apps (id) on delete cascade,
  viewer_id uuid not null references auth.users (id) on delete cascade,
  viewed_on date not null default (timezone('utc', now()))::date,
  created_at timestamptz not null default now(),
  primary key (listing_id, viewer_id, viewed_on)
);

create index if not exists listing_views_listing_day_idx
  on public.listing_views (listing_id, viewed_on);

create table if not exists public.listing_scrolls (
  id bigint generated always as identity primary key,
  listing_id uuid not null references public.apps (id) on delete cascade,
  viewer_id uuid not null references auth.users (id) on delete cascade,
  depth numeric not null check (depth >= 0 and depth <= 1),
  created_at timestamptz not null default now()
);

create index if not exists listing_scrolls_listing_idx
  on public.listing_scrolls (listing_id, created_at desc);

create table if not exists public.hey_sources (
  id bigint generated always as identity primary key,
  listing_id uuid not null references public.apps (id) on delete cascade,
  from_user_id uuid not null references auth.users (id) on delete cascade,
  source text not null,
  created_at timestamptz not null default now()
);

create index if not exists hey_sources_listing_idx
  on public.hey_sources (listing_id, created_at desc);

alter table public.listing_views enable row level security;
alter table public.listing_scrolls enable row level security;
alter table public.hey_sources enable row level security;

create or replace function app.listing_on_cooldown(p_app_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.apps a
    join public.profiles p on p.id = a.owner_id
    where a.id = p_app_id
      and p.plan <> 'pro'
      and (
        select count(*)
        from public.listing_views v
        where v.listing_id = a.id
          and v.viewed_on = (timezone('utc', now()))::date
      ) >= 6
  );
$$;

create or replace function public.record_profile_view(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  owner uuid;
  inserted integer := 0;
  views_today integer;
begin
  if me is null or p_listing_id is null then
    return;
  end if;

  select owner_id into owner
  from public.apps
  where id = p_listing_id
    and published_at is not null;

  if owner is null or owner = me then
    return;
  end if;

  insert into public.profile_views (viewer_id, profile_id, listing_id)
  values (me, owner, p_listing_id)
  on conflict (viewer_id, profile_id) do update
    set view_count = public.profile_views.view_count + 1,
        last_viewed_at = now(),
        listing_id = coalesce(excluded.listing_id, public.profile_views.listing_id);

  insert into public.listing_views (listing_id, viewer_id, viewed_on)
  values (p_listing_id, me, (timezone('utc', now()))::date)
  on conflict do nothing;

  get diagnostics inserted = row_count;

  if inserted > 0 then
    select count(*) into views_today
    from public.listing_views
    where listing_id = p_listing_id
      and viewed_on = (timezone('utc', now()))::date;

    if views_today = 6 then
      perform app.enqueue_push(
        owner,
        'cooldown',
        'cooldown:' || p_listing_id::text || ':' || (timezone('utc', now()))::date::text,
        'Your listing hit today''s view limit',
        'Upgrade for unlimited views and stay in Discover.',
        '/apps',
        jsonb_build_object('listingId', p_listing_id, 'path', '/apps')
      );
    end if;
  end if;
end;
$$;

create or replace function public.my_listing_cooldowns()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'listing_id', a.id,
          'views_today', (
            select count(*)
            from public.listing_views v
            where v.listing_id = a.id
              and v.viewed_on = (timezone('utc', now()))::date
          ),
          'resets_at', ((timezone('utc', now()))::date + 1)::timestamptz
        )
      )
      from public.apps a
      where a.owner_id = auth.uid()
    ),
    '[]'::jsonb
  );
$$;

create or replace function public.record_listing_scroll(p_listing_id uuid, p_depth numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null or p_listing_id is null then
    return;
  end if;
  if exists (select 1 from public.apps a where a.id = p_listing_id and a.owner_id = me) then
    return;
  end if;
  insert into public.listing_scrolls (listing_id, viewer_id, depth)
  values (p_listing_id, me, least(1, greatest(0, coalesce(p_depth, 0))));
end;
$$;

create or replace function public.record_hey_source(p_listing_id uuid, p_source text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null or p_listing_id is null or nullif(btrim(p_source), '') is null then
    return;
  end if;
  insert into public.hey_sources (listing_id, from_user_id, source)
  values (p_listing_id, me, left(btrim(p_source), 80));
end;
$$;

create or replace function public.my_listing_insights(p_app_id uuid, p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  since timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)));
  interests text;
  views integer := 0;
  likes integer := 0;
  skips integer := 0;
  fit_interests numeric := 0;
  liked text := 'Not enough data yet';
  depth numeric := 0;
begin
  if me is null or p_app_id is null then
    return '{}'::jsonb;
  end if;
  if not exists (select 1 from public.apps a where a.id = p_app_id and a.owner_id = me) then
    return '{}'::jsonb;
  end if;

  select a.ideal_users into interests
  from public.apps a
  where a.id = p_app_id;

  select count(*) into views
  from public.listing_views v
  where v.listing_id = p_app_id
    and v.created_at >= since;

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

  return jsonb_build_object(
    'period_days', greatest(1, least(coalesce(p_days, 30), 365)),
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
    'scroll_depth', coalesce(depth, 0)
  );
end;
$$;

create or replace function public.builder_public_groups(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', g.id,
          'name', g.name,
          'bio', g.bio,
          'audience', g.audience,
          'cover_path', g.cover_path,
          'join_mode', g.join_mode,
          'kind', g.kind,
          'created_by', g.created_by,
          'member_count', (
            select count(*) from public.community_group_members m
            where m.group_id = g.id and m.status = 'active'
          ),
          'membership', (
            select vm.status
            from public.community_group_members vm
            where vm.group_id = g.id and vm.user_id = auth.uid()
          )
        )
        order by g.name
      )
      from public.community_groups g
      join public.community_group_members mine
        on mine.group_id = g.id
       and mine.user_id = p_user_id
       and mine.status = 'active'
      where g.join_mode is distinct from 'match'
    ),
    '[]'::jsonb
  );
$$;

drop function if exists public.leave_feedback(uuid, smallint, text, text, text, boolean, text, text, text, text);

create or replace function public.leave_feedback(
  p_match_id uuid,
  p_stars smallint,
  p_summary text,
  p_confusion text default null,
  p_keep text default null,
  p_opt_in boolean default false,
  p_best_moment text default null,
  p_bug text default null,
  p_bug_shot text default null,
  p_price text default null,
  p_keep_why text default null,
  p_bug_shots text[] default null,
  p_video_path text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  thread public.matches;
  their_app uuid;
  them uuid;
  feedback_id uuid;
  media jsonb := '[]'::jsonb;
begin
  select * into thread from public.matches where id = p_match_id and me in (user_a, user_b);
  if not found then
    return jsonb_build_object('status', 'blocked', 'reason', 'not_your_thread');
  end if;

  if thread.user_a = me then
    them := thread.user_b;
    their_app := thread.app_b;
  else
    them := thread.user_a;
    their_app := thread.app_a;
  end if;

  if p_bug_shot is not null then
    media := media || jsonb_build_array(jsonb_build_object('storage_path', p_bug_shot, 'kind', 'image', 'label', 'Screenshot'));
  end if;
  if p_bug_shots is not null then
    select coalesce(media, '[]'::jsonb) || coalesce(
      (
        select jsonb_agg(jsonb_build_object('storage_path', shot, 'kind', 'image', 'label', 'Screenshot'))
        from unnest(p_bug_shots) as shot
        where shot is not null
      ),
      '[]'::jsonb
    ) into media;
  end if;
  if p_video_path is not null then
    media := media || jsonb_build_array(jsonb_build_object('storage_path', p_video_path, 'kind', 'video', 'label', 'Video note'));
  end if;

  insert into public.feedback (
    match_id, app_id, from_user_id, to_user_id,
    stars, summary, confusion, keep, opt_in,
    best_moment, bug, bug_shot, price, keep_why, bug_shots, video_path
  )
  values (
    p_match_id, their_app, me, them,
    p_stars, btrim(p_summary),
    nullif(btrim(coalesce(p_confusion, '')), ''), p_keep, coalesce(p_opt_in, false),
    nullif(btrim(coalesce(p_best_moment, '')), ''),
    nullif(btrim(coalesce(p_bug, '')), ''),
    p_bug_shot,
    p_price,
    nullif(btrim(coalesce(p_keep_why, '')), ''),
    p_bug_shots,
    p_video_path
  )
  on conflict (match_id, from_user_id, app_id) do update
    set stars = excluded.stars,
        summary = excluded.summary,
        confusion = excluded.confusion,
        keep = excluded.keep,
        opt_in = excluded.opt_in,
        best_moment = excluded.best_moment,
        bug = excluded.bug,
        bug_shot = coalesce(excluded.bug_shot, public.feedback.bug_shot),
        price = excluded.price,
        keep_why = excluded.keep_why,
        bug_shots = coalesce(excluded.bug_shots, public.feedback.bug_shots),
        video_path = coalesce(excluded.video_path, public.feedback.video_path)
  returning id into feedback_id;

  insert into public.messages (match_id, sender_id, kind, body, feedback, media)
  values (
    p_match_id, me, 'feedback', btrim(p_summary),
    jsonb_build_object('stars', p_stars, 'keep', p_keep, 'price', p_price, 'keep_why', p_keep_why),
    media
  );

  perform public.set_trade_status(p_match_id, 'Feedback sent');

  return jsonb_build_object('status', 'sent', 'feedback_id', feedback_id);
end;
$$;

create or replace function public.discover_deck(
  p_limit integer default 30,
  p_sort text default 'best_fit'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  sort text := case
    when lower(coalesce(p_sort, 'best_fit')) in ('most_liked', 'newest', 'best_fit')
      then lower(p_sort)
    else 'best_fit'
  end;
begin
  if me is null then
    return '[]'::jsonb;
  end if;

  return coalesce(
    (
      with viewer as (
        select a.category, a.platform, a.ideal_users
        from public.apps a
        where a.owner_id = me
        order by a.is_primary desc, a.published_at desc nulls last
        limit 1
      ),
      eligible as (
        select
          a.id,
          a.published_at,
          (select count(*)::integer from public.heys h where h.to_app_id = a.id) as hey_count,
          app.discover_fit_score(
            a.category,
            a.platform,
            a.ideal_users,
            v.category,
            v.platform,
            v.ideal_users
          ) as fit
        from public.apps a
        left join viewer v on true
        where a.published_at is not null
          and a.owner_id <> me
          and not app.paired_block(me, a.owner_id)
          and not app.listing_on_cooldown(a.id)
          and not exists (
            select 1 from public.passes p where p.user_id = me and p.app_id = a.id
          )
          and not exists (
            select 1 from public.heys h where h.from_user_id = me and h.to_app_id = a.id
          )
          and not exists (
            select 1 from public.matches m
            where (m.user_a = me and m.user_b = a.owner_id)
               or (m.user_b = me and m.user_a = a.owner_id)
          )
      )
      select jsonb_agg(app.listing_card(d.id) order by
        case
          when sort = 'most_liked' then d.hey_count
          when sort = 'newest' then extract(epoch from d.published_at)::integer
          else d.fit
        end desc,
        d.published_at desc
      )
      from (
        select *
        from eligible
        order by
          case
            when sort = 'most_liked' then hey_count
            when sort = 'newest' then extract(epoch from published_at)::integer
            else fit
          end desc,
          published_at desc
        limit greatest(1, least(coalesce(p_limit, 30), 100))
      ) d
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.record_profile_view(uuid) from public;
revoke all on function public.my_listing_cooldowns() from public;
revoke all on function public.record_listing_scroll(uuid, numeric) from public;
revoke all on function public.record_hey_source(uuid, text) from public;
revoke all on function public.my_listing_insights(uuid, integer) from public;
revoke all on function public.builder_public_groups(uuid) from public;
revoke all on function public.leave_feedback(uuid, smallint, text, text, text, boolean, text, text, text, text, text, text[], text) from public;
revoke all on function public.discover_deck(integer, text) from public;

grant execute on function public.record_profile_view(uuid) to authenticated;
grant execute on function public.my_listing_cooldowns() to authenticated;
grant execute on function public.record_listing_scroll(uuid, numeric) to authenticated;
grant execute on function public.record_hey_source(uuid, text) to authenticated;
grant execute on function public.my_listing_insights(uuid, integer) to authenticated;
grant execute on function public.builder_public_groups(uuid) to authenticated;
grant execute on function public.leave_feedback(uuid, smallint, text, text, text, boolean, text, text, text, text, text, text[], text) to authenticated;
grant execute on function public.discover_deck(integer, text) to authenticated;
