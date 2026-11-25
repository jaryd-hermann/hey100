-- Account deletion, blocks, and reports Apple review requires for UGC.

-- Feedback a deleted builder left should stay on the other listing, without
-- their name. Matches and chats still go away with the account.
alter table public.feedback
  alter column from_user_id drop not null,
  alter column match_id drop not null;

alter table public.feedback drop constraint if exists feedback_from_user_id_fkey;
alter table public.feedback
  add constraint feedback_from_user_id_fkey
  foreign key (from_user_id) references public.profiles (id) on delete set null;

alter table public.feedback drop constraint if exists feedback_match_id_fkey;
alter table public.feedback
  add constraint feedback_match_id_fkey
  foreign key (match_id) references public.matches (id) on delete set null;

create table public.user_blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_not_self check (blocker_id <> blocked_id)
);

create table public.safety_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  subject_type text not null
    check (subject_type in ('user', 'listing', 'message', 'group', 'community_message')),
  subject_id uuid not null,
  subject_user_id uuid references auth.users (id) on delete set null,
  reason text not null check (char_length(reason) between 1 and 200),
  created_at timestamptz not null default now()
);

create index user_blocks_blocked_idx on public.user_blocks (blocked_id);
create index safety_reports_subject_idx on public.safety_reports (subject_type, subject_id);

alter table public.user_blocks enable row level security;
alter table public.safety_reports enable row level security;

create policy user_blocks_select
  on public.user_blocks for select
  to authenticated
  using ((select auth.uid()) = blocker_id);

create policy user_blocks_insert
  on public.user_blocks for insert
  to authenticated
  with check ((select auth.uid()) = blocker_id);

create policy user_blocks_delete
  on public.user_blocks for delete
  to authenticated
  using ((select auth.uid()) = blocker_id);

create policy safety_reports_insert
  on public.safety_reports for insert
  to authenticated
  with check ((select auth.uid()) = reporter_id);

grant select, insert, delete on public.user_blocks to authenticated;
grant insert on public.safety_reports to authenticated;

create or replace function app.paired_block(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select a is not null and b is not null and exists (
    select 1
    from public.user_blocks
    where (blocker_id = a and blocked_id = b)
       or (blocker_id = b and blocked_id = a)
  );
$$;

create or replace function public.my_blocked_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(distinct other), '{}')
  from (
    select blocked_id as other
    from public.user_blocks
    where blocker_id = (select auth.uid())
    union
    select blocker_id as other
    from public.user_blocks
    where blocked_id = (select auth.uid())
  ) pairs;
$$;

create or replace function public.block_user(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    return jsonb_build_object('status', 'blocked', 'reason', 'not_signed_in');
  end if;
  if p_user_id is null or p_user_id = me then
    return jsonb_build_object('status', 'blocked', 'reason', 'invalid');
  end if;

  insert into public.user_blocks (blocker_id, blocked_id)
  values (me, p_user_id)
  on conflict do nothing;

  update public.heys
  set status = 'passed', pass_reason = 'blocked'
  where status = 'pending'
    and (
      (from_user_id = me and to_user_id = p_user_id)
      or (from_user_id = p_user_id and to_user_id = me)
    );

  update public.matches
  set hidden_by_a = true, hidden_by_b = true
  where user_a = least(me, p_user_id)
    and user_b = greatest(me, p_user_id);

  insert into public.passes (user_id, app_id, reason)
  select me, a.id, 'blocked'
  from public.apps a
  where a.owner_id = p_user_id
  on conflict (user_id, app_id) do update set reason = excluded.reason;

  return jsonb_build_object('status', 'blocked_user');
end;
$$;

create or replace function public.unmatch_user(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  them uuid;
begin
  if me is null then
    return jsonb_build_object('status', 'blocked', 'reason', 'not_signed_in');
  end if;

  select case when user_a = me then user_b else user_a end
  into them
  from public.matches
  where id = p_match_id and me in (user_a, user_b);

  if them is null then
    return jsonb_build_object('status', 'blocked', 'reason', 'not_your_thread');
  end if;

  update public.matches
  set hidden_by_a = true, hidden_by_b = true
  where id = p_match_id;

  insert into public.passes (user_id, app_id, reason)
  select me, a.id, 'unmatched'
  from public.apps a
  where a.owner_id = them
  on conflict (user_id, app_id) do update set reason = excluded.reason;

  return jsonb_build_object('status', 'unmatched');
end;
$$;

create or replace function public.report_content(
  p_subject_type text,
  p_subject_id uuid,
  p_reason text,
  p_subject_user_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    return jsonb_build_object('status', 'blocked', 'reason', 'not_signed_in');
  end if;

  insert into public.safety_reports (
    reporter_id, subject_type, subject_id, subject_user_id, reason
  ) values (
    me, p_subject_type, p_subject_id, p_subject_user_id, btrim(p_reason)
  );

  return jsonb_build_object('status', 'reported');
end;
$$;

create or replace function public.delete_my_account()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    return jsonb_build_object('status', 'blocked', 'reason', 'not_signed_in');
  end if;

  update public.feedback
  set from_user_id = null
  where from_user_id = me;

  delete from storage.objects
  where bucket_id in ('listing-media', 'avatars')
    and name like me::text || '/%';

  delete from auth.users where id = me;

  return jsonb_build_object('status', 'deleted');
end;
$$;

create or replace function app.reject_blocked_hey()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if app.paired_block(new.from_user_id, new.to_user_id) then
    raise exception 'blocked';
  end if;
  return new;
end;
$$;

drop trigger if exists heys_reject_blocked on public.heys;
create trigger heys_reject_blocked
  before insert on public.heys
  for each row execute function app.reject_blocked_hey();

create or replace function public.send_message(
  p_match_id uuid,
  p_body text default null,
  p_media jsonb default '[]'::jsonb,
  p_reply_to uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  thread public.matches;
  message_id uuid;
  trimmed text := nullif(btrim(coalesce(p_body, '')), '');
  attachments jsonb := coalesce(p_media, '[]'::jsonb);
begin
  select * into thread from public.matches where id = p_match_id and me in (user_a, user_b);
  if not found then
    return jsonb_build_object('status', 'blocked', 'reason', 'not_your_thread');
  end if;
  if app.paired_block(thread.user_a, thread.user_b) then
    return jsonb_build_object('status', 'blocked', 'reason', 'blocked');
  end if;
  if trimmed is null and jsonb_array_length(attachments) = 0 then
    return jsonb_build_object('status', 'blocked', 'reason', 'empty');
  end if;
  if p_reply_to is not null and not exists (
    select 1 from public.messages where id = p_reply_to and match_id = p_match_id
  ) then
    p_reply_to := null;
  end if;

  insert into public.messages (match_id, sender_id, kind, body, media, reply_to)
  values (
    p_match_id, me,
    case when trimmed is null then 'media' else 'text' end,
    trimmed, attachments, p_reply_to
  )
  returning id into message_id;

  update public.matches
  set last_message_at = now(),
      expires_at = now() + interval '7 days',
      hidden_by_a = case when user_a = me then hidden_by_a else false end,
      hidden_by_b = case when user_b = me then hidden_by_b else false end
  where id = p_match_id;

  return jsonb_build_object('status', 'sent', 'message_id', message_id);
end;
$$;

create or replace function public.discover_deck(
  p_limit integer default 30,
  p_sort text default 'best_fit'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  sort text := case
    when lower(coalesce(p_sort, 'best_fit')) in ('most_liked', 'newest', 'best_fit')
      then lower(p_sort)
    else 'best_fit'
  end;
begin
  if me is null then
    return '[]'::jsonb;
  end if;

  return coalesce(
    (
      with viewer as (
        select a.category, a.platform, a.ideal_users
        from public.apps a
        where a.owner_id = me
        order by a.is_primary desc, a.published_at desc nulls last
        limit 1
      ),
      eligible as (
        select
          a.id,
          a.published_at,
          (select count(*)::integer from public.heys h where h.to_app_id = a.id) as hey_count,
          app.discover_fit_score(
            a.category,
            a.platform,
            a.ideal_users,
            v.category,
            v.platform,
            v.ideal_users
          ) as fit
        from public.apps a
        left join viewer v on true
        where a.published_at is not null
          and a.owner_id <> me
          and not app.paired_block(me, a.owner_id)
          and not exists (
            select 1 from public.passes p where p.user_id = me and p.app_id = a.id
          )
          and not exists (
            select 1 from public.heys h where h.from_user_id = me and h.to_app_id = a.id
          )
          and not exists (
            select 1 from public.matches m
            where (m.user_a = me and m.user_b = a.owner_id)
               or (m.user_b = me and m.user_a = a.owner_id)
          )
      )
      select jsonb_agg(app.listing_card(d.id) order by
        case
          when sort = 'most_liked' then d.hey_count
          when sort = 'newest' then extract(epoch from d.published_at)::integer
          else d.fit
        end desc,
        d.published_at desc
      )
      from (
        select *
        from eligible
        order by
          case
            when sort = 'most_liked' then hey_count
            when sort = 'newest' then extract(epoch from published_at)::integer
            else fit
          end desc,
          published_at desc
        limit greatest(1, least(coalesce(p_limit, 30), 100))
      ) d
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.my_threads()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    return '[]'::jsonb;
  end if;

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'match_id', m.id,
          'reason', m.reason,
          'created_at', m.created_at,
          'expires_at', m.expires_at,
          'last_message_at', m.last_message_at,
          'hidden', case when m.user_a = me then m.hidden_by_a else m.hidden_by_b end,
          'trade_mine', case when m.user_a = me then m.trade_a else m.trade_b end,
          'trade_theirs', case when m.user_a = me then m.trade_b else m.trade_a end,
          'share_mine_url', case when m.user_a = me then m.share_url_a else m.share_url_b end,
          'share_mine_code', case when m.user_a = me then m.share_code_a else m.share_code_b end,
          'share_theirs_url', case when m.user_a = me then m.share_url_b else m.share_url_a end,
          'share_theirs_code', case when m.user_a = me then m.share_code_b else m.share_code_a end,
          'them', case when m.user_a = me then m.user_b else m.user_a end,
          'builder', (
            select to_jsonb(b) from public.builders b
            where b.id = case when m.user_a = me then m.user_b else m.user_a end
          ),
          'their_app', app.listing_card(case when m.user_a = me then m.app_b else m.app_a end),
          'my_app', app.listing_card(case when m.user_a = me then m.app_a else m.app_b end),
          'last_message', (
            select jsonb_build_object(
              'kind', msg.kind,
              'body', msg.body,
              'mine', msg.sender_id = me,
              'created_at', msg.created_at,
              'media', jsonb_array_length(msg.media)
            )
            from public.messages msg
            where msg.match_id = m.id
            order by msg.created_at desc
            limit 1
          ),
          'unread', (
            select count(*)
            from public.messages msg
            where msg.match_id = m.id
              and msg.read_at is null
              and msg.sender_id is not null
              and msg.sender_id <> me
          ),
          'my_feedback_id', (
            select f.id from public.feedback f
            where f.match_id = m.id and f.from_user_id = me
            limit 1
          )
        )
        order by m.last_message_at desc
      )
      from public.matches m
      where me in (m.user_a, m.user_b)
        and not app.paired_block(
          me,
          case when m.user_a = me then m.user_b else m.user_a end
        )
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.my_blocked_ids() from public;
revoke all on function public.block_user(uuid) from public;
revoke all on function public.unmatch_user(uuid) from public;
revoke all on function public.report_content(text, uuid, text, uuid) from public;
revoke all on function public.delete_my_account() from public;

grant execute on function public.my_blocked_ids() to authenticated;
grant execute on function public.block_user(uuid) to authenticated;
grant execute on function public.unmatch_user(uuid) to authenticated;
grant execute on function public.report_content(text, uuid, text, uuid) to authenticated;
grant execute on function public.delete_my_account() to authenticated;
