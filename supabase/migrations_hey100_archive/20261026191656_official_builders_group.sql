-- Official Hey100 builders group: every account is a member. Only admins
-- start threads. Members reply and react. The group cannot be rated or left.

alter table public.community_groups
  add column if not exists kind text not null default 'community';

alter table public.community_groups
  drop constraint if exists community_groups_kind_check;

alter table public.community_groups
  add constraint community_groups_kind_check
  check (kind in ('community', 'official'));

create unique index if not exists community_groups_one_official
  on public.community_groups (kind)
  where kind = 'official';

create or replace function public.ensure_official_builders_group()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_id uuid;
  gid uuid := 'a1000000-1000-4000-8000-000000000001';
begin
  select p.id into admin_id
  from public.profiles p
  where p.is_admin
  order by p.created_at
  limit 1;

  if admin_id is null then
    select u.id into admin_id
    from auth.users u
    where lower(u.email) = 'hermannjaryd@gmail.com'
    limit 1;
  end if;

  if admin_id is null then
    return null;
  end if;

  insert into public.community_groups (
    id, created_by, name, bio, audience, join_mode, kind
  )
  values (
    gid,
    admin_id,
    'Hey100 builders',
    'Updates from Jaryd. Reply on a post — only the team starts threads here.',
    'Every builder on hey100',
    'open',
    'official'
  )
  on conflict (id) do update
    set name = excluded.name,
        bio = excluded.bio,
        kind = 'official',
        created_by = excluded.created_by;

  insert into public.community_group_members (group_id, user_id, role, status)
  values (gid, admin_id, 'owner', 'active')
  on conflict (group_id, user_id) do update
    set role = 'owner', status = 'active';

  insert into public.community_group_members (group_id, user_id, role, status)
  select gid, p.id, 'member', 'active'
  from public.profiles p
  where p.id is distinct from admin_id
  on conflict (group_id, user_id) do nothing;

  return gid;
end;
$$;

revoke all on function public.ensure_official_builders_group() from public;
grant execute on function public.ensure_official_builders_group() to authenticated;

create or replace function public.join_official_builders_group()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.ensure_official_builders_group();
  return new;
end;
$$;

drop trigger if exists profiles_join_official_builders on public.profiles;
create trigger profiles_join_official_builders
  after insert on public.profiles
  for each row execute function public.join_official_builders_group();

drop policy if exists community_threads_insert on public.community_threads;
create policy community_threads_insert
  on public.community_threads for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and public.is_community_member(group_id)
    and (
      app.is_admin()
      or not exists (
        select 1
        from public.community_groups g
        where g.id = group_id
          and g.kind = 'official'
      )
    )
  );

drop policy if exists community_members_delete on public.community_group_members;
create policy community_members_delete
  on public.community_group_members for delete
  to authenticated
  using (
    (
      user_id = (select auth.uid())
      or public.is_community_owner(group_id)
    )
    and not exists (
      select 1
      from public.community_groups g
      where g.id = group_id
        and g.kind = 'official'
    )
  );

drop policy if exists community_ratings_write on public.community_group_ratings;
create policy community_ratings_write
  on public.community_group_ratings for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_community_member(group_id)
    and not exists (
      select 1
      from public.community_groups g
      where g.id = group_id
        and g.kind = 'official'
    )
  );

select public.ensure_official_builders_group();
