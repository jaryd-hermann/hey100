-- Two reads that each assemble a whole screen.
--
-- A listing card is an app, its media, its prompt answers and its builder, and
-- a thread row is a match, both listings, the other builder, the last message
-- and an unread count. Fetching those as separate queries would mean the
-- screens were built from four or five round trips that can disagree with each
-- other, so each is one function returning the shape the screen renders.

-- A listing with everything a card shows.
create or replace function app.listing_card(p_app_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'app', to_jsonb(a),
    'media', coalesce(
      (
        select jsonb_agg(to_jsonb(m) order by m.position)
        from public.app_media m
        where m.app_id = a.id
      ),
      '[]'::jsonb
    ),
    'prompts', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'slot', ap.slot,
            'prompt_id', ap.prompt_id,
            'label', pr.label,
            'tag', pr.tag,
            'answer', ap.answer
          )
          order by ap.slot
        )
        from public.app_prompts ap
        join public.prompts pr on pr.id = ap.prompt_id
        where ap.app_id = a.id
      ),
      '[]'::jsonb
    ),
    'builder', (select to_jsonb(b) from public.builders b where b.id = a.owner_id)
  )
  from public.apps a
  where a.id = p_app_id;
$$;

-- The Discover deck: published listings that are not mine, not passed, not
-- already heyed and not already matched.
--
-- Order is newest first. Ranking by fit is its own piece of work; this is the
-- one place it will go when it arrives.
create or replace function public.discover_deck(p_limit integer default 30)
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
      select jsonb_agg(app.listing_card(d.id) order by d.published_at desc)
      from (
        select a.id, a.published_at
        from public.apps a
        where a.published_at is not null
          and a.owner_id <> me
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
        order by a.published_at desc
        limit greatest(1, least(coalesce(p_limit, 30), 100))
      ) d
    ),
    '[]'::jsonb
  );
end;
$$;

-- One listing by slug, for the share link and the web page. Published only,
-- and callable by anyone, because that is the point of a share link.
create or replace function public.listing_by_slug(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  found_id uuid;
begin
  select id into found_id
  from public.apps
  where slug = p_slug and published_at is not null;

  if found_id is null then
    return null;
  end if;

  return app.listing_card(found_id);
end;
$$;

-- The Chat tab: every thread with the other side resolved against the viewer,
-- so nothing downstream has to know about the a/b ordering.
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
          'unread', (
            select count(*)
            from public.messages msg
            where msg.match_id = m.id
              and msg.read_at is null
              and msg.sender_id is distinct from me
          ),
          -- Whether I have already reviewed their app, which is what decides
          -- between "Leave feedback" and "Feedback sent".
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

revoke all on function public.discover_deck(integer) from public;
revoke all on function public.my_threads() from public;
revoke all on function public.listing_by_slug(text) from public;

grant execute on function public.discover_deck(integer) to authenticated;
grant execute on function public.my_threads() to authenticated;
grant execute on function public.listing_by_slug(text) to anon, authenticated;
