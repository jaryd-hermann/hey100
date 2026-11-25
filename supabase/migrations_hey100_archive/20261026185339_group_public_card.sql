-- Public group card for hey100.com/g/{id}. Anyone with the share link can
-- see the name, cover and join mode. Threads stay in the app.

create or replace function public.group_by_id(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  g public.community_groups;
  members integer;
begin
  select * into g
  from public.community_groups
  where id = p_id
    and tool_id is null;

  if not found then
    return null;
  end if;

  select count(*)::integer into members
  from public.community_group_members m
  where m.group_id = g.id
    and m.status = 'active';

  return jsonb_build_object(
    'id', g.id,
    'name', g.name,
    'bio', g.bio,
    'audience', g.audience,
    'cover_path', g.cover_path,
    'join_mode', g.join_mode,
    'member_count', members
  );
end;
$$;

revoke all on function public.group_by_id(uuid) from public;
grant execute on function public.group_by_id(uuid) to anon, authenticated;
