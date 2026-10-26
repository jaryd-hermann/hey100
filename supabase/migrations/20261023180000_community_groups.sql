-- Community groups: builders talking outside a hey, in named rooms with threads.

create table public.community_groups (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  bio text not null default '',
  audience text not null default '',
  cover_path text,
  join_mode text not null default 'open' check (join_mode in ('open', 'request')),
  created_at timestamptz not null default now()
);

create table public.community_group_members (
  group_id uuid not null references public.community_groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  status text not null default 'active' check (status in ('active', 'pending')),
  muted boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.community_threads (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.community_groups (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

create table public.community_replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.community_threads (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create table public.community_reports (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.community_groups (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reason text,
  created_at timestamptz not null default now()
);

create index community_group_members_user_idx on public.community_group_members (user_id);
create index community_threads_group_idx on public.community_threads (group_id, created_at desc);
create index community_replies_thread_idx on public.community_replies (thread_id, created_at);

create or replace function public.is_community_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.community_group_members
    where group_id = p_group_id
      and user_id = (select auth.uid())
      and status = 'active'
  );
$$;

create or replace function public.is_community_owner(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.community_group_members
    where group_id = p_group_id
      and user_id = (select auth.uid())
      and role = 'owner'
      and status = 'active'
  );
$$;

alter table public.community_groups enable row level security;
alter table public.community_group_members enable row level security;
alter table public.community_threads enable row level security;
alter table public.community_replies enable row level security;
alter table public.community_reports enable row level security;

create policy community_groups_select
  on public.community_groups for select
  to authenticated
  using (true);

create policy community_groups_insert
  on public.community_groups for insert
  to authenticated
  with check ((select auth.uid()) = created_by);

create policy community_groups_update
  on public.community_groups for update
  to authenticated
  using ((select auth.uid()) = created_by)
  with check ((select auth.uid()) = created_by);

create policy community_members_select
  on public.community_group_members for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_community_member(group_id)
  );

create policy community_members_insert
  on public.community_group_members for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      role = 'owner'
      or exists (
        select 1
        from public.community_groups g
        where g.id = group_id
          and (
            g.join_mode = 'open'
            or g.created_by = (select auth.uid())
            or (g.join_mode = 'request' and status = 'pending')
          )
      )
    )
  );

create policy community_members_update
  on public.community_group_members for update
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_community_owner(group_id)
  )
  with check (
    user_id = (select auth.uid())
    or public.is_community_owner(group_id)
  );

create policy community_members_delete
  on public.community_group_members for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_community_owner(group_id)
  );

create policy community_threads_select
  on public.community_threads for select
  to authenticated
  using (public.is_community_member(group_id));

create policy community_threads_insert
  on public.community_threads for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and public.is_community_member(group_id)
  );

create policy community_replies_select
  on public.community_replies for select
  to authenticated
  using (
    exists (
      select 1
      from public.community_threads t
      where t.id = thread_id
        and public.is_community_member(t.group_id)
    )
  );

create policy community_replies_insert
  on public.community_replies for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1
      from public.community_threads t
      where t.id = thread_id
        and public.is_community_member(t.group_id)
    )
  );

create policy community_reports_insert
  on public.community_reports for insert
  to authenticated
  with check (reporter_id = (select auth.uid()));

grant select, insert, update on public.community_groups to authenticated;
grant select, insert, update, delete on public.community_group_members to authenticated;
grant select, insert on public.community_threads to authenticated;
grant select, insert on public.community_replies to authenticated;
grant insert on public.community_reports to authenticated;

create or replace function public.create_community_group(
  p_name text,
  p_bio text default '',
  p_audience text default '',
  p_cover_path text default null,
  p_join_mode text default 'open'
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  me uuid := auth.uid();
  new_id uuid;
begin
  if me is null then
    raise exception 'not signed in';
  end if;

  insert into public.community_groups (created_by, name, bio, audience, cover_path, join_mode)
  values (me, trim(p_name), coalesce(p_bio, ''), coalesce(p_audience, ''), p_cover_path, coalesce(p_join_mode, 'open'))
  returning id into new_id;

  insert into public.community_group_members (group_id, user_id, role, status)
  values (new_id, me, 'owner', 'active');

  return new_id;
end;
$$;

grant execute on function public.create_community_group(text, text, text, text, text) to authenticated;
grant execute on function public.is_community_member(uuid) to authenticated;
grant execute on function public.is_community_owner(uuid) to authenticated;

create or replace function public.community_group_counts()
returns table (group_id uuid, member_count integer)
language sql
stable
security definer
set search_path = public
as $$
  select m.group_id, count(*)::integer
  from public.community_group_members m
  where m.status = 'active'
  group by m.group_id;
$$;

grant execute on function public.community_group_counts() to authenticated;

create or replace function public.community_member_directory(p_group_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_community_member(p_group_id) then
    raise exception 'not a member';
  end if;

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'user_id', m.user_id,
          'role', m.role,
          'status', m.status,
          'name', coalesce(nullif(b.real_name, ''), nullif(b.username, ''), 'A builder'),
          'photo', b.photo_url,
          'apps', coalesce(a.apps, 0),
          'commits', b.github_commits,
          'revenue', coalesce(a.revenue, '—'),
          'app_ids', coalesce(a.app_ids, '[]'::jsonb)
        )
        order by m.joined_at
      )
      from public.community_group_members m
      left join public.builders b on b.id = m.user_id
      left join lateral (
        select
          count(*)::int as apps,
          case when bool_or(apps.stage = 'Revenue') then 'Revenue' else '—' end as revenue,
          coalesce(jsonb_agg(apps.id), '[]'::jsonb) as app_ids
        from public.apps
        where apps.owner_id = m.user_id
          and apps.published_at is not null
      ) a on true
      where m.group_id = p_group_id
        and m.status = 'active'
    ),
    '[]'::jsonb
  );
end;
$$;

grant execute on function public.community_member_directory(uuid) to authenticated;

do $$
begin
  begin
    alter publication supabase_realtime add table public.community_threads;
  exception
    when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.community_replies;
  exception
    when duplicate_object then null;
  end;
end
$$;
