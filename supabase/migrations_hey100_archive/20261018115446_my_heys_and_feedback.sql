-- The Heys queue and the Feedback inbox, each in one call.
--
-- Both screens are a list of rows where every row needs the listing it is
-- about, so they are assembled server-side for the same reason the deck is.

-- Received and sent heys, each with the listing on the other end.
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
    return jsonb_build_object('received', '[]'::jsonb, 'sent', '[]'::jsonb);
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
            -- Their listing, and which of mine it was aimed at.
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
    )
  );
end;
$$;

-- Feedback on my apps, grouped by app, with the numbers the inbox summarises.
--
-- Views and skips belong to listing stats, which is its own piece of work, so
-- they are absent here rather than invented.
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

revoke all on function public.my_heys() from public;
revoke all on function public.my_feedback() from public;
grant execute on function public.my_heys() to authenticated;
grant execute on function public.my_feedback() to authenticated;
