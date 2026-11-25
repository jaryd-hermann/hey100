-- Up/down votes on sponsored tools, and a builder-level GitHub commit total.

create table if not exists public.sponsored_tool_votes (
  tool_id uuid not null references public.sponsored_tools (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  vote smallint not null check (vote in (-1, 1)),
  updated_at timestamptz not null default now(),
  primary key (tool_id, user_id)
);

alter table public.sponsored_tool_votes enable row level security;

revoke all on public.sponsored_tool_votes from anon, authenticated;
grant select, insert, update, delete on public.sponsored_tool_votes to authenticated;

create policy sponsored_tool_votes_read
  on public.sponsored_tool_votes
  for select
  to authenticated
  using (true);

create policy sponsored_tool_votes_insert
  on public.sponsored_tool_votes
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy sponsored_tool_votes_update
  on public.sponsored_tool_votes
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy sponsored_tool_votes_delete
  on public.sponsored_tool_votes
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

alter table public.profiles
  add column if not exists github_login text,
  add column if not exists github_commits integer;

alter table public.app_oauth_states
  alter column app_id drop not null;

create table if not exists public.profile_secrets (
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

alter table public.profile_secrets enable row level security;

revoke all on public.profile_secrets from anon, authenticated;

create or replace view public.builders with (security_invoker = false) as
select
  p.id,
  p.username,
  p.display_pref,
  p.photo_url,
  case when coalesce((p.visibility ->> 'job')::boolean, true) then p.job end as job,
  case when coalesce((p.visibility ->> 'workplace')::boolean, true) then p.workplace end
    as workplace,
  p.role_tags,
  p.looking_for,
  p.app_interests,
  p.life_tags,
  p.own_words,
  p.links,
  p.created_at,
  case
    when exists (
      select 1 from public.matches m
      where (m.user_a = p.id and m.user_b = (select auth.uid()))
         or (m.user_b = p.id and m.user_a = (select auth.uid()))
    )
    then p.real_name
  end as real_name,
  p.skills,
  p.github_login,
  p.github_commits
from public.profiles p;
