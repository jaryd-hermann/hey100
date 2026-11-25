-- Each sponsored tool gets one open discussion room that reuses community
-- threads. Anyone signed in can talk. These rooms stay off the Community tab.

alter table public.community_groups
  add column if not exists tool_id uuid unique references public.sponsored_tools (id) on delete cascade;

create or replace function public.ensure_tool_discussion(p_tool_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := (select auth.uid());
  gid uuid;
  tool public.sponsored_tools;
begin
  if uid is null then
    raise exception 'Sign in to discuss';
  end if;

  select * into tool
  from public.sponsored_tools
  where id = p_tool_id and active;
  if tool.id is null then
    raise exception 'tool not found';
  end if;

  select id into gid
  from public.community_groups
  where tool_id = p_tool_id;

  if gid is null then
    insert into public.community_groups (created_by, name, bio, audience, join_mode, tool_id)
    values (
      uid,
      left(tool.name, 60),
      coalesce(tool.subtitle, ''),
      'Builders using ' || left(tool.name, 40),
      'open',
      p_tool_id
    )
    on conflict (tool_id) do nothing
    returning id into gid;

    if gid is null then
      select id into gid from public.community_groups where tool_id = p_tool_id;
    end if;
  end if;

  insert into public.community_group_members (group_id, user_id, role, status)
  values (gid, uid, 'member', 'active')
  on conflict (group_id, user_id) do update
    set status = 'active';

  return gid;
end;
$$;

revoke all on function public.ensure_tool_discussion(uuid) from public;
grant execute on function public.ensure_tool_discussion(uuid) to authenticated;

create or replace function public.sponsored_tool_discussion_counts()
returns table (
  tool_id uuid,
  thread_count integer,
  talker_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    g.tool_id,
    count(distinct t.id)::int as thread_count,
    (
      select count(distinct author_id)::int
      from (
        select t2.author_id
        from public.community_threads t2
        where t2.group_id = g.id
        union
        select r.author_id
        from public.community_replies r
        join public.community_threads t3 on t3.id = r.thread_id
        where t3.group_id = g.id
      ) people
    ) as talker_count
  from public.community_groups g
  left join public.community_threads t on t.group_id = g.id
  where g.tool_id is not null
  group by g.id, g.tool_id;
$$;

revoke all on function public.sponsored_tool_discussion_counts() from public;
grant execute on function public.sponsored_tool_discussion_counts() to authenticated, anon;
