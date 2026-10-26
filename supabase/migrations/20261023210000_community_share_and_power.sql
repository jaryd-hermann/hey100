-- Criteria is a skip-approval fast pass, not auto-join. A builder who does
-- not match can still request. Group power is the summed verified totals.

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
            or (g.join_mode = 'criteria' and status in ('active', 'pending'))
          )
      )
    )
  );

create or replace function public.community_numeric_snap(p_snap jsonb, p_key text)
returns numeric
language sql
immutable
as $$
  select case
    when coalesce(p_snap ->> p_key, '') ~ '^[0-9]+(\\.[0-9]+)?$'
    then (p_snap ->> p_key)::numeric
    else 0
  end;
$$;

create or replace function public.community_groups_power()
returns table (
  group_id uuid,
  revenue numeric,
  customers numeric,
  commits bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with members as (
    select m.group_id, m.user_id
    from public.community_group_members m
    where m.status = 'active'
  ),
  member_commits as (
    select mem.group_id, coalesce(sum(p.github_commits), 0)::bigint as commits
    from members mem
    left join public.profiles p on p.id = mem.user_id
    group by mem.group_id
  ),
  member_money as (
    select
      per_user.group_id,
      coalesce(sum(per_user.revenue), 0) as revenue,
      coalesce(sum(per_user.customers), 0) as customers
    from (
      select
        mem.group_id,
        mem.user_id,
        max(greatest(
          coalesce(public.community_numeric_snap(c.snapshot, 'mrr'), 0),
          coalesce(public.community_numeric_snap(c.snapshot, 'revenue'), 0),
          coalesce(public.community_numeric_snap(c.snapshot, 'revenue_30d'), 0)
        )) as revenue,
        max(greatest(
          coalesce(public.community_numeric_snap(c.snapshot, 'customers'), 0),
          coalesce(public.community_numeric_snap(c.snapshot, 'subscriptions'), 0)
        )) as customers
      from members mem
      join public.apps a on a.owner_id = mem.user_id
      join public.app_connections c
        on c.app_id = a.id
        and c.provider in ('stripe', 'revenuecat')
      group by mem.group_id, mem.user_id
    ) per_user
    group by per_user.group_id
  )
  select
    g.id,
    coalesce(mm.revenue, 0),
    coalesce(mm.customers, 0),
    coalesce(mc.commits, 0)
  from public.community_groups g
  left join member_commits mc on mc.group_id = g.id
  left join member_money mm on mm.group_id = g.id;
$$;

revoke all on function public.community_numeric_snap(jsonb, text) from public;
revoke all on function public.community_groups_power() from public;
grant execute on function public.community_groups_power() to authenticated;
