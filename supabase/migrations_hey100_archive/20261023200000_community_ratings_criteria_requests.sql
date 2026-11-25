-- Ratings, join criteria, request notes, and member-reviewable join queue.

alter table public.community_groups
  drop constraint if exists community_groups_join_mode_check;

alter table public.community_groups
  add constraint community_groups_join_mode_check
  check (join_mode in ('open', 'request', 'criteria'));

alter table public.community_groups
  add column if not exists join_criteria text[] not null default '{}';

alter table public.community_group_members
  add column if not exists request_note text;

create table if not exists public.community_group_ratings (
  group_id uuid not null references public.community_groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  stars integer not null check (stars between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table public.community_group_ratings enable row level security;

create policy community_ratings_select
  on public.community_group_ratings for select
  to authenticated
  using (true);

create policy community_ratings_write
  on public.community_group_ratings for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_community_member(group_id)
  );

create policy community_ratings_update
  on public.community_group_ratings for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update on public.community_group_ratings to authenticated;

create or replace function public.community_user_meets(
  p_user_id uuid,
  p_need text
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case p_need
    when 'revenue' then exists (
      select 1
      from public.apps a
      join public.app_connections c on c.app_id = a.id
      where a.owner_id = p_user_id
        and c.provider in ('stripe', 'revenuecat')
    )
    when 'customers' then exists (
      select 1
      from public.apps a
      join public.app_connections c on c.app_id = a.id
      where a.owner_id = p_user_id
        and c.provider in ('stripe', 'revenuecat')
    )
    when 'shipping' then exists (
      select 1 from public.profiles p
      where p.id = p_user_id and coalesce(p.github_commits, 0) > 0
    ) or exists (
      select 1
      from public.apps a
      join public.app_connections c on c.app_id = a.id
      where a.owner_id = p_user_id and c.provider = 'github'
    )
    when 'launched' then exists (
      select 1 from public.apps a
      where a.owner_id = p_user_id
        and a.published_at is not null
        and (
          coalesce(a.store_url, '') <> ''
          or coalesce(a.links::text, '') ~* '(web|app store|testflight)'
        )
    )
    else true
  end;
$$;

create or replace function public.community_join_check(p_group_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  g public.community_groups;
  need text;
  items jsonb := '[]'::jsonb;
  labels jsonb := '{
    "revenue":"Verified revenue",
    "customers":"Verified customers",
    "shipping":"Actively shipping",
    "launched":"Verified product launched"
  }'::jsonb;
  hows jsonb := '{
    "revenue":"Connect Stripe or RevenueCat on a listing.",
    "customers":"Connect RevenueCat or Stripe so we can see customers or $1+ in charges.",
    "shipping":"Connect GitHub so we can see recent commits.",
    "launched":"Publish a listing with an App Store or website link."
  }'::jsonb;
  met boolean;
  all_ok boolean := true;
begin
  select * into g from public.community_groups where id = p_group_id;
  if g.id is null then
    raise exception 'group not found';
  end if;

  if g.join_mode <> 'criteria' or coalesce(array_length(g.join_criteria, 1), 0) = 0 then
    return jsonb_build_object('ok', true, 'items', '[]'::jsonb);
  end if;

  foreach need in array g.join_criteria loop
    met := public.community_user_meets((select auth.uid()), need);
    if not met then all_ok := false; end if;
    items := items || jsonb_build_array(jsonb_build_object(
      'id', need,
      'label', coalesce(labels ->> need, need),
      'met', met,
      'how', coalesce(hows ->> need, '')
    ));
  end loop;

  return jsonb_build_object('ok', all_ok, 'items', items);
end;
$$;

grant execute on function public.community_join_check(uuid) to authenticated;

create or replace function public.review_community_request(
  p_group_id uuid,
  p_user_id uuid,
  p_accept boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_community_member(p_group_id) then
    raise exception 'not a member';
  end if;

  if p_accept then
    update public.community_group_members
    set status = 'active'
    where group_id = p_group_id
      and user_id = p_user_id
      and status = 'pending';
  else
    delete from public.community_group_members
    where group_id = p_group_id
      and user_id = p_user_id
      and status = 'pending';
  end if;
end;
$$;

grant execute on function public.review_community_request(uuid, uuid, boolean) to authenticated;

create or replace function public.community_join_requests(p_group_id uuid)
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
          'bio', nullif(b.job, ''),
          'note', m.request_note,
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
        and m.status = 'pending'
    ),
    '[]'::jsonb
  );
end;
$$;

grant execute on function public.community_join_requests(uuid) to authenticated;

drop function if exists public.create_community_group(text, text, text, text, text);

create or replace function public.create_community_group(
  p_name text,
  p_bio text default '',
  p_audience text default '',
  p_cover_path text default null,
  p_join_mode text default 'open',
  p_join_criteria text[] default '{}'
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

  insert into public.community_groups (created_by, name, bio, audience, cover_path, join_mode, join_criteria)
  values (
    me,
    trim(p_name),
    coalesce(p_bio, ''),
    coalesce(p_audience, ''),
    p_cover_path,
    coalesce(p_join_mode, 'open'),
    coalesce(p_join_criteria, '{}')
  )
  returning id into new_id;

  insert into public.community_group_members (group_id, user_id, role, status)
  values (new_id, me, 'owner', 'active');

  return new_id;
end;
$$;

grant execute on function public.create_community_group(text, text, text, text, text, text[]) to authenticated;

drop policy if exists community_members_insert on public.community_group_members;
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
            or (g.join_mode = 'criteria' and status = 'active')
          )
      )
    )
  );

create or replace function public.enforce_community_join_criteria()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.community_groups;
  need text;
begin
  select * into g from public.community_groups where id = new.group_id;
  if g.join_mode = 'criteria' and new.status = 'active' and new.role <> 'owner' then
    foreach need in array coalesce(g.join_criteria, '{}') loop
      if not public.community_user_meets(new.user_id, need) then
        raise exception 'does not meet join criteria';
      end if;
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists community_join_criteria on public.community_group_members;
create trigger community_join_criteria
  before insert on public.community_group_members
  for each row execute function public.enforce_community_join_criteria();

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
          'bio', nullif(b.job, ''),
          'apps', coalesce(a.apps, 0),
          'commits', b.github_commits,
          'revenue', coalesce(a.revenue, '—'),
          'app_ids', coalesce(a.app_ids, '[]'::jsonb),
          'listings', coalesce(a.listings, '[]'::jsonb)
        )
        order by m.joined_at
      )
      from public.community_group_members m
      left join public.builders b on b.id = m.user_id
      left join lateral (
        select
          count(*)::int as apps,
          case when bool_or(apps.stage = 'Revenue') then 'Revenue' else '—' end as revenue,
          coalesce(jsonb_agg(apps.id), '[]'::jsonb) as app_ids,
          coalesce(jsonb_agg(jsonb_build_object(
            'id', apps.id,
            'name', apps.name,
            'hue', apps.hue,
            'icon', apps.icon_path
          )), '[]'::jsonb) as listings
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
