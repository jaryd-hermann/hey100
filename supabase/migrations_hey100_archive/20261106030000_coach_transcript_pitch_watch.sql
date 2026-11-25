-- Listing coach: pitch transcripts, watch time, and one owner-only dossier.

alter table public.apps
  add column if not exists pitch_transcript text,
  add column if not exists pitch_transcribed_at timestamptz;

create or replace function app.clear_pitch_transcript()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.pitch_path is distinct from old.pitch_path then
    new.pitch_transcript := null;
    new.pitch_transcribed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists apps_clear_pitch_transcript on public.apps;
create trigger apps_clear_pitch_transcript
  before update of pitch_path on public.apps
  for each row execute function app.clear_pitch_transcript();

create table if not exists public.pitch_watches (
  id bigint generated always as identity primary key,
  listing_id uuid not null references public.apps (id) on delete cascade,
  viewer_id uuid not null references auth.users (id) on delete cascade,
  watched_seconds numeric not null check (watched_seconds >= 0),
  duration_seconds numeric not null default 0 check (duration_seconds >= 0),
  created_at timestamptz not null default now()
);

create index if not exists pitch_watches_listing_idx
  on public.pitch_watches (listing_id, created_at desc);

alter table public.pitch_watches enable row level security;

create or replace function public.record_pitch_watch(
  p_listing_id uuid,
  p_watched numeric,
  p_duration numeric default 0
)
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
  if coalesce(p_watched, 0) < 0.5 then
    return;
  end if;
  insert into public.pitch_watches (listing_id, viewer_id, watched_seconds, duration_seconds)
  values (
    p_listing_id,
    me,
    least(180, greatest(0, p_watched)),
    least(180, greatest(0, coalesce(p_duration, 0)))
  );
end;
$$;

create or replace function public.set_my_pitch_transcript(p_app_id uuid, p_transcript text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  copy text := nullif(btrim(coalesce(p_transcript, '')), '');
begin
  if me is null then
    return jsonb_build_object('status', 'blocked', 'reason', 'not_signed_in');
  end if;
  if copy is null or char_length(copy) < 8 then
    return jsonb_build_object('status', 'blocked', 'reason', 'empty');
  end if;
  if not exists (select 1 from public.apps a where a.id = p_app_id and a.owner_id = me) then
    return jsonb_build_object('status', 'blocked', 'reason', 'not_yours');
  end if;

  update public.apps
  set pitch_transcript = left(copy, 8000),
      pitch_transcribed_at = now()
  where id = p_app_id
    and owner_id = me;

  return jsonb_build_object('status', 'ok');
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
  since timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 3650)));
  views integer := 0;
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
    'period_days', greatest(1, least(coalesce(p_days, 30), 3650)),
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

create or replace function public.my_listing_coach_context(p_app_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  listing public.apps;
  plan text;
begin
  if me is null or p_app_id is null then
    return jsonb_build_object('error', 'unauthorized');
  end if;

  select * into listing
  from public.apps a
  where a.id = p_app_id
    and a.owner_id = me;

  if not found then
    return jsonb_build_object('error', 'not_found');
  end if;

  select p.plan into plan
  from public.profiles p
  where p.id = me;

  return jsonb_build_object(
    'plan', coalesce(plan, 'free'),
    'listing', jsonb_build_object(
      'id', listing.id,
      'name', listing.name,
      'subtitle', listing.subtitle,
      'description', listing.description,
      'category', listing.category,
      'platform', listing.platform,
      'stage', listing.stage,
      'problem_of', listing.problem_of,
      'problem_for', listing.problem_for,
      'pricing_model', listing.pricing_model,
      'price_from', listing.price_from,
      'onboarding', listing.onboarding,
      'feedback_wanted', listing.feedback_wanted,
      'ideal_users', listing.ideal_users,
      'layout', listing.layout,
      'shot_layout', listing.shot_layout,
      'links', listing.links,
      'store_url', listing.store_url,
      'store_rating', listing.store_rating,
      'published_at', listing.published_at,
      'has_icon', listing.icon_path is not null,
      'has_cover', listing.cover_path is not null,
      'pitch_path', listing.pitch_path,
      'pitch_seconds', listing.pitch_seconds,
      'pitch_transcript', listing.pitch_transcript
    ),
    'media', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'position', m.position,
            'kind', m.kind,
            'label', m.label
          )
          order by m.position
        )
        from public.app_media m
        where m.app_id = listing.id
      ),
      '[]'::jsonb
    ),
    'prompts', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'slot', ap.slot,
            'question', pr.label,
            'tag', pr.tag,
            'answer', ap.answer
          )
          order by ap.slot
        )
        from public.app_prompts ap
        join public.prompts pr on pr.id = ap.prompt_id
        where ap.app_id = listing.id
      ),
      '[]'::jsonb
    ),
    'profile', (
      select jsonb_build_object(
        'name', p.real_name,
        'username', p.username,
        'job', p.job,
        'workplace', p.workplace,
        'industry', p.industry,
        'department', p.department,
        'company_size', p.company_size,
        'years_experience', p.years_experience,
        'bio', p.own_words ->> 'bio',
        'own_words', p.own_words,
        'role_tags', p.role_tags,
        'looking_for', p.looking_for,
        'app_interests', p.app_interests,
        'life_tags', p.life_tags,
        'skills', p.skills,
        'github_login', p.github_login,
        'github_commits', p.github_commits,
        'links', p.links
      )
      from public.profiles p
      where p.id = me
    ),
    'insights', public.my_listing_insights(listing.id, 3650),
    'pass_reasons', coalesce(
      (
        select jsonb_agg(jsonb_build_object('reason', r.reason, 'count', r.n) order by r.n desc)
        from (
          select coalesce(nullif(btrim(p.reason), ''), 'No reason') as reason, count(*)::int as n
          from public.passes p
          where p.app_id = listing.id
          group by 1
        ) r
      ),
      '[]'::jsonb
    ),
    'feedback', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'stars', f.stars,
            'summary', f.summary,
            'confusion', f.confusion,
            'keep', f.keep,
            'keep_why', f.keep_why,
            'best_moment', f.best_moment,
            'bug', f.bug,
            'price', f.price,
            'created_at', f.created_at
          )
          order by f.created_at desc
        )
        from (
          select *
          from public.feedback f
          where f.app_id = listing.id
          order by f.created_at desc
          limit 25
        ) f
      ),
      '[]'::jsonb
    )
  );
end;
$$;

revoke all on function public.record_pitch_watch(uuid, numeric, numeric) from public;
revoke all on function public.set_my_pitch_transcript(uuid, text) from public;
revoke all on function public.my_listing_coach_context(uuid) from public;
revoke all on function public.my_listing_insights(uuid, integer) from public;

grant execute on function public.record_pitch_watch(uuid, numeric, numeric) to authenticated;
grant execute on function public.set_my_pitch_transcript(uuid, text) to authenticated;
grant execute on function public.my_listing_coach_context(uuid) to authenticated;
grant execute on function public.my_listing_insights(uuid, integer) to authenticated;
