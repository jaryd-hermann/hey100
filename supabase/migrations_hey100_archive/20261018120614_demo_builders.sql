-- Demo builders, so the loop can be walked end to end by one person.
--
-- Testing a two-sided product alone is otherwise impossible: there is nobody
-- to hey back, reply or send feedback. These functions let a demo builder act,
-- but only ever toward the caller, and only accounts flagged as demo can act
-- at all. That is the safety boundary, rather than an environment check: with
-- no demo accounts in a database, every one of them does nothing.

alter table public.profiles
  add column is_demo boolean not null default false;

comment on column public.profiles.is_demo is
  'Seeded account that may act toward a caller through the demo_* functions.';

-- Each demo builder with a listing says hey to one of mine.
create or replace function public.demo_hey_me()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  my_app uuid;
  demo record;
  sent integer := 0;
begin
  if me is null then
    return jsonb_build_object('status', 'blocked', 'reason', 'not_signed_in');
  end if;

  select id into my_app
  from public.apps
  where owner_id = me and published_at is not null
  order by is_primary desc, created_at
  limit 1;

  if my_app is null then
    return jsonb_build_object('status', 'blocked', 'reason', 'no_listing');
  end if;

  for demo in
    select p.id as owner_id, a.id as app_id, a.name
    from public.profiles p
    join public.apps a on a.owner_id = p.id and a.published_at is not null
    where p.is_demo
      and p.id <> me
      -- Nothing to add if they already said hey, or you already matched.
      and not exists (
        select 1 from public.heys h where h.from_user_id = p.id and h.to_app_id = my_app
      )
      and not exists (
        select 1 from public.matches m
        where m.user_a = least(p.id, me) and m.user_b = greatest(p.id, me)
      )
  loop
    insert into public.heys (
      from_user_id, from_app_id, to_app_id, to_user_id,
      target_type, target_label, note
    )
    values (
      demo.owner_id, demo.app_id, my_app, me,
      'app', 'their app',
      'Saw your listing and the problem you are solving is one I have. Happy to swap a week of real testing.'
    );

    sent := sent + 1;
  end loop;

  return jsonb_build_object('status', 'sent', 'heys', sent);
end;
$$;

-- The other side of one of my threads replies, if they are a demo builder.
create or replace function public.demo_reply(p_match_id uuid, p_body text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  thread public.matches;
  them uuid;
begin
  select * into thread from public.matches where id = p_match_id and me in (user_a, user_b);
  if not found then
    return jsonb_build_object('status', 'blocked', 'reason', 'not_your_thread');
  end if;

  them := case when thread.user_a = me then thread.user_b else thread.user_a end;

  if not exists (select 1 from public.profiles where id = them and is_demo) then
    return jsonb_build_object('status', 'blocked', 'reason', 'not_a_demo_builder');
  end if;

  insert into public.messages (match_id, sender_id, kind, body)
  values (
    p_match_id, them, 'text',
    coalesce(
      nullif(btrim(coalesce(p_body, '')), ''),
      'Installed it this morning. Give me today with it and I will send you proper notes tonight.'
    )
  );

  update public.matches
  set last_message_at = now(),
      expires_at = now() + interval '7 days',
      trade_a = case when user_a = them and trade_a = 'Not started' then 'Using' else trade_a end,
      trade_b = case when user_b = them and trade_b = 'Not started' then 'Using' else trade_b end
  where id = p_match_id;

  return jsonb_build_object('status', 'sent');
end;
$$;

-- The other side leaves feedback on my app, which is what fills the inbox.
create or replace function public.demo_feedback(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  thread public.matches;
  them uuid;
  my_app uuid;
  feedback_id uuid;
begin
  select * into thread from public.matches where id = p_match_id and me in (user_a, user_b);
  if not found then
    return jsonb_build_object('status', 'blocked', 'reason', 'not_your_thread');
  end if;

  if thread.user_a = me then
    them := thread.user_b;
    my_app := thread.app_a;
  else
    them := thread.user_a;
    my_app := thread.app_b;
  end if;

  if not exists (select 1 from public.profiles where id = them and is_demo) then
    return jsonb_build_object('status', 'blocked', 'reason', 'not_a_demo_builder');
  end if;

  insert into public.feedback (
    match_id, app_id, from_user_id, to_user_id,
    stars, summary, confusion, keep, opt_in, best_moment, price
  )
  values (
    p_match_id, my_app, them, me,
    4,
    'Really clean build. I got the point of it within a minute, and the one screen I needed was where I expected it.',
    'The empty state did not tell me what to do first, so I tapped around for a bit.',
    'Yes', true,
    'When I saw my own data in it the second time I opened it.',
    '$3–5'
  )
  on conflict (match_id, from_user_id, app_id) do update
    set stars = excluded.stars
  returning id into feedback_id;

  insert into public.messages (match_id, sender_id, kind, body, feedback)
  values (
    p_match_id, them, 'feedback',
    'Really clean build. I got the point of it within a minute, and the one screen I needed was where I expected it.',
    jsonb_build_object('stars', 4, 'keep', 'Yes', 'price', '$3–5')
  );

  update public.matches
  set trade_a = case when user_a = them then 'Feedback sent' else trade_a end,
      trade_b = case when user_b = them then 'Feedback sent' else trade_b end,
      last_message_at = now()
  where id = p_match_id;

  return jsonb_build_object('status', 'sent', 'feedback_id', feedback_id);
end;
$$;

revoke all on function public.demo_hey_me() from public;
revoke all on function public.demo_reply(uuid, text) from public;
revoke all on function public.demo_feedback(uuid) from public;

grant execute on function public.demo_hey_me() to authenticated;
grant execute on function public.demo_reply(uuid, text) to authenticated;
grant execute on function public.demo_feedback(uuid) to authenticated;
