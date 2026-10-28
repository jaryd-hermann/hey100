-- Preview chips show up to 10 member faces next to the group icon.
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
    return jsonb_build_object('groups', '[]'::jsonb, 'memberships', '[]'::jsonb, 'member_stacks', '[]'::jsonb);
  end if;

  perform public.ensure_official_builders_group();

  return jsonb_build_object(
    'groups', coalesce(
      (
        select jsonb_agg(to_jsonb(g) order by g.created_at desc)
        from public.community_groups g
        where g.tool_id is null
          and (
            g.join_mode <> 'match'
            or g.created_by = me
            or exists (
              select 1
              from public.community_group_members m
              where m.group_id = g.id and m.user_id = me
            )
            or public.matched_with_listing(g.listing_id)
          )
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
    ),
    'member_stacks', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'group_id', s.group_id,
            'name', s.name,
            'photo', s.photo
          )
          order by s.group_id, s.rn
        )
        from (
          select
            m.group_id,
            coalesce(p.real_name, p.username, 'A builder') as name,
            p.photo_url as photo,
            row_number() over (
              partition by m.group_id
              order by (p.photo_url is not null) desc, m.joined_at
            ) as rn
          from public.community_group_members m
          join public.profiles p on p.id = m.user_id
          where m.status = 'active'
            and exists (
              select 1
              from public.community_groups g
              where g.id = m.group_id
                and g.tool_id is null
                and (
                  g.join_mode <> 'match'
                  or g.created_by = me
                  or exists (
                    select 1
                    from public.community_group_members mx
                    where mx.group_id = g.id and mx.user_id = me
                  )
                  or public.matched_with_listing(g.listing_id)
                )
            )
        ) s
        where s.rn <= 10
      ),
      '[]'::jsonb
    )
  );
end;
$$;
