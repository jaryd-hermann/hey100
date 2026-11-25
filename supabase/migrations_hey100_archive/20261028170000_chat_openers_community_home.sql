-- Load match messages and community groups through definer RPCs (the Data API
-- does not expose community_* tables). Reset Using that was auto-set by opening
-- a link. Surface matched heys in the received feed.

-- Auto-"Trying it" from Open TestFlight was never an explicit mark.
update public.matches m
set trade_a = 'Not started'
where m.trade_a = 'Using'
  and not exists (
    select 1
    from public.messages msg
    where msg.match_id = m.id
      and msg.kind = 'system'
      and msg.sender_id = m.user_a
      and msg.body ilike '%started testing%'
  );

update public.matches m
set trade_b = 'Not started'
where m.trade_b = 'Using'
  and not exists (
    select 1
    from public.messages msg
    where msg.match_id = m.id
      and msg.kind = 'system'
      and msg.sender_id = m.user_b
      and msg.body ilike '%started testing%'
  );

delete from public.messages
where kind = 'system'
  and sender_id is null
  and lower(body) = 'they started testing';

create or replace function public.match_messages(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
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
            'body', msg.body,
            'media', msg.media,
            'created_at', msg.created_at,
            'read_at', msg.read_at,
            'reply_to', msg.reply_to,
            'feedback', msg.feedback,
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

revoke all on function public.match_messages(uuid) from public;
grant execute on function public.match_messages(uuid) to authenticated;

create or replace function public.community_home_payload()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    return jsonb_build_object('groups', '[]'::jsonb, 'memberships', '[]'::jsonb);
  end if;

  perform public.ensure_official_builders_group();

  return jsonb_build_object(
    'groups', coalesce(
      (
        select jsonb_agg(to_jsonb(g) order by g.created_at desc)
        from public.community_groups g
        where g.tool_id is null
      ),
      '[]'::jsonb
    ),
    'memberships', coalesce(
      (
        select jsonb_agg(to_jsonb(m))
        from public.community_group_members m
        where m.user_id = me
           or m.group_id in (
             select mx.group_id
             from public.community_group_members mx
             where mx.user_id = me and mx.status = 'active'
           )
      ),
      '[]'::jsonb
    )
  );
end;
$$;

revoke all on function public.community_home_payload() from public;
grant execute on function public.community_home_payload() to authenticated;

create or replace function public.my_heys()
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
    return jsonb_build_object('received', '[]'::jsonb, 'sent', '[]'::jsonb, 'matched', '[]'::jsonb);
  end if;

  return jsonb_build_object(
    'received', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', h.id,
            'target', h.target_label,
            'target_type', h.target_type,
            'note', h.note,
            'created_at', h.created_at,
            'follow_up', case
              when h.follow_up_at is null then null
              else jsonb_build_object('note', h.follow_up_note, 'at', h.follow_up_at)
            end,
            'app_id', h.from_app_id,
            'via_app_id', h.to_app_id,
            'card', app.listing_card(h.from_app_id)
          )
          order by h.created_at desc
        )
        from public.heys h
        where h.to_user_id = me and h.status = 'pending'
      ),
      '[]'::jsonb
    ),
    'sent', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', h.id,
            'target', h.target_label,
            'target_type', h.target_type,
            'note', h.note,
            'created_at', h.created_at,
            'status', h.status,
            'pass_reason', h.pass_reason,
            'follow_up', case
              when h.follow_up_at is null then null
              else jsonb_build_object('note', h.follow_up_note, 'at', h.follow_up_at)
            end,
            'app_id', h.to_app_id,
            'via_app_id', h.from_app_id,
            'card', app.listing_card(h.to_app_id)
          )
          order by h.created_at desc
        )
        from public.heys h
        where h.from_user_id = me
      ),
      '[]'::jsonb
    ),
    'matched', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', h.id,
            'target', h.target_label,
            'target_type', h.target_type,
            'note', h.note,
            'created_at', h.created_at,
            'match_id', (
              select m.id
              from public.matches m
              where (m.user_a = h.from_user_id and m.user_b = h.to_user_id)
                 or (m.user_b = h.from_user_id and m.user_a = h.to_user_id)
              limit 1
            ),
            'app_id', h.from_app_id,
            'via_app_id', h.to_app_id,
            'card', app.listing_card(h.from_app_id)
          )
          order by h.created_at desc
        )
        from public.heys h
        where h.to_user_id = me and h.status = 'matched'
      ),
      '[]'::jsonb
    )
  );
end;
$$;
