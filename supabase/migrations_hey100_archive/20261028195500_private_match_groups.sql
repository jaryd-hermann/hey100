-- Private groups only people who matched with a listing can see, plus an
-- invite card in that match thread.

alter table public.community_groups
  add column if not exists listing_id uuid references public.apps (id) on delete set null;

alter table public.community_groups
  drop constraint if exists community_groups_join_mode_check;

alter table public.community_groups
  add constraint community_groups_join_mode_check
  check (join_mode in ('open', 'request', 'criteria', 'match'));

alter table public.community_groups
  drop constraint if exists community_groups_match_listing;

alter table public.community_groups
  add constraint community_groups_match_listing
  check (join_mode <> 'match' or listing_id is not null);

create unique index if not exists community_groups_one_match_listing
  on public.community_groups (listing_id)
  where join_mode = 'match' and listing_id is not null;

alter table public.messages
  drop constraint if exists messages_kind_check;

alter table public.messages
  add constraint messages_kind_check
  check (kind in ('system', 'text', 'media', 'feedback', 'announcement', 'invite'));

create or replace function public.matched_with_listing(p_listing_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_listing_id is not null
    and auth.uid() is not null
    and exists (
      select 1
      from public.matches m
      where (m.app_a = p_listing_id and m.user_b = auth.uid())
         or (m.app_b = p_listing_id and m.user_a = auth.uid())
    );
$$;

revoke all on function public.matched_with_listing(uuid) from public;
grant execute on function public.matched_with_listing(uuid) to authenticated;

create or replace function app.seed_match_group_invites(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  thread public.matches;
begin
  select * into thread from public.matches where id = p_match_id;
  if not found then
    return;
  end if;

  insert into public.messages (match_id, sender_id, kind, body, feedback)
  select
    p_match_id,
    g.created_by,
    'invite',
    'You''re invited to join my private community for '
      || a.name
      || '. No pressure to join either',
    jsonb_build_object(
      'group_id', g.id,
      'app_name', a.name,
      'group_name', g.name,
      'cover_path', g.cover_path,
      'icon_path', a.icon_path,
      'hue', a.hue
    )
  from public.community_groups g
  join public.apps a on a.id = g.listing_id
  where g.join_mode = 'match'
    and g.listing_id in (thread.app_a, thread.app_b)
    and g.created_by in (thread.user_a, thread.user_b)
    and not exists (
      select 1
      from public.messages msg
      where msg.match_id = p_match_id
        and msg.kind = 'invite'
        and msg.feedback ->> 'group_id' = g.id::text
    );
end;
$$;

revoke all on function app.seed_match_group_invites(uuid) from public;

create or replace function app.seed_listing_group_invites(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  rec record;
begin
  if p_listing_id is null then
    return;
  end if;
  if auth.uid() is null or not exists (
    select 1
    from public.community_groups g
    where g.listing_id = p_listing_id
      and g.join_mode = 'match'
      and g.created_by = auth.uid()
  ) then
    return;
  end if;

  for rec in
    select m.id
    from public.matches m
    where m.app_a = p_listing_id or m.app_b = p_listing_id
  loop
    perform app.seed_match_group_invites(rec.id);
  end loop;
end;
$$;

revoke all on function app.seed_listing_group_invites(uuid) from public;
grant execute on function app.seed_listing_group_invites(uuid) to authenticated;

create or replace function app.seed_match_hey_notes(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  thread public.matches;
  base_at timestamptz;
begin
  select * into thread from public.matches where id = p_match_id;
  if not found then
    return;
  end if;

  select coalesce(
    (
      select msg.created_at
      from public.messages msg
      where msg.match_id = p_match_id
      order by msg.created_at
      limit 1
    ),
    thread.created_at
  ) + interval '800 milliseconds'
  into base_at;

  insert into public.messages (match_id, sender_id, kind, body, created_at)
  select
    p_match_id,
    h.from_user_id,
    'text',
    app.hey_note_body(h.note, h.target_label),
    base_at + ((row_number() over (order by h.created_at) - 1) * interval '400 milliseconds')
  from public.heys h
  where h.status = 'matched'
    and (
      (h.from_user_id = thread.user_a and h.to_app_id = thread.app_b)
      or (h.from_user_id = thread.user_b and h.to_app_id = thread.app_a)
    )
    and not exists (
      select 1
      from public.messages msg
      where msg.match_id = p_match_id
        and msg.sender_id = h.from_user_id
        and msg.kind = 'text'
        and msg.body like '%Said hey to %'
    );

  perform app.seed_match_group_invites(p_match_id);
end;
$$;

drop function if exists public.create_community_group(text, text, text, text, text, text[]);

create or replace function public.create_community_group(
  p_name text default '',
  p_bio text default '',
  p_audience text default '',
  p_cover_path text default null,
  p_join_mode text default 'open',
  p_join_criteria text[] default '{}',
  p_listing_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  me uuid := auth.uid();
  new_id uuid;
  mode text := coalesce(p_join_mode, 'open');
  listing uuid := case when mode = 'match' then p_listing_id else null end;
begin
  if me is null then
    raise exception 'not signed in';
  end if;

  if mode = 'match' then
    if listing is null then
      raise exception 'Pick the app this group is for';
    end if;
    if not exists (
      select 1 from public.apps a where a.id = listing and a.owner_id = me
    ) then
      raise exception 'That listing is not yours';
    end if;
  end if;

  insert into public.community_groups (
    created_by, name, bio, audience, cover_path, join_mode, join_criteria, listing_id
  )
  values (
    me,
    trim(p_name),
    coalesce(p_bio, ''),
    coalesce(p_audience, ''),
    p_cover_path,
    mode,
    case when mode = 'criteria' then coalesce(p_join_criteria, '{}') else '{}' end,
    listing
  )
  returning id into new_id;

  insert into public.community_group_members (group_id, user_id, role, status)
  values (new_id, me, 'owner', 'active');

  if mode = 'match' then
    perform app.seed_listing_group_invites(listing);
  end if;

  return new_id;
end;
$$;

grant execute on function public.create_community_group(text, text, text, text, text, text[], uuid) to authenticated;

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
    return jsonb_build_object('groups', '[]'::jsonb, 'memberships', '[]'::jsonb, 'member_stacks', '[]'::jsonb);
  end if;

  perform public.ensure_official_builders_group();

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
    )
  );
end;
$$;

revoke all on function public.community_home_payload() from public;
grant execute on function public.community_home_payload() to authenticated;

drop policy if exists community_groups_select on public.community_groups;
create policy community_groups_select
  on public.community_groups for select
  to authenticated
  using (
    join_mode <> 'match'
    or created_by = (select auth.uid())
    or public.is_community_member(id)
    or public.matched_with_listing(listing_id)
  );

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
            or (
              g.join_mode = 'match'
              and status = 'active'
              and public.matched_with_listing(g.listing_id)
            )
          )
      )
    )
  );

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
  me uuid := auth.uid();
begin
  select * into g
  from public.community_groups
  where id = p_id
    and tool_id is null;

  if not found then
    return null;
  end if;

  if g.join_mode = 'match' then
    if me is null
      or (
        g.created_by <> me
        and not exists (
          select 1
          from public.community_group_members m
          where m.group_id = g.id and m.user_id = me and m.status = 'active'
        )
        and not public.matched_with_listing(g.listing_id)
      )
    then
      return null;
    end if;
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
