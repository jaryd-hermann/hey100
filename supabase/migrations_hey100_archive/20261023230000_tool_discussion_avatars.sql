-- Tool cards show who is in the discussion, not just a count.

drop function if exists public.sponsored_tool_discussion_counts();

create or replace function public.sponsored_tool_discussion_counts()
returns table (
  tool_id uuid,
  thread_count integer,
  talker_count integer,
  talkers jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  with posters as (
    select
      g.tool_id,
      u.author_id,
      max(u.at) as last_at
    from public.community_groups g
    join (
      select t.group_id, t.author_id, t.created_at as at
      from public.community_threads t
      union all
      select t.group_id, r.author_id, r.created_at
      from public.community_replies r
      join public.community_threads t on t.id = r.thread_id
    ) u on u.group_id = g.id
    where g.tool_id is not null
    group by g.tool_id, u.author_id
  ),
  ranked as (
    select
      tool_id,
      author_id,
      last_at,
      row_number() over (partition by tool_id order by last_at desc) as n
    from posters
  )
  select
    g.tool_id,
    (
      select count(*)::int
      from public.community_threads t
      where t.group_id = g.id
    ) as thread_count,
    (
      select count(*)::int
      from posters p
      where p.tool_id = g.tool_id
    ) as talker_count,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'name', coalesce(nullif(b.real_name, ''), nullif(b.username, ''), 'A builder'),
          'photo', b.photo_url
        )
        order by r.last_at desc
      )
      from ranked r
      left join public.builders b on b.id = r.author_id
      where r.tool_id = g.tool_id
        and r.n <= 4
    ), '[]'::jsonb) as talkers
  from public.community_groups g
  where g.tool_id is not null;
$$;

revoke all on function public.sponsored_tool_discussion_counts() from public;
grant execute on function public.sponsored_tool_discussion_counts() to authenticated, anon;
