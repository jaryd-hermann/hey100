-- Trying-it can go back to not started, and share link/code changes land in chat.

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
  current_status text;
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

  current_status := case when thread.user_a = me then thread.trade_a else thread.trade_b end;
  current_step := array_position(steps, current_status);

  if current_status = p_status then
    return jsonb_build_object('status', 'unchanged');
  end if;

  -- Feedback sent is terminal. Trying it and hasn't-tried can swap.
  if current_status = 'Feedback sent' then
    return jsonb_build_object('status', 'unchanged');
  end if;
  if p_status = 'Feedback sent' and current_step > next_step then
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
  elsif p_status = 'Not started' then
    insert into public.messages (match_id, sender_id, kind, body)
    values (p_match_id, me, 'system', who || ' hasn''t tried it');
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
  prev_url text;
  prev_code text;
  who text;
begin
  select * into thread from public.matches where id = p_match_id and me in (user_a, user_b);
  if not found then
    return jsonb_build_object('status', 'blocked', 'reason', 'not_your_thread');
  end if;

  if thread.user_a = me then
    prev_url := thread.share_url_a;
    prev_code := thread.share_code_a;
    update public.matches
    set share_url_a = next_url, share_code_a = next_code
    where id = p_match_id;
  else
    prev_url := thread.share_url_b;
    prev_code := thread.share_code_b;
    update public.matches
    set share_url_b = next_url, share_code_b = next_code
    where id = p_match_id;
  end if;

  if prev_url is not distinct from next_url and prev_code is not distinct from next_code then
    return jsonb_build_object('status', 'unchanged');
  end if;

  who := split_part(app.display_name(me), ' ', 1);

  if prev_code is distinct from next_code then
    insert into public.messages (match_id, sender_id, kind, body)
    values (
      p_match_id,
      me,
      'system',
      who || case
        when next_code is null then ' removed the code'
        when prev_code is null then ' added a code'
        else ' updated the code'
      end
    );
  end if;

  if prev_url is distinct from next_url then
    insert into public.messages (match_id, sender_id, kind, body)
    values (
      p_match_id,
      me,
      'system',
      who || case
        when next_url is null then ' removed the link'
        when prev_url is null then ' added a link'
        else ' updated the link'
      end
    );
  end if;

  return jsonb_build_object('status', 'set');
end;
$$;
