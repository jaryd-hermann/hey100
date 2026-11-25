-- Reciprocal feedback (Airbnb-style), edit-in-place, dual pushes, coach admin.

create or replace function app.first_name(p_user_id uuid)
returns text
language sql
stable
set search_path = public
as $$
  select coalesce(nullif(split_part(app.display_name(p_user_id), ' ', 1), ''), 'them');
$$;

create or replace function app.feedback_unlocked(p_match_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.feedback f
    where f.match_id = p_match_id
      and f.from_user_id = p_user_id
  );
$$;

create or replace function app.feedback_field_karma(
  p_stars smallint,
  p_summary text,
  p_keep text,
  p_confusion text,
  p_best_moment text,
  p_bug text,
  p_bug_shot text,
  p_bug_shots text[],
  p_video_path text,
  p_price text
)
returns integer
language sql
immutable
as $$
  select (
    case when coalesce(p_stars, 0) > 0 and nullif(btrim(coalesce(p_summary, '')), '') is not null then 2 else 0 end
    + case when p_keep is not null then 2 else 0 end
    + case when nullif(btrim(coalesce(p_confusion, '')), '') is not null then 2 else 0 end
    + case when nullif(btrim(coalesce(p_best_moment, '')), '') is not null then 2 else 0 end
    + case
        when nullif(btrim(coalesce(p_bug, '')), '') is not null
          or p_bug_shot is not null
          or coalesce(array_length(p_bug_shots, 1), 0) > 0
          or p_video_path is not null
        then 2 else 0
      end
    + case when nullif(btrim(coalesce(p_price, '')), '') is not null then 2 else 0 end
  );
$$;

drop policy if exists "Feedback is visible to both sides" on public.feedback;
create policy "Feedback is visible to both sides"
  on public.feedback
  for select
  to authenticated
  using (
    (select auth.uid()) = from_user_id
    or (
      (select auth.uid()) = to_user_id
      and app.feedback_unlocked(match_id, (select auth.uid()))
    )
  );

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
  existing_id uuid;
  media jsonb := '[]'::jsonb;
  payload jsonb;
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

  payload := jsonb_build_object('stars', p_stars, 'keep', p_keep, 'price', p_price, 'keep_why', p_keep_why);

  select f.id into existing_id
  from public.feedback f
  where f.match_id = p_match_id
    and f.from_user_id = me
    and f.app_id = their_app;

  if existing_id is not null then
    update public.feedback
      set stars = p_stars,
          summary = btrim(p_summary),
          confusion = nullif(btrim(coalesce(p_confusion, '')), ''),
          keep = p_keep,
          opt_in = coalesce(p_opt_in, false),
          best_moment = nullif(btrim(coalesce(p_best_moment, '')), ''),
          bug = nullif(btrim(coalesce(p_bug, '')), ''),
          bug_shot = coalesce(p_bug_shot, bug_shot),
          price = p_price,
          keep_why = nullif(btrim(coalesce(p_keep_why, '')), ''),
          bug_shots = coalesce(p_bug_shots, bug_shots),
          video_path = coalesce(p_video_path, video_path)
    where id = existing_id
    returning id into feedback_id;

    update public.messages
      set body = btrim(p_summary),
          feedback = payload,
          media = media
    where id = (
      select msg.id
      from public.messages msg
      where msg.match_id = p_match_id
        and msg.sender_id = me
        and msg.kind = 'feedback'
      order by msg.created_at desc
      limit 1
    );

    if not found then
      insert into public.messages (match_id, sender_id, kind, body, feedback, media)
      values (p_match_id, me, 'feedback', btrim(p_summary), payload, media);
    end if;

    perform public.set_trade_status(p_match_id, 'Feedback sent');
    return jsonb_build_object('status', 'updated', 'feedback_id', feedback_id);
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
  returning id into feedback_id;

  insert into public.messages (match_id, sender_id, kind, body, feedback, media)
  values (p_match_id, me, 'feedback', btrim(p_summary), payload, media);

  perform public.set_trade_status(p_match_id, 'Feedback sent');

  return jsonb_build_object('status', 'sent', 'feedback_id', feedback_id);
end;
$$;

create or replace function app.on_feedback_push()
returns trigger
language plpgsql
security definer
set search_path = app, public
as $$
declare
  giver text;
  receiver text;
  app_title text;
  they_gave boolean;
  karma integer;
begin
  giver := app.first_name(new.from_user_id);
  receiver := app.first_name(new.to_user_id);
  app_title := app.app_name(new.app_id);
  they_gave := app.feedback_unlocked(new.match_id, new.to_user_id);
  karma := app.feedback_field_karma(
    new.stars,
    new.summary,
    new.keep,
    new.confusion,
    new.best_moment,
    new.bug,
    new.bug_shot,
    new.bug_shots,
    new.video_path,
    new.price
  );

  perform app.enqueue_push(
    new.from_user_id,
    'feedback_thanks',
    'feedback_thanks:' || new.id::text,
    'Thanks — +' || karma || ' karma',
    'You shared feedback with ' || receiver,
    '/chat/' || new.match_id::text,
    jsonb_build_object('matchId', new.match_id, 'karma', karma)
  );

  if they_gave then
    perform app.enqueue_push(
      new.to_user_id,
      'feedback',
      'feedback:' || new.match_id::text || ':' || new.from_user_id::text,
      'You have feedback! Check it out here',
      giver || ' left feedback on ' || app_title,
      '/chat/' || new.match_id::text,
      jsonb_build_object('matchId', new.match_id)
    );
  else
    perform app.enqueue_push(
      new.to_user_id,
      'feedback',
      'feedback:' || new.match_id::text || ':' || new.from_user_id::text,
      'Share your feedback with ' || giver || ' to unlock it',
      giver || ' left feedback on ' || app_title,
      '/feedback-form?matchId=' || new.match_id::text,
      jsonb_build_object('matchId', new.match_id)
    );
  end if;

  return new;
end;
$$;

create or replace function public.match_messages(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  unlocked boolean;
begin
  if me is null or p_match_id is null then
    return '[]'::jsonb;
  end if;

  if not exists (
    select 1 from public.matches m
    where m.id = p_match_id and me in (m.user_a, m.user_b)
  ) then
    return '[]'::jsonb;
  end if;

  perform app.seed_match_hey_notes(p_match_id);
  unlocked := app.feedback_unlocked(p_match_id, me);

  return coalesce(
    (
      select jsonb_agg(payload order by created_at)
      from (
        select
          msg.created_at,
          jsonb_build_object(
            'id', msg.id,
            'match_id', msg.match_id,
            'sender_id', msg.sender_id,
            'kind', msg.kind,
            'body', case
              when msg.kind = 'feedback' and msg.sender_id is distinct from me and not unlocked then ''
              else msg.body
            end,
            'media', case
              when msg.kind = 'feedback' and msg.sender_id is distinct from me and not unlocked then '[]'::jsonb
              else msg.media
            end,
            'created_at', msg.created_at,
            'read_at', msg.read_at,
            'reply_to', msg.reply_to,
            'feedback', case
              when msg.kind = 'feedback' and msg.sender_id is distinct from me and not unlocked
                then jsonb_build_object('locked', true)
              else msg.feedback
            end,
            'chat_reactions', coalesce(
              (
                select jsonb_agg(jsonb_build_object('emoji', r.emoji, 'user_id', r.user_id))
                from public.chat_reactions r
                where r.message_id = msg.id
              ),
              '[]'::jsonb
            ),
            'reply', (
              select jsonb_build_object('id', parent.id, 'body', parent.body)
              from public.messages parent
              where parent.id = msg.reply_to
            )
          ) as payload
        from public.messages msg
        where msg.match_id = p_match_id
      ) t
    ),
    '[]'::jsonb
  );
end;
$$;

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
              'body', case
                when msg.kind = 'feedback'
                  and msg.sender_id is distinct from me
                  and not app.feedback_unlocked(m.id, me)
                then ''
                else msg.body
              end,
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
          ),
          'given', (
            select jsonb_build_object(
              'id', f.id,
              'stars', f.stars,
              'summary', f.summary,
              'confusion', f.confusion,
              'keep', f.keep,
              'keep_why', f.keep_why,
              'best_moment', f.best_moment,
              'bug', f.bug,
              'bug_shot', f.bug_shot,
              'bug_shots', f.bug_shots,
              'video_path', f.video_path,
              'price', f.price
            )
            from public.feedback f
            where f.match_id = m.id and f.from_user_id = me
            limit 1
          )
        )
        order by m.last_message_at desc
      )
      from public.matches m
      where me in (m.user_a, m.user_b)
        and not app.paired_block(
          me,
          case when m.user_a = me then m.user_b else m.user_a end
        )
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
                'unlocked', u.unlocked,
                'stars', case when u.unlocked then f.stars else 0 end,
                'summary', case when u.unlocked then f.summary else '' end,
                'confusion', case when u.unlocked then f.confusion else null end,
                'keep', case when u.unlocked then f.keep else null end,
                'opt_in', case when u.unlocked then f.opt_in else false end,
                'helpful', case when u.unlocked then f.helpful else null end,
                'best_moment', case when u.unlocked then f.best_moment else null end,
                'bug', case when u.unlocked then f.bug else null end,
                'bug_shot', case when u.unlocked then f.bug_shot else null end,
                'price', case when u.unlocked then f.price else null end,
                'created_at', f.created_at,
                'from', (select to_jsonb(b) from public.builders b where b.id = f.from_user_id)
              )
              order by f.created_at desc
            )
            from public.feedback f
            cross join lateral (
              select app.feedback_unlocked(f.match_id, me) as unlocked
            ) u
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
    'admin', app.is_admin(),
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
            and app.feedback_unlocked(f.match_id, me)
          order by f.created_at desc
          limit 25
        ) f
      ),
      '[]'::jsonb
    )
  );
end;
$$;

revoke all on function app.first_name(uuid) from public;
revoke all on function app.feedback_unlocked(uuid, uuid) from public;
revoke all on function app.feedback_field_karma(smallint, text, text, text, text, text, text, text[], text, text) from public;

grant execute on function app.feedback_unlocked(uuid, uuid) to authenticated;
