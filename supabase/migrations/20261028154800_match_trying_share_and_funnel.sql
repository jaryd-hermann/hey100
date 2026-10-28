-- Matched chats: per-match share link/code, hey notes as opening DMs,
-- trying-it status with a push, and real listing funnel numbers.

alter table public.matches
  add column if not exists share_url_a text,
  add column if not exists share_code_a text,
  add column if not exists share_url_b text,
  add column if not exists share_code_b text;

alter table public.matches
  drop constraint if exists matches_share_url_a_len,
  drop constraint if exists matches_share_url_b_len,
  drop constraint if exists matches_share_code_a_len,
  drop constraint if exists matches_share_code_b_len;

alter table public.matches
  add constraint matches_share_url_a_len check (share_url_a is null or char_length(share_url_a) <= 500),
  add constraint matches_share_url_b_len check (share_url_b is null or char_length(share_url_b) <= 500),
  add constraint matches_share_code_a_len check (share_code_a is null or char_length(share_code_a) <= 80),
  add constraint matches_share_code_b_len check (share_code_b is null or char_length(share_code_b) <= 80);

-- Views are per listing, so two apps from the same builder count separately.
alter table public.profile_views add column if not exists id uuid;
update public.profile_views set id = gen_random_uuid() where id is null;
alter table public.profile_views alter column id set default gen_random_uuid();
alter table public.profile_views alter column id set not null;

alter table public.profile_views drop constraint if exists profile_views_pkey;
alter table public.profile_views add primary key (id);

drop index if exists profile_views_viewer_listing_uidx;
create unique index profile_views_viewer_listing_uidx
  on public.profile_views (viewer_id, listing_id)
  where listing_id is not null;

drop index if exists profile_views_viewer_profile_null_listing_uidx;
create unique index profile_views_viewer_profile_null_listing_uidx
  on public.profile_views (viewer_id, profile_id)
  where listing_id is null;

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
  on conflict (viewer_id, listing_id) where listing_id is not null
  do update
    set view_count = public.profile_views.view_count + 1,
        last_viewed_at = now();
end;
$$;

create or replace function public.my_profile_view_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct viewer_id)::integer
  from public.profile_views
  where profile_id = (select auth.uid());
$$;

create or replace function app.hey_note_body(p_note text, p_target_label text)
returns text
language sql
immutable
set search_path = ''
as $$
  select concat_ws(
    E'\n\n',
    nullif(btrim(coalesce(p_note, '')), ''),
    'Said hey to ' || coalesce(nullif(btrim(p_target_label), ''), 'your app')
  );
$$;

-- Opening DMs: each person's hey note, plus what they reacted to.
create or replace function app.seed_match_hey_notes(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  thread public.matches;
  base_at timestamptz;
begin
  select * into thread from public.matches where id = p_match_id;
  if not found then
    return;
  end if;

  select coalesce(
    (
      select msg.created_at
      from public.messages msg
      where msg.match_id = p_match_id
      order by msg.created_at
      limit 1
    ),
    thread.created_at
  ) + interval '800 milliseconds'
  into base_at;

  insert into public.messages (match_id, sender_id, kind, body, created_at)
  select
    p_match_id,
    h.from_user_id,
    'text',
    app.hey_note_body(h.note, h.target_label),
    base_at + ((row_number() over (order by h.created_at) - 1) * interval '400 milliseconds')
  from public.heys h
  where h.status = 'matched'
    and (
      (h.from_user_id = thread.user_a and h.to_app_id = thread.app_b)
      or (h.from_user_id = thread.user_b and h.to_app_id = thread.app_a)
    )
    and not exists (
      select 1
      from public.messages msg
      where msg.match_id = p_match_id
        and msg.sender_id = h.from_user_id
        and msg.kind = 'text'
        and msg.body like '%Said hey to %'
    );
end;
$$;

create or replace function app.open_match(
  p_user_1 uuid,
  p_app_1 uuid,
  p_user_2 uuid,
  p_app_2 uuid,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_id uuid;
  first_user uuid := least(p_user_1, p_user_2);
  first_app uuid := case when p_user_1 < p_user_2 then p_app_1 else p_app_2 end;
  second_user uuid := greatest(p_user_1, p_user_2);
  second_app uuid := case when p_user_1 < p_user_2 then p_app_2 else p_app_1 end;
begin
  select id into match_id
  from public.matches
  where user_a = first_user and user_b = second_user;

  if match_id is not null then
    return match_id;
  end if;

  insert into public.matches (user_a, app_a, user_b, app_b, reason)
  values (first_user, first_app, second_user, second_app, p_reason)
  returning id into match_id;

  insert into public.messages (match_id, kind, body)
  values (match_id, 'system', 'matched just now · ' || coalesce(p_reason, 'you both said hey'));

  perform app.seed_match_hey_notes(match_id);

  update public.matches
  set last_message_at = now()
  where id = match_id;

  return match_id;
end;
$$;

-- Existing matches still need those opening notes.
do $$
declare
  rec record;
begin
  for rec in select id from public.matches loop
    perform app.seed_match_hey_notes(rec.id);
  end loop;
end $$;

create or replace function public.set_trade_status(p_match_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  thread public.matches;
  steps text[] := array['Not started', 'Using', 'Feedback sent'];
  current_step integer;
  next_step integer := array_position(steps, p_status);
  my_app uuid;
  them uuid;
  who text;
begin
  select * into thread from public.matches where id = p_match_id and me in (user_a, user_b);
  if not found then
    return jsonb_build_object('status', 'blocked', 'reason', 'not_your_thread');
  end if;
  if next_step is null then
    return jsonb_build_object('status', 'blocked', 'reason', 'no_such_status');
  end if;

  current_step := array_position(
    steps,
    case when thread.user_a = me then thread.trade_a else thread.trade_b end
  );

  if next_step <= current_step then
    return jsonb_build_object('status', 'unchanged');
  end if;

  if thread.user_a = me then
    update public.matches set trade_a = p_status where id = p_match_id;
    my_app := thread.app_a;
    them := thread.user_b;
  else
    update public.matches set trade_b = p_status where id = p_match_id;
    my_app := thread.app_b;
    them := thread.user_a;
  end if;

  who := split_part(app.display_name(me), ' ', 1);

  if p_status = 'Using' then
    insert into public.messages (match_id, sender_id, kind, body)
    values (p_match_id, me, 'system', who || ' started testing');

    perform app.enqueue_push(
      them,
      'message',
      'trying:' || p_match_id::text,
      who || ' started testing',
      who || ' started testing ' || app.app_name(my_app),
      '/chat/' || p_match_id::text,
      jsonb_build_object('matchId', p_match_id)
    );
  else
    insert into public.messages (match_id, kind, body)
    values (p_match_id, 'system', 'feedback sent');
  end if;

  return jsonb_build_object('status', 'set');
end;
$$;

create or replace function public.set_match_share(
  p_match_id uuid,
  p_url text default null,
  p_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  thread public.matches;
  next_url text := nullif(btrim(coalesce(p_url, '')), '');
  next_code text := nullif(btrim(coalesce(p_code, '')), '');
begin
  select * into thread from public.matches where id = p_match_id and me in (user_a, user_b);
  if not found then
    return jsonb_build_object('status', 'blocked', 'reason', 'not_your_thread');
  end if;

  if thread.user_a = me then
    update public.matches
    set share_url_a = next_url, share_code_a = next_code
    where id = p_match_id;
  else
    update public.matches
    set share_url_b = next_url, share_code_b = next_code
    where id = p_match_id;
  end if;

  return jsonb_build_object('status', 'set');
end;
$$;

revoke all on function public.set_match_share(uuid, text, text) from public;
grant execute on function public.set_match_share(uuid, text, text) to authenticated;

create or replace function public.my_threads()
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
    return '[]'::jsonb;
  end if;

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'match_id', m.id,
          'reason', m.reason,
          'created_at', m.created_at,
          'expires_at', m.expires_at,
          'last_message_at', m.last_message_at,
          'hidden', case when m.user_a = me then m.hidden_by_a else m.hidden_by_b end,
          'trade_mine', case when m.user_a = me then m.trade_a else m.trade_b end,
          'trade_theirs', case when m.user_a = me then m.trade_b else m.trade_a end,
          'share_mine_url', case when m.user_a = me then m.share_url_a else m.share_url_b end,
          'share_mine_code', case when m.user_a = me then m.share_code_a else m.share_code_b end,
          'share_theirs_url', case when m.user_a = me then m.share_url_b else m.share_url_a end,
          'share_theirs_code', case when m.user_a = me then m.share_code_b else m.share_code_a end,
          'them', case when m.user_a = me then m.user_b else m.user_a end,
          'builder', (
            select to_jsonb(b) from public.builders b
            where b.id = case when m.user_a = me then m.user_b else m.user_a end
          ),
          'their_app', app.listing_card(case when m.user_a = me then m.app_b else m.app_a end),
          'my_app', app.listing_card(case when m.user_a = me then m.app_a else m.app_b end),
          'last_message', (
            select jsonb_build_object(
              'kind', msg.kind,
              'body', msg.body,
              'mine', msg.sender_id = me,
              'created_at', msg.created_at,
              'media', jsonb_array_length(msg.media)
            )
            from public.messages msg
            where msg.match_id = m.id
            order by msg.created_at desc
            limit 1
          ),
          'unread', (
            select count(*)
            from public.messages msg
            where msg.match_id = m.id
              and msg.read_at is null
              and msg.sender_id is not null
              and msg.sender_id <> me
          ),
          'my_feedback_id', (
            select f.id from public.feedback f
            where f.match_id = m.id and f.from_user_id = me
            limit 1
          )
        )
        order by m.last_message_at desc
      )
      from public.matches m
      where me in (m.user_a, m.user_b)
    ),
    '[]'::jsonb
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
                'stars', f.stars,
                'summary', f.summary,
                'confusion', f.confusion,
                'keep', f.keep,
                'opt_in', f.opt_in,
                'helpful', f.helpful,
                'best_moment', f.best_moment,
                'bug', f.bug,
                'bug_shot', f.bug_shot,
                'price', f.price,
                'created_at', f.created_at,
                'from', (select to_jsonb(b) from public.builders b where b.id = f.from_user_id)
              )
              order by f.created_at desc
            )
            from public.feedback f
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
