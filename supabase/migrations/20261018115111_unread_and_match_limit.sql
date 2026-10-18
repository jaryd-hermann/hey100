-- Two corrections the loop test found.
--
-- 1. The system line that opens a thread was counting as unread, so every new
--    match arrived with a badge of 1 before anyone had said anything. Only what
--    the other person actually sent is unread.
--
-- 2. Free accounts get three matches, and nothing was enforcing it. The fourth
--    is now refused with a reason the client turns into the paywall.

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
          -- Only what the other person sent. System lines are not unread mail.
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
  match_cap integer;
  matches_now integer;
  last_free_match boolean := false;
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

  select id into existing_match
  from public.matches
  where user_a = least(me, target.owner_id) and user_b = greatest(me, target.owner_id);

  if existing_match is not null then
    return jsonb_build_object('status', 'matched', 'match_id', existing_match);
  end if;

  if me_plan <> 'pro' and app.heys_sent_today(me) >= 8 then
    return jsonb_build_object('status', 'blocked', 'reason', 'daily_limit');
  end if;

  select * into reciprocal
  from public.heys h
  where h.from_user_id = target.owner_id
    and h.to_user_id = me
    and h.status = 'pending'
  order by h.created_at
  limit 1
  for update;

  has_reciprocal := found;

  -- Section 10: three matches on the free plan. The hey itself is still
  -- allowed when the cap is full, because the other side may upgrade; it is
  -- the match that is refused, and only to the person who is full.
  if has_reciprocal and me_plan <> 'pro' then
    match_cap := 3 + coalesce(me_bonus, 0);
    matches_now := app.match_count(me);

    if matches_now >= match_cap then
      return jsonb_build_object(
        'status', 'blocked',
        'reason', 'match_limit',
        'matches', matches_now,
        'cap', match_cap
      );
    end if;

    last_free_match := matches_now + 1 >= match_cap;
  end if;

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

  match_id := app.open_match(
    me, p_from_app_id,
    target.owner_id, reciprocal.from_app_id,
    'you both said hey'
  );

  return jsonb_build_object(
    'status', 'matched',
    'match_id', match_id,
    -- True on the last free match, so the client can say so before the wall.
    'hit_paywall', last_free_match
  );
end;
$$;
