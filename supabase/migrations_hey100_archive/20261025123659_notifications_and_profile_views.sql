-- Push outbox, notification prefs, profile views, and engagement jobs.
--
-- OneSignal is the last mile. This migration decides *whether* to send.
-- The send-push Edge Function drains `app.push_outbox`. Set
-- `app.push_config.function_url` (and optional drain_secret) after deploy
-- so inserts wake the function; a cron drain is the backup.

do $$
begin
  create extension if not exists pg_net with schema extensions;
exception
  when others then
    raise notice 'pg_net not available: %', sqlerrm;
end $$;

do $$
begin
  create extension if not exists pg_cron with schema pg_catalog;
exception
  when others then
    raise notice 'pg_cron not available: %', sqlerrm;
end $$;

/* ---------------------------------------------------------------- */
/* Profile: prefs, presence, timezone                               */
/* ---------------------------------------------------------------- */

alter table public.profiles
  add column if not exists notification_prefs jsonb not null default jsonb_build_object(
    'hey', true,
    'match', true,
    'message', true,
    'your_turn', true,
    'feedback', true,
    'group_reply', true,
    'group_reaction', true,
    'group_request', true,
    'group_accepted', true,
    'digest', true,
    'new_group', true,
    'milestones', true,
    'listing_nudge', true,
    'quiet_hours', true,
    'quiet_start', '22:00',
    'quiet_end', '08:00'
  ),
  add column if not exists last_active_at timestamptz,
  add column if not exists timezone text;

comment on column public.profiles.notification_prefs is
  'Per-event push switches. Transactional and engagement default on.';
comment on column public.profiles.last_active_at is
  'Last foreground ping. Pushes skip if this is within the last minute.';

grant update (notification_prefs, last_active_at, timezone) on public.profiles to authenticated;

create or replace function public.touch_presence(p_timezone text default null)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.profiles
  set last_active_at = now(),
      timezone = coalesce(nullif(btrim(p_timezone), ''), timezone)
  where id = (select auth.uid());
end;
$$;

revoke all on function public.touch_presence(text) from public;
grant execute on function public.touch_presence(text) to authenticated;

/* ---------------------------------------------------------------- */
/* Profile views — count now, identities later (Pro teaser)         */
/* ---------------------------------------------------------------- */

create table if not exists public.profile_views (
  viewer_id uuid not null references public.profiles (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid references public.apps (id) on delete set null,
  view_count integer not null default 1 check (view_count > 0),
  first_viewed_at timestamptz not null default now(),
  last_viewed_at timestamptz not null default now(),
  primary key (viewer_id, profile_id),
  constraint profile_views_not_self check (viewer_id <> profile_id)
);

create index if not exists profile_views_profile_idx
  on public.profile_views (profile_id, last_viewed_at desc);

comment on table public.profile_views is
  'Who opened a builder card. Owners get a count now; names wait for Pro.';

alter table public.profile_views enable row level security;

revoke all on public.profile_views from anon, authenticated;

create or replace function public.record_profile_view(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  owner uuid;
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
end;
$$;

create or replace function public.my_profile_view_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.profile_views
  where profile_id = (select auth.uid());
$$;

revoke all on function public.record_profile_view(uuid) from public;
revoke all on function public.my_profile_view_count() from public;
grant execute on function public.record_profile_view(uuid) to authenticated;
grant execute on function public.my_profile_view_count() to authenticated;

/* ---------------------------------------------------------------- */
/* Outbox — not exposed on the Data API                             */
/* ---------------------------------------------------------------- */

create table if not exists app.push_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  event text not null,
  collapse_id text not null,
  title text not null,
  body text not null,
  url text not null default '/',
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'skipped', 'failed')),
  skip_reason text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists push_outbox_pending_idx
  on app.push_outbox (created_at)
  where status = 'pending';

create index if not exists push_outbox_user_event_idx
  on app.push_outbox (user_id, event, created_at desc);

create table if not exists app.push_config (
  id integer primary key default 1 check (id = 1),
  function_url text,
  drain_secret text
);

insert into app.push_config (id) values (1) on conflict (id) do nothing;

create table if not exists app.engagement_sends (
  user_id uuid not null references public.profiles (id) on delete cascade,
  campaign text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, campaign, sent_at)
);

create index if not exists engagement_sends_recent_idx
  on app.engagement_sends (user_id, campaign, sent_at desc);

create or replace function app.display_name(p_user_id uuid)
returns text
language sql
stable
set search_path = public
as $$
  select coalesce(nullif(btrim(p.real_name), ''), nullif(p.username, ''), 'A builder')
  from public.profiles p
  where p.id = p_user_id;
$$;

create or replace function app.app_name(p_app_id uuid)
returns text
language sql
stable
set search_path = public
as $$
  select coalesce(nullif(btrim(a.name), ''), 'their app')
  from public.apps a
  where a.id = p_app_id;
$$;

create or replace function app.enqueue_push(
  p_user_id uuid,
  p_event text,
  p_collapse_id text,
  p_title text,
  p_body text,
  p_url text,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = app, public
as $$
declare
  existing uuid;
begin
  if p_user_id is null then
    return null;
  end if;

  update app.push_outbox
  set title = p_title,
      body = p_body,
      url = p_url,
      payload = coalesce(p_payload, '{}'::jsonb),
      created_at = now()
  where user_id = p_user_id
    and collapse_id = p_collapse_id
    and status = 'pending'
  returning id into existing;

  if existing is not null then
    return existing;
  end if;

  insert into app.push_outbox (user_id, event, collapse_id, title, body, url, payload)
  values (
    p_user_id, p_event, p_collapse_id, p_title, p_body, p_url, coalesce(p_payload, '{}'::jsonb)
  )
  returning id into existing;

  return existing;
end;
$$;

create or replace function app.request_push_drain()
returns void
language plpgsql
security definer
set search_path = app, extensions, public
as $$
declare
  cfg app.push_config;
begin
  select * into cfg from app.push_config where id = 1;
  if cfg.function_url is null or length(cfg.function_url) < 8 then
    return;
  end if;

  perform net.http_post(
    url := cfg.function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', coalesce(cfg.drain_secret, '')
    ),
    body := '{"drain":true}'::jsonb
  );
exception
  when others then
    null;
end;
$$;

create or replace function app.on_push_enqueued()
returns trigger
language plpgsql
security definer
set search_path = app
as $$
begin
  perform app.request_push_drain();
  return new;
end;
$$;

drop trigger if exists push_outbox_drain on app.push_outbox;
create trigger push_outbox_drain
  after insert on app.push_outbox
  for each row
  when (new.status = 'pending')
  execute function app.on_push_enqueued();

/* ---------------------------------------------------------------- */
/* Transactional triggers                                           */
/* ---------------------------------------------------------------- */

create or replace function app.on_hey_push()
returns trigger
language plpgsql
security definer
set search_path = app, public
as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    perform app.enqueue_push(
      new.to_user_id,
      'hey',
      'hey:' || new.to_user_id::text,
      'New hey',
      app.display_name(new.from_user_id) || ' said hey to ' || app.app_name(new.to_app_id),
      '/hey/' || new.id::text,
      jsonb_build_object('heyId', new.id)
    );
  elsif tg_op = 'UPDATE'
    and new.follow_up_at is distinct from old.follow_up_at
    and new.follow_up_at is not null
    and new.status = 'pending'
  then
    perform app.enqueue_push(
      new.to_user_id,
      'hey',
      'hey:' || new.to_user_id::text,
      'Still interested',
      app.display_name(new.from_user_id) || ' followed up on ' || app.app_name(new.to_app_id),
      '/hey/' || new.id::text,
      jsonb_build_object('heyId', new.id)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists heys_push on public.heys;
create trigger heys_push
  after insert or update on public.heys
  for each row
  execute function app.on_hey_push();

create or replace function app.on_match_push()
returns trigger
language plpgsql
security definer
set search_path = app, public
as $$
declare
  other_a text := app.display_name(new.user_b);
  other_b text := app.display_name(new.user_a);
begin
  perform app.enqueue_push(
    new.user_a, 'match', 'match:' || new.id::text,
    'New match', 'You and ' || other_a || ' matched',
    '/chat/' || new.id::text, jsonb_build_object('matchId', new.id)
  );
  perform app.enqueue_push(
    new.user_b, 'match', 'match:' || new.id::text,
    'New match', 'You and ' || other_b || ' matched',
    '/chat/' || new.id::text, jsonb_build_object('matchId', new.id)
  );

  if (select count(*) from public.matches m where new.user_a in (m.user_a, m.user_b)) = 1 then
    perform app.enqueue_push(
      new.user_a, 'milestones', 'milestone:first-match:' || new.user_a::text,
      'First match', 'You and ' || other_a || ' just opened a chat',
      '/chat/' || new.id::text, '{}'::jsonb
    );
  end if;
  if (select count(*) from public.matches m where new.user_b in (m.user_a, m.user_b)) = 1 then
    perform app.enqueue_push(
      new.user_b, 'milestones', 'milestone:first-match:' || new.user_b::text,
      'First match', 'You and ' || other_b || ' just opened a chat',
      '/chat/' || new.id::text, '{}'::jsonb
    );
  end if;

  return new;
end;
$$;

drop trigger if exists matches_push on public.matches;
create trigger matches_push
  after insert on public.matches
  for each row
  execute function app.on_match_push();

create or replace function app.on_message_push()
returns trigger
language plpgsql
security definer
set search_path = app, public
as $$
declare
  thread public.matches;
  them uuid;
  preview text;
begin
  if new.sender_id is null or new.kind in ('system', 'feedback') then
    return new;
  end if;

  select * into thread from public.matches where id = new.match_id;
  if not found then
    return new;
  end if;

  them := case when thread.user_a = new.sender_id then thread.user_b else thread.user_a end;
  preview := case
    when nullif(btrim(coalesce(new.body, '')), '') is not null
      then left(btrim(new.body), 80)
    else 'Sent a photo'
  end;

  perform app.enqueue_push(
    them, 'message', 'chat:' || new.match_id::text,
    app.display_name(new.sender_id), preview,
    '/chat/' || new.match_id::text,
    jsonb_build_object('matchId', new.match_id)
  );
  return new;
end;
$$;

drop trigger if exists messages_push on public.messages;
create trigger messages_push
  after insert on public.messages
  for each row
  execute function app.on_message_push();

create or replace function app.on_feedback_push()
returns trigger
language plpgsql
security definer
set search_path = app, public
as $$
begin
  perform app.enqueue_push(
    new.to_user_id, 'feedback', 'feedback:' || new.match_id::text,
    'Feedback received',
    app.display_name(new.from_user_id) || ' sent feedback on ' || app.app_name(new.app_id),
    '/chat/' || new.match_id::text,
    jsonb_build_object('matchId', new.match_id)
  );
  return new;
end;
$$;

drop trigger if exists feedback_push on public.feedback;
create trigger feedback_push
  after insert on public.feedback
  for each row
  execute function app.on_feedback_push();

create or replace function app.on_community_reply_push()
returns trigger
language plpgsql
security definer
set search_path = app, public
as $$
declare
  thread record;
begin
  select t.id, t.author_id, t.group_id, g.name
    into thread
  from public.community_threads t
  join public.community_groups g on g.id = t.group_id
  where t.id = new.thread_id;

  if not found or thread.author_id = new.author_id then
    return new;
  end if;

  if exists (
    select 1 from public.community_group_members m
    where m.group_id = thread.group_id
      and m.user_id = thread.author_id
      and m.muted
  ) then
    return new;
  end if;

  perform app.enqueue_push(
    thread.author_id, 'group_reply', 'thread:' || thread.id::text,
    thread.name,
    app.display_name(new.author_id) || ' replied in ' || thread.name,
    '/group/' || thread.group_id::text || '/thread/' || thread.id::text,
    jsonb_build_object('groupId', thread.group_id, 'threadId', thread.id)
  );
  return new;
end;
$$;

drop trigger if exists community_replies_push on public.community_replies;
create trigger community_replies_push
  after insert on public.community_replies
  for each row
  execute function app.on_community_reply_push();

create or replace function app.on_community_reaction_push()
returns trigger
language plpgsql
security definer
set search_path = app, public
as $$
declare
  author uuid;
  group_id uuid;
  thread_id uuid;
  group_name text;
begin
  if new.reply_id is not null then
    select r.author_id, t.group_id, t.id, g.name
      into author, group_id, thread_id, group_name
    from public.community_replies r
    join public.community_threads t on t.id = r.thread_id
    join public.community_groups g on g.id = t.group_id
    where r.id = new.reply_id;
  else
    select t.author_id, t.group_id, t.id, g.name
      into author, group_id, thread_id, group_name
    from public.community_threads t
    join public.community_groups g on g.id = t.group_id
    where t.id = new.thread_id;
  end if;

  if author is null or author = new.user_id then
    return new;
  end if;

  if exists (
    select 1 from public.community_group_members m
    where m.group_id = group_id and m.user_id = author and m.muted
  ) then
    return new;
  end if;

  perform app.enqueue_push(
    author, 'group_reaction',
    'react:' || coalesce(new.reply_id, new.thread_id)::text,
    group_name,
    app.display_name(new.user_id) || ' reacted in ' || group_name,
    '/group/' || group_id::text || '/thread/' || thread_id::text,
    jsonb_build_object('groupId', group_id, 'threadId', thread_id)
  );
  return new;
end;
$$;

drop trigger if exists community_reactions_push on public.community_reactions;
create trigger community_reactions_push
  after insert on public.community_reactions
  for each row
  execute function app.on_community_reaction_push();

create or replace function app.on_community_member_push()
returns trigger
language plpgsql
security definer
set search_path = app, public
as $$
declare
  group_name text;
  owner uuid;
begin
  select name into group_name from public.community_groups where id = new.group_id;

  if tg_op = 'INSERT' and new.status = 'pending' then
    for owner in
      select user_id
      from public.community_group_members
      where group_id = new.group_id
        and role = 'owner'
        and status = 'active'
        and user_id <> new.user_id
    loop
      perform app.enqueue_push(
        owner, 'group_request', 'joinreq:' || new.group_id::text,
        group_name,
        app.display_name(new.user_id) || ' wants to join ' || group_name,
        '/group/' || new.group_id::text || '/members',
        jsonb_build_object('groupId', new.group_id)
      );
    end loop;
  elsif tg_op = 'UPDATE'
    and old.status = 'pending'
    and new.status = 'active'
  then
    perform app.enqueue_push(
      new.user_id, 'group_accepted', 'joined:' || new.group_id::text,
      'You''re in',
      'You''re in ' || group_name,
      '/group/' || new.group_id::text,
      jsonb_build_object('groupId', new.group_id)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists community_members_push on public.community_group_members;
create trigger community_members_push
  after insert or update of status on public.community_group_members
  for each row
  execute function app.on_community_member_push();

/* ---------------------------------------------------------------- */
/* Engagement planner (called by the hourly Edge Function)          */
/* ---------------------------------------------------------------- */

create or replace function app.engagement_allowed(p_user_id uuid)
returns boolean
language sql
stable
set search_path = app, public
as $$
  select
    (select count(*) from app.push_outbox o
      where o.user_id = p_user_id
        and o.event in ('hey','match','message','your_turn','feedback','group_reply','group_reaction','group_request','group_accepted')
        and o.created_at > now() - interval '24 hours'
        and o.status in ('pending', 'sent')) < 3
    and (select count(*) from app.engagement_sends s
      where s.user_id = p_user_id and s.sent_at > now() - interval '24 hours') = 0
    and (select count(*) from app.engagement_sends s
      where s.user_id = p_user_id and s.sent_at > now() - interval '7 days') < 3;
$$;

create or replace function app.note_engagement(p_user_id uuid, p_campaign text)
returns void
language sql
set search_path = app
as $$
  insert into app.engagement_sends (user_id, campaign) values (p_user_id, p_campaign);
$$;

create or replace function app.plan_engagement()
returns integer
language plpgsql
security definer
set search_path = app, public
as $$
declare
  queued integer := 0;
  thread record;
  person record;
  grp record;
  listing record;
  new_apps integer;
  new_groups integer;
  unseen integer;
  missing text;
  owner uuid;
begin
  -- Your turn: the other person wrote last, 48h–6d ago.
  for thread in
    select m.id, m.user_a, m.user_b, last.sender_id
    from public.matches m
    join lateral (
      select sender_id
      from public.messages msg
      where msg.match_id = m.id
        and msg.kind in ('text', 'media')
        and msg.sender_id is not null
      order by msg.created_at desc
      limit 1
    ) last on true
    where m.last_message_at < now() - interval '48 hours'
      and m.expires_at > now() + interval '24 hours'
      and not exists (
        select 1 from app.push_outbox o
        where o.collapse_id = 'turn:' || m.id::text
          and o.created_at > now() - interval '3 days'
      )
  loop
    owner := case when thread.sender_id = thread.user_a then thread.user_b else thread.user_a end;
    perform app.enqueue_push(
      owner, 'your_turn', 'turn:' || thread.id::text,
      'Your turn',
      app.display_name(thread.sender_id) || ' is waiting',
      '/chat/' || thread.id::text,
      jsonb_build_object('matchId', thread.id)
    );
    queued := queued + 1;
  end loop;

  -- Match expires in the next day.
  for thread in
    select m.id, m.user_a, m.user_b, last.sender_id
    from public.matches m
    join lateral (
      select sender_id
      from public.messages msg
      where msg.match_id = m.id and msg.sender_id is not null
      order by msg.created_at desc
      limit 1
    ) last on true
    where m.expires_at between now() and now() + interval '24 hours'
      and not exists (
        select 1 from app.push_outbox o
        where o.collapse_id = 'expiry:' || m.id::text
          and o.created_at > now() - interval '2 days'
      )
  loop
    owner := case when thread.sender_id = thread.user_a then thread.user_b else thread.user_a end;
    perform app.enqueue_push(
      owner, 'your_turn', 'expiry:' || thread.id::text,
      'Match expires tonight',
      'Say something to ' || app.display_name(thread.sender_id) || ' to keep the chat',
      '/chat/' || thread.id::text,
      jsonb_build_object('matchId', thread.id)
    );
    queued := queued + 1;
  end loop;

  select count(*) into new_apps
  from public.apps
  where published_at > now() - interval '7 days';

  select count(*) into new_groups
  from public.community_groups
  where created_at > now() - interval '7 days'
    and tool_id is null;

  -- Weekly digest, once per user per week, only over the threshold.
  if new_apps >= 5 or new_groups >= 3 then
    for person in
      select p.id
      from public.profiles p
      where p.onboarded_at is not null
        and app.engagement_allowed(p.id)
        and not exists (
          select 1 from app.engagement_sends s
          where s.user_id = p.id
            and s.campaign = 'digest'
            and s.sent_at > now() - interval '6 days'
        )
    loop
      perform app.enqueue_push(
        person.id, 'digest', 'digest:' || to_char(now(), 'IYYY-IW'),
        'This week on Hey100',
        new_apps::text || ' new apps and ' || new_groups::text || ' new groups',
        '/(tabs)/discover',
        '{}'::jsonb
      );
      perform app.note_engagement(person.id, 'digest');
      queued := queued + 1;
    end loop;
  end if;

  -- New relevant group: 3+ members in the first day.
  for grp in
    select g.id, g.name, g.audience, count(m.user_id) as members
    from public.community_groups g
    join public.community_group_members m
      on m.group_id = g.id and m.status = 'active'
    where g.created_at > now() - interval '24 hours'
      and g.tool_id is null
    group by g.id, g.name, g.audience
    having count(m.user_id) >= 3
  loop
    for person in
      select p.id
      from public.profiles p
      where p.onboarded_at is not null
        and app.engagement_allowed(p.id)
        and not exists (
          select 1 from public.community_group_members existing
          where existing.group_id = grp.id and existing.user_id = p.id
        )
        and not exists (
          select 1 from app.engagement_sends s
          where s.user_id = p.id
            and s.campaign = 'new_group'
            and s.sent_at > now() - interval '7 days'
        )
        and grp.audience <> ''
        and (
          exists (
            select 1 from unnest(p.app_interests) x
            where grp.audience ilike '%' || regexp_replace(x, '^[^A-Za-z0-9]+\s*', '') || '%'
          )
          or exists (
            select 1 from unnest(p.looking_for) x
            where grp.audience ilike '%' || regexp_replace(x, '^[^A-Za-z0-9]+\s*', '') || '%'
          )
        )
    loop
      perform app.enqueue_push(
        person.id, 'new_group', 'newgroup:' || grp.id::text,
        'New group',
        grp.name || ' — for ' || left(grp.audience, 80),
        '/group/' || grp.id::text,
        jsonb_build_object('groupId', grp.id)
      );
      perform app.note_engagement(person.id, 'new_group');
      queued := queued + 1;
    end loop;
  end loop;

  -- Listing strength nudge: one missing item, 3+ days after publish.
  for listing in
    select a.id, a.owner_id, a.name, a.icon_path, a.cover_path, a.problem_of, a.problem_for,
           a.pricing_model, a.pitch_path, a.ideal_users, a.published_at
    from public.apps a
    where a.published_at is not null
      and a.published_at < now() - interval '3 days'
      and a.is_primary
  loop
    if not app.engagement_allowed(listing.owner_id) then
      continue;
    end if;
    if exists (
      select 1 from app.engagement_sends s
      where s.user_id = listing.owner_id
        and s.campaign = 'listing_nudge'
        and s.sent_at > now() - interval '14 days'
    ) then
      continue;
    end if;

    missing := case
      when listing.icon_path is null then 'Add an icon to ' || listing.name
      when listing.cover_path is null then 'Add a banner to ' || listing.name
      when not exists (select 1 from public.app_media m where m.app_id = listing.id) then
        'Add screenshots to ' || listing.name
      when listing.problem_of is null or listing.problem_for is null then
        'Write the problem ' || listing.name || ' solves'
      when listing.pricing_model is null then 'Add pricing on ' || listing.name
      when not exists (select 1 from public.app_prompts p where p.app_id = listing.id) then
        'Answer a prompt on ' || listing.name
      when listing.pitch_path is null then 'Record a quick pitch for ' || listing.name
      when not exists (
        select 1 from public.app_connections c
        where c.app_id = listing.id and c.provider in ('stripe', 'revenuecat', 'github')
      ) then 'Verify ' || listing.name || ' with Stripe, RevenueCat or GitHub'
      else null
    end;

    if missing is null then
      continue;
    end if;

    perform app.enqueue_push(
      listing.owner_id, 'listing_nudge', 'nudge:' || listing.id::text,
      'Finish your listing', missing,
      '/my-app/' || listing.id::text,
      jsonb_build_object('appId', listing.id)
    );
    perform app.note_engagement(listing.owner_id, 'listing_nudge');
    queued := queued + 1;
  end loop;

  -- Come-back nudge when the deck has grown.
  select count(*) into unseen
  from public.apps
  where published_at > now() - interval '7 days';

  if unseen >= 5 then
    for person in
      select p.id
      from public.profiles p
      where p.onboarded_at is not null
        and coalesce(p.last_active_at, p.onboarded_at) < now() - interval '7 days'
        and app.engagement_allowed(p.id)
        and not exists (
          select 1 from app.engagement_sends s
          where s.user_id = p.id
            and s.campaign = 'stale'
            and s.sent_at > now() - interval '7 days'
        )
    loop
      perform app.enqueue_push(
        person.id, 'digest', 'stale:' || to_char(now(), 'IYYY-IW'),
        'Builders you have not seen',
        unseen::text || ' new builders since you last looked',
        '/(tabs)/discover',
        '{}'::jsonb
      );
      perform app.note_engagement(person.id, 'stale');
      queued := queued + 1;
    end loop;
  end if;

  return queued;
end;
$$;

-- Service-role drain helpers used by the Edge Function (app schema, no grants).
create or replace function app.claim_push_batch(p_limit integer default 40)
returns setof app.push_outbox
language sql
security definer
set search_path = app
as $$
  select *
  from app.push_outbox
  where status = 'pending'
  order by created_at
  limit greatest(1, least(coalesce(p_limit, 40), 80));
$$;

create or replace function app.mark_push(
  p_id uuid,
  p_status text,
  p_reason text default null
)
returns void
language sql
security definer
set search_path = app
as $$
  update app.push_outbox
  set status = p_status,
      skip_reason = p_reason,
      sent_at = case when p_status = 'sent' then now() else sent_at end
  where id = p_id;
$$;

create or replace function app.profile_for_push(p_user_id uuid)
returns table (
  id uuid,
  notification_prefs jsonb,
  last_active_at timestamptz,
  timezone text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.notification_prefs, p.last_active_at, p.timezone
  from public.profiles p
  where p.id = p_user_id;
$$;

create or replace function public.admin_claim_push_batch(p_limit integer default 40)
returns jsonb
language sql
security definer
set search_path = app, public
as $$
  select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
  from app.claim_push_batch(p_limit) r;
$$;

create or replace function public.admin_mark_push(
  p_id uuid,
  p_status text,
  p_reason text default null
)
returns void
language sql
security definer
set search_path = app
as $$
  select app.mark_push(p_id, p_status, p_reason);
$$;

create or replace function public.admin_profile_for_push(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = app, public
as $$
  select to_jsonb(r) from app.profile_for_push(p_user_id) r;
$$;

create or replace function public.admin_plan_engagement()
returns integer
language sql
security definer
set search_path = app
as $$
  select app.plan_engagement();
$$;

revoke all on function app.enqueue_push(uuid, text, text, text, text, text, jsonb) from public;
revoke all on function app.plan_engagement() from public;
revoke all on function app.claim_push_batch(integer) from public;
revoke all on function app.mark_push(uuid, text, text) from public;
revoke all on function app.profile_for_push(uuid) from public;
revoke all on function public.admin_claim_push_batch(integer) from public;
revoke all on function public.admin_mark_push(uuid, text, text) from public;
revoke all on function public.admin_profile_for_push(uuid) from public;
revoke all on function public.admin_plan_engagement() from public;

grant execute on function public.admin_claim_push_batch(integer) to service_role;
grant execute on function public.admin_mark_push(uuid, text, text) to service_role;
grant execute on function public.admin_profile_for_push(uuid) to service_role;
grant execute on function public.admin_plan_engagement() to service_role;

-- Cron: plan engagement hourly; drain every minute if the URL is set.
do $$
begin
  perform cron.unschedule('hey100-plan-engagement');
exception when others then null;
end $$;

do $$
begin
  perform cron.unschedule('hey100-drain-push');
exception when others then null;
end $$;

do $$
begin
  perform cron.schedule(
    'hey100-plan-engagement',
    '10 * * * *',
    $cron$select app.plan_engagement()$cron$
  );
  perform cron.schedule(
    'hey100-drain-push',
    '* * * * *',
    $cron$select app.request_push_drain()$cron$
  );
exception
  when others then
    raise notice 'pg_cron not available: %', sqlerrm;
end $$;
