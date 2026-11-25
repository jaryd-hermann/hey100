-- htg.chat baseline, part 5: access rules (plan §5) and the RLS that uses them.
--
-- Every gate lives here. RPCs and RLS call these; the app only renders what
-- they allow. Helpers are security definer so policies can call them without
-- recursing through other tables' policies.

/* ---------------------------------------------------------------- */
/* Account + plan                                                   */
/* ---------------------------------------------------------------- */

-- Effective plan: 'none' when banned or expired, whatever the column says.
create or replace function app.user_plan(p_user uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select case
      when p.banned_at is not null then 'none'
      when p.plan <> 'none' and (p.plan_expires_at is null or p.plan_expires_at > now()) then p.plan
      else 'none'
    end
    from public.profiles p
    where p.id = p_user
  ), 'none');
$$;

create or replace function app.is_admin(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = p_user and is_admin and banned_at is null);
$$;

/* ---------------------------------------------------------------- */
/* Groups                                                           */
/* ---------------------------------------------------------------- */

create or replace function app.is_member(p_user uuid, p_group uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    join public.profiles p on p.id = m.user_id
    where m.user_id = p_user
      and m.group_id = p_group
      and m.left_at is null
      and p.banned_at is null
  );
$$;

-- The app moved this user out (split, band change, category change), so the
-- days they answered there stay readable. Leaving on purpose ends access.
create or replace function app.was_moved_from(p_user uuid, p_group uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.user_id = p_user
      and m.group_id = p_group
      and m.left_reason in ('split', 'band_move', 'category_change')
  );
$$;

create or replace function app.primary_group(p_user uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select group_id from public.memberships
  where user_id = p_user and is_primary and left_at is null;
$$;

-- Positive = the group is that many bands above the user. Null = no band.
create or replace function app.bands_above(p_user uuid, p_group uuid)
returns integer
language sql
stable
security definer
set search_path = public, app
as $$
  select app.band_rank(g.band_id) - app.band_rank(app.user_band(p_user))
  from public.groups g
  where g.id = p_group;
$$;

create or replace function app.today_question(p_group uuid)
returns uuid
language sql
stable
security definer
set search_path = public, app
as $$
  select id from public.daily_questions
  where group_id = p_group and question_date = app.group_today(p_group);
$$;

/* ---------------------------------------------------------------- */
/* Answer to unlock                                                 */
/* ---------------------------------------------------------------- */

-- Deleted answers still count: deleting never re-locks a day.
create or replace function app.has_answered(p_user uuid, p_day uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.messages
    where author_id = p_user and day_question_id = p_day and kind = 'answer'
  );
$$;

-- Peek requires contribution (spec §2.7): answered today in any of your groups.
create or replace function app.has_answered_any_today(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select exists (
    select 1
    from public.memberships m
    join public.daily_questions dq
      on dq.group_id = m.group_id and dq.question_date = app.group_today(m.group_id)
    join public.messages ms
      on ms.day_question_id = dq.id and ms.author_id = p_user and ms.kind = 'answer'
    where m.user_id = p_user and m.left_at is null
  );
$$;

create or replace function app.peeked(p_user uuid, p_group uuid, p_date date)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.peeks
    where user_id = p_user and group_id = p_group and question_date = p_date
  );
$$;

-- The one read rule for a group's day (plan §5).
create or replace function app.can_read_day(p_user uuid, p_day uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, app
as $$
declare
  d record;
  v_plan text;
  above integer;
begin
  if p_user is null or p_day is null then
    return false;
  end if;

  select dq.id, dq.group_id, dq.question_date into d
  from public.daily_questions dq
  where dq.id = p_day;
  if not found then
    return false;
  end if;

  v_plan := app.user_plan(p_user);
  if v_plan = 'none' or app.user_band(p_user) is null then
    return false;
  end if;

  if app.is_member(p_user, d.group_id) or app.was_moved_from(p_user, d.group_id) then
    return app.has_answered(p_user, d.id);
  end if;

  above := app.bands_above(p_user, d.group_id);
  if above is null or above <= 0 or not app.has_answered_any_today(p_user) then
    return false;
  end if;

  if v_plan = 'ultimate' then
    return true;
  end if;

  return d.question_date = app.group_today(d.group_id)
    and above <= app.setting_int('pro_peek_band_range')
    and app.peeked(p_user, d.group_id, d.question_date);
end;
$$;

create or replace function app.can_post(p_user uuid, p_group uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select app.is_member(p_user, p_group)
    and app.user_plan(p_user) <> 'none'
    and app.user_band(p_user) is not null;
$$;

create or replace function app.can_eavesdrop(p_user uuid, p_group uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select app.user_plan(p_user) = 'ultimate' and coalesce(app.bands_above(p_user, p_group), 0) > 0;
$$;

/* ---------------------------------------------------------------- */
/* Peek allowance                                                   */
/* ---------------------------------------------------------------- */

-- Weekly peeks reset Monday 00:00 in the user's timezone.
create or replace function app.week_start(p_user uuid)
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select date_trunc('week', now() at time zone p.timezone) at time zone p.timezone
  from public.profiles p
  where p.id = p_user;
$$;

create or replace function app.weekly_peeks_used(p_user uuid)
returns integer
language sql
stable
security definer
set search_path = public, app
as $$
  select count(*)::integer from public.peeks
  where user_id = p_user and source = 'weekly' and created_at >= app.week_start(p_user);
$$;

create or replace function app.peek_credits(p_user uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(delta), 0)::integer from public.peek_credit_ledger where user_id = p_user;
$$;

/* ---------------------------------------------------------------- */
/* DMs + blocks                                                     */
/* ---------------------------------------------------------------- */

create or replace function app.is_blocked_pair(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_blocks
    where (blocker_id = p_a and blocked_id = p_b) or (blocker_id = p_b and blocked_id = p_a)
  );
$$;

create or replace function app.shares_group(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships a
    join public.memberships b on b.group_id = a.group_id
    where a.user_id = p_a and b.user_id = p_b
      and a.left_at is null and b.left_at is null
  );
$$;

create or replace function app.dm_thread_between(p_a uuid, p_b uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.dm_threads where user_a = least(p_a, p_b) and user_b = greatest(p_a, p_b);
$$;

-- D17: an existing thread survives a band move; new threads need a shared group.
create or replace function app.can_dm(p_from uuid, p_to uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select p_from is not null
    and p_to is not null
    and p_from <> p_to
    and not app.is_blocked_pair(p_from, p_to)
    and exists (select 1 from public.profiles where id = p_to and banned_at is null)
    and (
      exists (select 1 from public.profiles where id in (p_from, p_to) and is_official)
      or app.shares_group(p_from, p_to)
      or app.dm_thread_between(p_from, p_to) is not null
    );
$$;

create or replace function app.is_dm_participant(p_user uuid, p_thread uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.dm_participants where thread_id = p_thread and user_id = p_user);
$$;

/* ---------------------------------------------------------------- */
/* Grants for policy helpers                                        */
/* ---------------------------------------------------------------- */

revoke all on all tables in schema app from anon, authenticated;

grant execute on function
  app.user_plan(uuid),
  app.user_band(uuid),
  app.band_rank(text),
  app.is_admin(uuid),
  app.is_member(uuid, uuid),
  app.was_moved_from(uuid, uuid),
  app.primary_group(uuid),
  app.bands_above(uuid, uuid),
  app.group_today(uuid),
  app.group_label(uuid),
  app.today_question(uuid),
  app.has_answered(uuid, uuid),
  app.has_answered_any_today(uuid),
  app.peeked(uuid, uuid, date),
  app.can_read_day(uuid, uuid),
  app.can_post(uuid, uuid),
  app.can_eavesdrop(uuid, uuid),
  app.week_start(uuid),
  app.weekly_peeks_used(uuid),
  app.peek_credits(uuid),
  app.is_blocked_pair(uuid, uuid),
  app.shares_group(uuid, uuid),
  app.dm_thread_between(uuid, uuid),
  app.can_dm(uuid, uuid),
  app.is_dm_participant(uuid, uuid),
  app.setting_int(text),
  app.setting_text(text)
to authenticated;

/* ---------------------------------------------------------------- */
/* RLS for gated tables                                             */
/* ---------------------------------------------------------------- */

create policy "Members see who else is in their groups"
  on public.memberships for select to authenticated
  using (user_id = (select auth.uid()) or app.is_member((select auth.uid()), group_id));

-- Mute and read cursor are the only things a member changes directly.
create policy "Members update their own membership"
  on public.memberships for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke update on public.memberships from authenticated;
grant update (muted, last_read_at) on public.memberships to authenticated;

create policy "Members see their group's open queue"
  on public.question_candidates for select to authenticated
  using (
    hidden_at is null
    and status in ('open', 'picked')
    and app.is_member((select auth.uid()), group_id)
  );

create policy "People see their own votes"
  on public.question_votes for select to authenticated
  using (user_id = (select auth.uid()));

-- The answer-to-unlock gate. Also what Realtime enforces, so locked days never stream.
create policy "Readable days only"
  on public.messages for select to authenticated
  using (
    author_id = (select auth.uid())
    or (hidden_at is null and app.can_read_day((select auth.uid()), day_question_id))
  );

-- Subqueries on messages run through its RLS, so media and reactions inherit the gate.
create policy "Media on readable messages"
  on public.message_media for select to authenticated
  using (exists (select 1 from public.messages m where m.id = message_media.message_id));

create policy "Reactions on readable messages"
  on public.reactions for select to authenticated
  using (exists (select 1 from public.messages m where m.id = reactions.message_id));

create policy "Participants see their threads"
  on public.dm_threads for select to authenticated
  using (app.is_dm_participant((select auth.uid()), id));

create policy "Participants see thread members"
  on public.dm_participants for select to authenticated
  using (app.is_dm_participant((select auth.uid()), thread_id));

create policy "Participants update their own thread state"
  on public.dm_participants for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke update on public.dm_participants from authenticated;
grant update (last_read_at, muted, hidden) on public.dm_participants to authenticated;

create policy "Participants read thread messages"
  on public.dm_messages for select to authenticated
  using (
    app.is_dm_participant((select auth.uid()), thread_id)
    and (hidden_at is null or sender_id = (select auth.uid()))
  );

create policy "Media on readable DMs"
  on public.dm_media for select to authenticated
  using (exists (select 1 from public.dm_messages m where m.id = dm_media.dm_message_id));

create policy "Reactions on readable DMs"
  on public.dm_reactions for select to authenticated
  using (exists (select 1 from public.dm_messages m where m.id = dm_reactions.dm_message_id));

/* ---------------------------------------------------------------- */
/* Private media                                                    */
/* ---------------------------------------------------------------- */

-- message-media paths: {group_id}/{user_id}/{file}. dm-media: {thread_id}/{user_id}/{file}.
create policy "Group media follows message access"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'message-media'
    and (
      (storage.foldername(name))[2] = (select auth.uid())::text
      or exists (select 1 from public.message_media mm where mm.path = storage.objects.name)
    )
  );

create policy "Members upload group media to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'message-media'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and app.is_member((select auth.uid()), ((storage.foldername(name))[1])::uuid)
  );

create policy "People delete their own group media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'message-media' and (storage.foldername(name))[2] = (select auth.uid())::text);

create policy "DM media follows thread access"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'dm-media'
    and app.is_dm_participant((select auth.uid()), ((storage.foldername(name))[1])::uuid)
  );

create policy "Participants upload DM media to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'dm-media'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and app.is_dm_participant((select auth.uid()), ((storage.foldername(name))[1])::uuid)
  );

create policy "People delete their own DM media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'dm-media' and (storage.foldername(name))[2] = (select auth.uid())::text);

/* ---------------------------------------------------------------- */
/* Safe read models                                                 */
/* ---------------------------------------------------------------- */

-- What anyone signed in may know about a person. Exact MRR only when opted in.
create view public.profile_cards
with (security_invoker = false)
as
select
  p.id,
  p.name,
  p.avatar_path,
  p.bio,
  p.socials,
  p.is_official,
  p.primary_category,
  case
    when rc.status = 'verified' or (rc.status = 'disconnected' and rc.grace_until > now()) then rc.band_id
  end as band_id,
  case when p.show_exact_mrr and rc.status = 'verified' then rc.mrr_cents end as exact_mrr_cents,
  case when rc.status = 'verified' then rc.provider end as revenue_provider,
  pr.name as product_name,
  pr.icon_path as product_icon_path,
  pr.one_liner as product_one_liner,
  pr.url as product_url,
  pr.category as product_category,
  p.created_at
from public.profiles p
left join public.revenue_connections rc on rc.user_id = p.id
left join public.products pr on pr.user_id = p.id
where (select auth.uid()) is not null
  and p.banned_at is null;

revoke all on public.profile_cards from anon;
grant select on public.profile_cards to authenticated;

-- D18: exact combined MRR only once a group is big enough that no one
-- member's number can be worked out; band midpoints below that.
create view public.group_stats
with (security_invoker = false)
as
select
  g.id as group_id,
  app.group_label(g.id) as label,
  coalesce(s.member_count, 0)::integer as member_count,
  case
    when coalesce(s.member_count, 0) >= app.setting_int('combined_mrr_exact_min_members') then coalesce(s.exact_sum, 0)
    else coalesce(s.midpoint_sum, 0)
  end::bigint as combined_mrr_cents,
  coalesce(a.answers_today, 0)::integer as answers_today,
  coalesce(pk.peeks_today, 0)::integer as peeks_today
from public.groups g
left join lateral (
  select
    count(*) as member_count,
    sum(coalesce(rc.mrr_cents, b.midpoint_cents)) as exact_sum,
    sum(b.midpoint_cents) as midpoint_sum
  from public.memberships m
  left join public.revenue_connections rc on rc.user_id = m.user_id
  left join public.bands b on b.id = rc.band_id
  where m.group_id = g.id and m.left_at is null
) s on true
left join lateral (
  select count(*) as answers_today
  from public.messages ms
  join public.daily_questions dq on dq.id = ms.day_question_id
  where dq.group_id = g.id
    and dq.question_date = app.group_today(g.id)
    and ms.kind = 'answer'
) a on true
left join lateral (
  select count(distinct p.user_id) as peeks_today
  from public.peeks p
  where p.group_id = g.id and p.question_date = app.group_today(g.id)
) pk on true
where (select auth.uid()) is not null
  and g.status = 'active';

revoke all on public.group_stats from anon;
grant select on public.group_stats to authenticated;

/* ---------------------------------------------------------------- */
/* Realtime                                                         */
/* ---------------------------------------------------------------- */

do $$
begin
  alter publication supabase_realtime add table
    public.messages,
    public.reactions,
    public.daily_questions,
    public.question_candidates,
    public.dm_messages,
    public.dm_reactions,
    public.dm_threads;
exception when others then
  raise notice 'realtime publication not updated: %', sqlerrm;
end $$;
