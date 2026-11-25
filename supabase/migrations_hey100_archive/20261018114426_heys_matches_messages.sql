-- The loop: hey, pass, match, chat, trade, feedback.
--
-- Everything that decides whether an action is allowed lives in a function
-- rather than a policy, because these are multi-table decisions: saying hey has
-- to check the daily allowance, look for a hey coming the other way, create a
-- match, mark both heys and open the thread, all or nothing.
--
-- So writes to these tables are not granted to clients at all, with two
-- exceptions noted where they are granted: passing, and rating whether someone
-- else's feedback helped. Both are genuinely one row in one table.

/* ---------------------------------------------------------------- */
/* Heys and passes                                                  */
/* ---------------------------------------------------------------- */

create table public.heys (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles (id) on delete cascade,
  -- Section 9: a hey is attributed to the sender's best-fitting app.
  from_app_id uuid not null references public.apps (id) on delete cascade,
  to_app_id uuid not null references public.apps (id) on delete cascade,
  -- Denormalised so the Heys queue does not join apps to find its own.
  to_user_id uuid not null references public.profiles (id) on delete cascade,

  target_type text not null check (target_type in ('app', 'prompt', 'media')),
  -- What was heyed: their app, a prompt label, or a screenshot caption.
  target_label text not null default 'their app',
  note text check (char_length(note) <= 300),

  status text not null default 'pending' check (status in ('pending', 'passed', 'matched')),
  pass_reason text,

  -- One follow-up per hey, unlocked 24 hours later.
  follow_up_note text check (char_length(follow_up_note) <= 300),
  follow_up_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Saying hey twice to the same listing is the same hey.
  unique (from_user_id, to_app_id),
  constraint heys_not_to_self check (from_user_id <> to_user_id)
);

create index heys_inbox_idx on public.heys (to_user_id, status, created_at desc);
create index heys_sent_idx on public.heys (from_user_id, created_at desc);

create trigger heys_touch_updated_at
  before update on public.heys
  for each row execute function app.touch_updated_at();

create table public.passes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  app_id uuid not null references public.apps (id) on delete cascade,
  -- Optional, from the "why did you pass?" prompt.
  reason text,
  created_at timestamptz not null default now(),
  primary key (user_id, app_id)
);

/* ---------------------------------------------------------------- */
/* Matches                                                          */
/* ---------------------------------------------------------------- */

-- The pair is stored in uuid order, which is what makes one unique constraint
-- enough to stop a double match. `a` and `b` mean nothing beyond that, so every
-- read resolves "mine" and "theirs" against the viewer.
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  app_a uuid not null references public.apps (id) on delete cascade,
  app_b uuid not null references public.apps (id) on delete cascade,

  -- Shown under the match header: why these two met.
  reason text,

  trade_a text not null default 'Not started'
    check (trade_a in ('Not started', 'Using', 'Feedback sent')),
  trade_b text not null default 'Not started'
    check (trade_b in ('Not started', 'Using', 'Feedback sent')),

  -- Section 5: a thread that goes nowhere expires.
  expires_at timestamptz not null default now() + interval '7 days',
  last_message_at timestamptz not null default now(),

  -- Hiding the thread keeps the match, which is the only record of a trade.
  hidden_by_a boolean not null default false,
  hidden_by_b boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_a, user_b),
  constraint matches_ordered check (user_a < user_b)
);

create index matches_for_user_idx on public.matches (user_a, last_message_at desc);
create index matches_for_other_idx on public.matches (user_b, last_message_at desc);

create trigger matches_touch_updated_at
  before update on public.matches
  for each row execute function app.touch_updated_at();

/* ---------------------------------------------------------------- */
/* Messages                                                         */
/* ---------------------------------------------------------------- */

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  -- Null for the system lines that open a thread or announce a trade.
  sender_id uuid references public.profiles (id) on delete set null,

  kind text not null default 'text'
    check (kind in ('system', 'text', 'media', 'feedback', 'announcement')),
  body text check (char_length(body) <= 2000),
  -- [{storage_path, kind, label}] for attachments.
  media jsonb not null default '[]'::jsonb,
  -- {stars, keep} when a feedback card is pinned into the thread.
  feedback jsonb,

  -- A thread has two people, so one timestamp is all "read" needs.
  read_at timestamptz,
  created_at timestamptz not null default now(),

  constraint messages_say_something
    check (body is not null or jsonb_array_length(media) > 0 or kind <> 'text')
);

create index messages_thread_idx on public.messages (match_id, created_at);

/* ---------------------------------------------------------------- */
/* Feedback                                                         */
/* ---------------------------------------------------------------- */

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  -- The app being reviewed, which is the receiver's.
  app_id uuid not null references public.apps (id) on delete cascade,
  from_user_id uuid not null references public.profiles (id) on delete cascade,
  to_user_id uuid not null references public.profiles (id) on delete cascade,

  stars smallint not null check (stars between 1 and 5),
  summary text not null check (char_length(summary) between 1 and 2000),
  confusion text,
  keep text check (keep in ('Yes', 'Maybe', 'No')),
  -- Whether the quote may be used as a testimonial.
  opt_in boolean not null default false,

  -- The receiver rates whether it helped, which feeds the giver's reputation.
  helpful text check (helpful in ('yes', 'no')),

  created_at timestamptz not null default now(),
  -- One review per app per match, so a trade cannot be rated twice.
  unique (match_id, from_user_id, app_id)
);

create index feedback_for_app_idx on public.feedback (app_id, created_at desc);

/* ---------------------------------------------------------------- */
/* Builders: the public half of a profile                           */
/* ---------------------------------------------------------------- */

-- Profiles are owner-only readable, which is what keeps a real name private.
-- Discover still needs a name, a photo and a job, so this view exposes exactly
-- the fields the spec calls public, honours each field's visibility toggle, and
-- reveals the real name only to someone already matched.
--
-- security_invoker is off so the view can read profiles the viewer cannot; its
-- column list is then the whole of what it is willing to say.
create view public.builders with (security_invoker = false) as
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
  -- Section 4: the real name appears once there is a match, and not before.
  case
    when exists (
      select 1 from public.matches m
      where (m.user_a = p.id and m.user_b = (select auth.uid()))
         or (m.user_b = p.id and m.user_a = (select auth.uid()))
    )
    then p.real_name
  end as real_name
from public.profiles p;

comment on view public.builders is
  'The public half of a profile. real_name is only non-null to a matched viewer.';

/* ---------------------------------------------------------------- */
/* Reads: row level security                                        */
/* ---------------------------------------------------------------- */

revoke all on public.heys from anon, authenticated;
revoke all on public.passes from anon, authenticated;
revoke all on public.matches from anon, authenticated;
revoke all on public.messages from anon, authenticated;
revoke all on public.feedback from anon, authenticated;

grant select on public.builders to anon, authenticated;
grant select on public.heys to authenticated;
grant select on public.matches to authenticated;
grant select on public.messages to authenticated;
grant select on public.feedback to authenticated;

-- Passing is one row in one table and needs no coordination, so it is a direct
-- write. So is rating whether someone's feedback helped.
grant select, insert, delete on public.passes to authenticated;
grant update (helpful) on public.feedback to authenticated;

alter table public.heys enable row level security;
alter table public.passes enable row level security;
alter table public.matches enable row level security;
alter table public.messages enable row level security;
alter table public.feedback enable row level security;

create policy "Heys are visible to both sides"
  on public.heys
  for select
  to authenticated
  using ((select auth.uid()) in (from_user_id, to_user_id));

create policy "Passes are private to the person who passed"
  on public.passes
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Matches are visible to both sides"
  on public.matches
  for select
  to authenticated
  using ((select auth.uid()) in (user_a, user_b));

create policy "Messages are visible inside the match"
  on public.messages
  for select
  to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and (select auth.uid()) in (m.user_a, m.user_b)
    )
  );

create policy "Feedback is visible to both sides"
  on public.feedback
  for select
  to authenticated
  using ((select auth.uid()) in (from_user_id, to_user_id));

create policy "The receiver can rate whether feedback helped"
  on public.feedback
  for update
  to authenticated
  using ((select auth.uid()) = to_user_id)
  with check ((select auth.uid()) = to_user_id);

/* ---------------------------------------------------------------- */
/* Allowances                                                       */
/* ---------------------------------------------------------------- */

-- Section 10: eight heys a day on the free plan.
--
-- The day is UTC, which is the one open question here: a builder in Auckland
-- gets their reset mid-afternoon. Fixing that means storing a timezone on the
-- profile, so it is deliberately one function to change rather than a schema
-- decision taken now.
create or replace function app.heys_sent_today(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.heys h
  where h.from_user_id = p_user_id
    and h.created_at >= date_trunc('day', now());
$$;

create or replace function app.match_count(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.matches m
  where p_user_id in (m.user_a, m.user_b);
$$;

-- What the header counters show: heys left today, and matches left.
create or replace function public.my_counters()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  me_plan text;
  me_bonus smallint;
  heys_today integer;
  matches integer;
begin
  if me is null then
    return jsonb_build_object('error', 'not_signed_in');
  end if;

  select plan, bonus_matches into me_plan, me_bonus from public.profiles where id = me;
  heys_today := app.heys_sent_today(me);
  matches := app.match_count(me);

  return jsonb_build_object(
    'plan', me_plan,
    'heys_today', heys_today,
    'heys_left', case when me_plan = 'pro' then null else greatest(0, 8 - heys_today) end,
    'matches', matches,
    'matches_left', case
      when me_plan = 'pro' then null
      else greatest(0, 3 + coalesce(me_bonus, 0) - matches)
    end,
    'bonus_matches', coalesce(me_bonus, 0)
  );
end;
$$;

/* ---------------------------------------------------------------- */
/* Actions                                                          */
/* ---------------------------------------------------------------- */

-- Opens a match and its first system line, or returns the one that already
-- exists. Called only from say_hey, which has established that both sides
-- want it.
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

  -- Already matched, so the system line has already been said.
  if match_id is not null then
    return match_id;
  end if;

  insert into public.matches (user_a, app_a, user_b, app_b, reason)
  values (first_user, first_app, second_user, second_app, p_reason)
  returning id into match_id;

  insert into public.messages (match_id, kind, body)
  values (match_id, 'system', 'matched just now · ' || coalesce(p_reason, 'you both said hey'));

  return match_id;
end;
$$;

-- Says hey, and matches if the other side already did.
--
-- Returns {status: sent|matched|blocked, reason, match_id, hit_paywall}. A
-- blocked result is a plan limit or a stale screen, not an error, because the
-- client turns it into a paywall or a toast rather than a crash.
create or replace function public.say_hey(
  p_to_app_id uuid,
  p_from_app_id uuid,
  p_target_type text default 'app',
  p_target_label text default 'their app',
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  me_plan text;
  me_bonus smallint;
  target public.apps;
  reciprocal public.heys;
  has_reciprocal boolean;
  existing_match uuid;
  match_id uuid;
  hit_paywall boolean := false;
begin
  if me is null then
    return jsonb_build_object('status', 'blocked', 'reason', 'not_signed_in');
  end if;

  select plan, bonus_matches into me_plan, me_bonus from public.profiles where id = me;

  select * into target from public.apps where id = p_to_app_id and published_at is not null;
  if not found then
    return jsonb_build_object('status', 'blocked', 'reason', 'no_such_listing');
  end if;
  if target.owner_id = me then
    return jsonb_build_object('status', 'blocked', 'reason', 'your_own_listing');
  end if;

  if not exists (select 1 from public.apps where id = p_from_app_id and owner_id = me) then
    return jsonb_build_object('status', 'blocked', 'reason', 'not_your_app');
  end if;

  -- Already matched: the hey button should not have been there, so say so
  -- rather than opening a second thread.
  select id into existing_match
  from public.matches
  where (user_a = least(me, target.owner_id) and user_b = greatest(me, target.owner_id));

  if existing_match is not null then
    return jsonb_build_object('status', 'matched', 'match_id', existing_match);
  end if;

  if me_plan <> 'pro' and app.heys_sent_today(me) >= 8 then
    return jsonb_build_object('status', 'blocked', 'reason', 'daily_limit');
  end if;

  -- Is there a hey coming the other way? Locked, so two simultaneous heys
  -- cannot both decide they were first.
  select * into reciprocal
  from public.heys h
  where h.from_user_id = target.owner_id
    and h.to_user_id = me
    and h.status = 'pending'
  order by h.created_at
  limit 1
  for update;

  has_reciprocal := found;

  insert into public.heys (
    from_user_id, from_app_id, to_app_id, to_user_id,
    target_type, target_label, note, status
  )
  values (
    me, p_from_app_id, p_to_app_id, target.owner_id,
    p_target_type, p_target_label, nullif(btrim(coalesce(p_note, '')), ''),
    case when has_reciprocal then 'matched' else 'pending' end
  )
  on conflict (from_user_id, to_app_id) do update
    set note = coalesce(excluded.note, public.heys.note),
        target_type = excluded.target_type,
        target_label = excluded.target_label,
        status = excluded.status;

  if not has_reciprocal then
    return jsonb_build_object('status', 'sent');
  end if;

  update public.heys set status = 'matched' where id = reciprocal.id;

  -- Section 6: the third match is where a free account meets the paywall.
  if me_plan <> 'pro' and app.match_count(me) + 1 >= 3 + coalesce(me_bonus, 0) then
    hit_paywall := true;
  end if;

  match_id := app.open_match(
    me, p_from_app_id,
    target.owner_id, reciprocal.from_app_id,
    'you both said hey'
  );

  return jsonb_build_object('status', 'matched', 'match_id', match_id, 'hit_paywall', hit_paywall);
end;
$$;

-- Hey back from the Heys queue, which always matches.
create or replace function public.hey_back(p_hey_id uuid, p_from_app_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  incoming public.heys;
begin
  select * into incoming
  from public.heys h
  where h.id = p_hey_id and h.to_user_id = me and h.status = 'pending'
  for update;

  if not found then
    return jsonb_build_object('status', 'blocked', 'reason', 'no_such_hey');
  end if;

  -- Saying hey to their listing is what creates the match, through the same
  -- path as any other hey, so the rules cannot differ between the two.
  return public.say_hey(
    incoming.from_app_id,
    coalesce(p_from_app_id, incoming.to_app_id),
    'app',
    'their app',
    null
  );
end;
$$;

-- Passes an incoming hey, which also hides that listing in Discover.
create or replace function public.pass_hey(p_hey_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  incoming public.heys;
  reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  select * into incoming
  from public.heys h
  where h.id = p_hey_id and h.to_user_id = me
  for update;

  if not found then
    return jsonb_build_object('status', 'blocked', 'reason', 'no_such_hey');
  end if;

  update public.heys
  set status = 'passed', pass_reason = reason
  where id = p_hey_id;

  insert into public.passes (user_id, app_id, reason)
  values (me, incoming.from_app_id, reason)
  on conflict (user_id, app_id) do nothing;

  return jsonb_build_object('status', 'passed');
end;
$$;

-- One follow-up per hey, and only once 24 hours have passed.
create or replace function public.follow_up_hey(p_hey_id uuid, p_note text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  sent public.heys;
begin
  select * into sent
  from public.heys h
  where h.id = p_hey_id and h.from_user_id = me
  for update;

  if not found then
    return jsonb_build_object('status', 'blocked', 'reason', 'no_such_hey');
  end if;
  if sent.status <> 'pending' then
    return jsonb_build_object('status', 'blocked', 'reason', 'not_pending');
  end if;
  if sent.follow_up_at is not null then
    return jsonb_build_object('status', 'blocked', 'reason', 'already_followed_up');
  end if;
  if sent.created_at > now() - interval '24 hours' then
    return jsonb_build_object('status', 'blocked', 'reason', 'too_soon');
  end if;

  update public.heys
  set follow_up_note = btrim(p_note), follow_up_at = now()
  where id = p_hey_id;

  return jsonb_build_object('status', 'sent');
end;
$$;

-- Sends a message, which is also what keeps a thread from expiring.
create or replace function public.send_message(
  p_match_id uuid,
  p_body text default null,
  p_media jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  thread public.matches;
  message_id uuid;
  trimmed text := nullif(btrim(coalesce(p_body, '')), '');
  attachments jsonb := coalesce(p_media, '[]'::jsonb);
begin
  select * into thread from public.matches where id = p_match_id and me in (user_a, user_b);
  if not found then
    return jsonb_build_object('status', 'blocked', 'reason', 'not_your_thread');
  end if;
  if trimmed is null and jsonb_array_length(attachments) = 0 then
    return jsonb_build_object('status', 'blocked', 'reason', 'empty');
  end if;

  insert into public.messages (match_id, sender_id, kind, body, media)
  values (
    p_match_id, me,
    case when trimmed is null then 'media' else 'text' end,
    trimmed, attachments
  )
  returning id into message_id;

  -- A reply is what extends the seven day window, so a thread people are
  -- actually using never expires underneath them. It also unhides the thread
  -- for whoever had hidden it.
  update public.matches
  set last_message_at = now(),
      expires_at = now() + interval '7 days',
      hidden_by_a = case when user_a = me then hidden_by_a else false end,
      hidden_by_b = case when user_b = me then hidden_by_b else false end
  where id = p_match_id;

  return jsonb_build_object('status', 'sent', 'message_id', message_id);
end;
$$;

-- Trades only move forward, so opening a link cannot undo feedback.
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
  else
    update public.matches set trade_b = p_status where id = p_match_id;
  end if;

  insert into public.messages (match_id, kind, body)
  values (p_match_id, 'system', case p_status
    when 'Using' then 'they started testing'
    else 'feedback sent'
  end);

  return jsonb_build_object('status', 'set');
end;
$$;

-- Hides a thread for the caller. The match itself is kept.
create or replace function public.hide_thread(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  touched integer;
begin
  update public.matches
  set hidden_by_a = case when user_a = me then true else hidden_by_a end,
      hidden_by_b = case when user_b = me then true else hidden_by_b end
  where id = p_match_id and me in (user_a, user_b);

  get diagnostics touched = row_count;
  if touched = 0 then
    return jsonb_build_object('status', 'blocked', 'reason', 'not_your_thread');
  end if;

  return jsonb_build_object('status', 'hidden');
end;
$$;

-- Marks everything the other side sent in this thread as read.
create or replace function public.mark_thread_read(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  update public.messages
  set read_at = now()
  where match_id = p_match_id
    and read_at is null
    and sender_id is distinct from me
    and exists (
      select 1 from public.matches m
      where m.id = p_match_id and me in (m.user_a, m.user_b)
    );

  return jsonb_build_object('status', 'read');
end;
$$;

-- Leaves feedback on the other side's app, pins it into the thread, and moves
-- the trade to its last step. One call, because feedback that saved without
-- appearing in the chat would look lost.
create or replace function public.leave_feedback(
  p_match_id uuid,
  p_stars smallint,
  p_summary text,
  p_confusion text default null,
  p_keep text default null,
  p_opt_in boolean default false
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

  insert into public.feedback (
    match_id, app_id, from_user_id, to_user_id, stars, summary, confusion, keep, opt_in
  )
  values (
    p_match_id, their_app, me, them, p_stars, btrim(p_summary),
    nullif(btrim(coalesce(p_confusion, '')), ''), p_keep, coalesce(p_opt_in, false)
  )
  on conflict (match_id, from_user_id, app_id) do update
    set stars = excluded.stars,
        summary = excluded.summary,
        confusion = excluded.confusion,
        keep = excluded.keep,
        opt_in = excluded.opt_in
  returning id into feedback_id;

  insert into public.messages (match_id, sender_id, kind, body, feedback)
  values (
    p_match_id, me, 'feedback', btrim(p_summary),
    jsonb_build_object('stars', p_stars, 'keep', p_keep)
  );

  perform public.set_trade_status(p_match_id, 'Feedback sent');

  return jsonb_build_object('status', 'sent', 'feedback_id', feedback_id);
end;
$$;

/* ---------------------------------------------------------------- */
/* Who may call what                                                */
/* ---------------------------------------------------------------- */

-- Functions are executable by everyone by default, so each one is taken back
-- and handed only to signed-in callers.
revoke all on function public.my_counters() from public;
revoke all on function public.say_hey(uuid, uuid, text, text, text) from public;
revoke all on function public.hey_back(uuid, uuid) from public;
revoke all on function public.pass_hey(uuid, text) from public;
revoke all on function public.follow_up_hey(uuid, text) from public;
revoke all on function public.send_message(uuid, text, jsonb) from public;
revoke all on function public.set_trade_status(uuid, text) from public;
revoke all on function public.hide_thread(uuid) from public;
revoke all on function public.mark_thread_read(uuid) from public;
revoke all on function public.leave_feedback(uuid, smallint, text, text, text, boolean) from public;

grant execute on function public.my_counters() to authenticated;
grant execute on function public.say_hey(uuid, uuid, text, text, text) to authenticated;
grant execute on function public.hey_back(uuid, uuid) to authenticated;
grant execute on function public.pass_hey(uuid, text) to authenticated;
grant execute on function public.follow_up_hey(uuid, text) to authenticated;
grant execute on function public.send_message(uuid, text, jsonb) to authenticated;
grant execute on function public.set_trade_status(uuid, text) to authenticated;
grant execute on function public.hide_thread(uuid) to authenticated;
grant execute on function public.mark_thread_read(uuid) to authenticated;
grant execute on function public.leave_feedback(uuid, smallint, text, text, text, boolean)
  to authenticated;

-- Chat is the one surface that cannot poll, so these are published for
-- Realtime. Row level security still applies to the stream.
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.heys;
