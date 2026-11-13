-- Stop members from granting themselves owner (or approving their own request).
-- Seed Revenue Pods: Jaryd-owned rooms gated on verified Stripe or RevenueCat MRR.

create or replace function public.snap_number(p_snap jsonb, p_key text)
returns numeric
language sql
immutable
set search_path = public
as $$
  select case
    when p_snap is null then null
    when jsonb_typeof(p_snap -> p_key) = 'number' then (p_snap ->> p_key)::numeric
    when coalesce(p_snap ->> p_key, '') ~ '^[0-9]+(\.[0-9]+)?$' then (p_snap ->> p_key)::numeric
    else null
  end;
$$;

-- Highest verified MRR on the caller's own listings. Stripe uses mrr.
-- RevenueCat uses mrr, then revenue when mrr was not reported.
-- Returns null when this user has no finished Stripe or RevenueCat connection,
-- and when asked about anyone else.
create or replace function public.user_verified_mrr(p_user_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select max(val)
  from (
    select coalesce(
      public.snap_number(c.snapshot, 'mrr'),
      case
        when c.provider = 'revenuecat' then public.snap_number(c.snapshot, 'revenue')
      end
    ) as val
    from public.apps a
    join public.app_connections c on c.app_id = a.id
    where a.owner_id = p_user_id
      and p_user_id = (select auth.uid())
      and c.provider in ('stripe', 'revenuecat')
      and coalesce(c.snapshot ->> 'pending', '') is distinct from 'true'
  ) s
  where val is not null;
$$;

-- Lower bound inclusive, upper bound exclusive. A null cap is the open top band.
create or replace function public.mrr_in_band(p_mrr numeric, p_min numeric, p_max numeric)
returns boolean
language sql
immutable
set search_path = public
as $$
  select p_mrr is not null
    and p_min is not null
    and p_mrr >= p_min
    and (p_max is null or p_mrr < p_max);
$$;

revoke all on function public.snap_number(jsonb, text) from public, anon, authenticated;
revoke all on function public.user_verified_mrr(uuid) from public, anon, authenticated;
revoke all on function public.mrr_in_band(numeric, numeric, numeric) from public, anon, authenticated;
grant execute on function public.user_verified_mrr(uuid) to authenticated;
grant execute on function public.mrr_in_band(numeric, numeric, numeric) to authenticated;

alter table public.community_groups
  drop constraint if exists community_groups_kind_check;

alter table public.community_groups
  add constraint community_groups_kind_check
  check (kind in ('community', 'official', 'revenue_pod'));

alter table public.community_groups
  add column if not exists revenue_min numeric,
  add column if not exists revenue_max numeric;

alter table public.community_groups
  drop constraint if exists community_groups_revenue_pod_band;

alter table public.community_groups
  add constraint community_groups_revenue_pod_band
  check (
    kind is distinct from 'revenue_pod'
    or (
      revenue_min is not null
      and revenue_min >= 0
      and (revenue_max is null or revenue_max > revenue_min)
    )
  );

-- Clients cannot mint an official group or a revenue pod, or retune a band.
-- Invoker, not definer: inside ensure_revenue_pods the session user is the
-- function owner, so maintenance writes are allowed. A direct API write runs
-- as `authenticated` and is held to the rule below.
create or replace function public.guard_reserved_groups()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_setting('hey100.seed_groups', true) = '1' then
    return new;
  end if;
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' and new.kind in ('official', 'revenue_pod') then
      raise exception 'reserved group';
    end if;
    if tg_op = 'UPDATE' then
      new.kind := old.kind;
      new.revenue_min := old.revenue_min;
      new.revenue_max := old.revenue_max;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists community_groups_guard_reserved on public.community_groups;
create trigger community_groups_guard_reserved
  before insert or update on public.community_groups
  for each row execute function public.guard_reserved_groups();

-- A member can mute and mark read. They cannot rewrite their own role or status.
create or replace function public.guard_community_member_self()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and old.user_id = auth.uid() then
    if new.role is distinct from old.role then
      raise exception 'cannot change your own role';
    end if;
    if new.status is distinct from old.status then
      raise exception 'cannot change your own membership';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists community_members_guard_self on public.community_group_members;
create trigger community_members_guard_self
  before update on public.community_group_members
  for each row execute function public.guard_community_member_self();

create or replace function public.enforce_revenue_pod_join()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.community_groups;
begin
  select * into g from public.community_groups where id = new.group_id;
  if g.id is null or g.kind is distinct from 'revenue_pod' then
    return new;
  end if;

  if new.role = 'owner' then
    if new.user_id is distinct from g.created_by then
      raise exception 'cannot take this pod';
    end if;
    return new;
  end if;

  if new.role is distinct from 'member' or new.status is distinct from 'active' then
    raise exception 'this pod does not take requests';
  end if;

  if not public.mrr_in_band(
    public.user_verified_mrr(new.user_id),
    g.revenue_min,
    g.revenue_max
  ) then
    raise exception 'verified revenue is outside this band';
  end if;

  return new;
end;
$$;

drop trigger if exists community_members_revenue_pod on public.community_group_members;
create trigger community_members_revenue_pod
  before insert on public.community_group_members
  for each row execute function public.enforce_revenue_pod_join();

-- Owner is only for the person who created that group. The old `role = 'owner'`
-- branch let any signed-in user insert themselves as owner of any group.
drop policy if exists community_members_insert on public.community_group_members;
create policy community_members_insert
  on public.community_group_members for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and role in ('member', 'owner')
    and (
      (
        role = 'owner'
        and status = 'active'
        and exists (
          select 1
          from public.community_groups g
          where g.id = group_id
            and g.created_by = (select auth.uid())
        )
      )
      or (
        role = 'member'
        and exists (
          select 1
          from public.community_groups g
          where g.id = group_id
            and (
              (
                g.kind = 'revenue_pod'
                and status = 'active'
                and public.mrr_in_band(
                  public.user_verified_mrr((select auth.uid())),
                  g.revenue_min,
                  g.revenue_max
                )
              )
              or (
                g.kind is distinct from 'revenue_pod'
                and (
                  g.join_mode = 'open'
                  or g.created_by = (select auth.uid())
                  or (g.join_mode = 'request' and status = 'pending')
                  or (g.join_mode = 'criteria' and status = 'active')
                  or (
                    g.join_mode = 'match'
                    and status = 'active'
                    and public.matched_with_listing(g.listing_id)
                  )
                )
              )
            )
        )
      )
    )
  );

drop policy if exists community_groups_delete on public.community_groups;
create policy community_groups_delete
  on public.community_groups for delete
  to authenticated
  using (
    (select auth.uid()) = created_by
    and coalesce(kind, 'community') not in ('official', 'revenue_pod')
  );

create or replace function public.ensure_revenue_pods()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_id uuid;
  pod record;
begin
  perform set_config('hey100.seed_groups', '1', true);

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
    return;
  end if;

  for pod in
    select *
    from (
      values
        (
          'a1000000-1000-4000-8000-000000000011'::uuid,
          '$0-$1k MRR',
          'Founders with verified Stripe or RevenueCat MRR under $1k.',
          0::numeric,
          1000::numeric
        ),
        (
          'a1000000-1000-4000-8000-000000000012'::uuid,
          '$1k-$5k MRR',
          'Founders with verified Stripe or RevenueCat MRR from $1k up to $5k.',
          1000::numeric,
          5000::numeric
        ),
        (
          'a1000000-1000-4000-8000-000000000013'::uuid,
          '$5k-$10k MRR',
          'Founders with verified Stripe or RevenueCat MRR from $5k up to $10k.',
          5000::numeric,
          10000::numeric
        ),
        (
          'a1000000-1000-4000-8000-000000000014'::uuid,
          '$10k-$30k MRR',
          'Founders with verified Stripe or RevenueCat MRR from $10k up to $30k.',
          10000::numeric,
          30000::numeric
        ),
        (
          'a1000000-1000-4000-8000-000000000015'::uuid,
          '$30k+ MRR',
          'Founders with verified Stripe or RevenueCat MRR of $30k or more.',
          30000::numeric,
          null::numeric
        )
    ) as t(id, name, bio, revenue_min, revenue_max)
  loop
    insert into public.community_groups (
      id, created_by, name, bio, audience, join_mode, kind, revenue_min, revenue_max
    )
    values (
      pod.id,
      admin_id,
      pod.name,
      pod.bio,
      'Founders at the same revenue stage',
      'criteria',
      'revenue_pod',
      pod.revenue_min,
      pod.revenue_max
    )
    on conflict (id) do update
      set created_by = excluded.created_by,
          name = excluded.name,
          bio = excluded.bio,
          audience = excluded.audience,
          join_mode = 'criteria',
          kind = 'revenue_pod',
          revenue_min = excluded.revenue_min,
          revenue_max = excluded.revenue_max;

    insert into public.community_group_members (group_id, user_id, role, status)
    values (pod.id, admin_id, 'owner', 'active')
    on conflict (group_id, user_id) do update
      set role = 'owner', status = 'active';
  end loop;
end;
$$;

revoke all on function public.ensure_revenue_pods() from public, anon, authenticated;
grant execute on function public.ensure_revenue_pods() to authenticated;

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
  mrr numeric;
begin
  select * into g from public.community_groups where id = p_group_id;
  if g.id is null then
    raise exception 'group not found';
  end if;

  if g.kind = 'revenue_pod' then
    mrr := public.user_verified_mrr((select auth.uid()));
    met := public.mrr_in_band(mrr, g.revenue_min, g.revenue_max);
    return jsonb_build_object(
      'ok', met,
      'items', jsonb_build_array(jsonb_build_object(
        'id', 'revenue',
        'label', 'Verified MRR in ' || g.name,
        'met', met,
        'how', case
          when mrr is null then 'Connect Stripe or RevenueCat on a listing. Joining stays locked until that MRR is in this band.'
          else 'Your verified MRR is $' || trim(to_char(mrr, 'FM999,999,990')) || '. This pod is ' || g.name || '.'
        end
      ))
    );
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
    return jsonb_build_object(
      'groups', '[]'::jsonb,
      'memberships', '[]'::jsonb,
      'member_stacks', '[]'::jsonb,
      'verified_mrr', null
    );
  end if;

  perform public.ensure_official_builders_group();
  perform public.ensure_revenue_pods();

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
        where s.rn <= 3
      ),
      '[]'::jsonb
    ),
    'verified_mrr', to_jsonb(public.user_verified_mrr(me))
  );
end;
$$;
