-- Welcome DM uses first name + listed app. Tool vote totals are a public
-- aggregate (same pattern as discussion counts) so a new account still sees
-- every upvote. Vote rows themselves stay per-user.

create or replace function app.send_welcome_dms()
returns integer
language plpgsql
security definer
set search_path = app, public
as $$
declare
  queued integer := 0;
begin
  with due as (
    select
      p.id,
      nullif(split_part(btrim(coalesce(p.real_name, '')), ' ', 1), '') as first_name,
      (
        select a.name
        from public.apps a
        where a.owner_id = p.id
        order by a.is_primary desc, a.created_at asc
        limit 1
      ) as app_name
    from public.profiles p
    where p.welcome_dm_at is null
      and not p.is_admin
      and not coalesce(p.is_demo, false)
      and p.created_at <= now() - interval '3 minutes'
    order by p.created_at
    limit 50
  ),
  sent as (
    insert into public.admin_dms (user_id, from_admin, body)
    select
      due.id,
      true,
      concat_ws(
        E'\n\n',
        case
          when due.first_name is not null then 'Hey ' || due.first_name || '!'
          else 'Hey!'
        end,
        'Welcome to my app. Genuinely, I''m so happy to have another builder be part of this.',
        case
          when due.app_name is not null then 'Thanks for listing ' || due.app_name || '!'
        end,
        'Things are new here and I''m working to bring new builders into the app everyday. If you have any feedback, ideas, see issues, or just want to chat about building (I''m working on a few of my own apps — tap my profile), I''m always down to chat ideas.'
      )
    from due
    returning user_id
  )
  update public.profiles p
  set welcome_dm_at = now()
  from sent
  where p.id = sent.user_id;

  get diagnostics queued = row_count;
  return queued;
end;
$$;

drop view if exists public.sponsored_tool_vote_tallies;

create or replace function public.sponsored_tool_vote_tallies()
returns table (tool_id uuid, up bigint, down bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    v.tool_id,
    count(*) filter (where v.vote = 1)::bigint as up,
    count(*) filter (where v.vote = -1)::bigint as down
  from public.sponsored_tool_votes v
  group by v.tool_id;
$$;

revoke all on function public.sponsored_tool_vote_tallies() from public;
grant execute on function public.sponsored_tool_vote_tallies() to authenticated, anon;
