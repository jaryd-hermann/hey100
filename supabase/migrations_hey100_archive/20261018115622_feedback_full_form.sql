-- The rest of the feedback form.
--
-- The form asks for the best moment, a bug with an optional screenshot, and
-- what the app feels worth paying. None of those had a column, so they were
-- being collected and thrown away. "Fair price" on the inbox summary is one of
-- them, which is the visible half of the same gap.

alter table public.feedback
  add column best_moment text,
  add column bug text,
  -- Storage path in listing-media, uploaded by the person giving feedback.
  add column bug_shot text,
  add column price text;

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
  p_price text default null
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
    match_id, app_id, from_user_id, to_user_id,
    stars, summary, confusion, keep, opt_in,
    best_moment, bug, bug_shot, price
  )
  values (
    p_match_id, their_app, me, them,
    p_stars, btrim(p_summary),
    nullif(btrim(coalesce(p_confusion, '')), ''), p_keep, coalesce(p_opt_in, false),
    nullif(btrim(coalesce(p_best_moment, '')), ''),
    nullif(btrim(coalesce(p_bug, '')), ''),
    p_bug_shot,
    p_price
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
        price = excluded.price
  returning id into feedback_id;

  insert into public.messages (match_id, sender_id, kind, body, feedback)
  values (
    p_match_id, me, 'feedback', btrim(p_summary),
    jsonb_build_object('stars', p_stars, 'keep', p_keep, 'price', p_price)
  );

  perform public.set_trade_status(p_match_id, 'Feedback sent');

  return jsonb_build_object('status', 'sent', 'feedback_id', feedback_id);
end;
$$;

-- The old six-argument signature would otherwise linger and be ambiguous.
drop function if exists public.leave_feedback(uuid, smallint, text, text, text, boolean);

revoke all on function public.leave_feedback(
  uuid, smallint, text, text, text, boolean, text, text, text, text
) from public;

grant execute on function public.leave_feedback(
  uuid, smallint, text, text, text, boolean, text, text, text, text
) to authenticated;

-- The inbox summarises these, so they travel with each entry.
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
