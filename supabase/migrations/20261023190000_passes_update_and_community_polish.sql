-- Upsert on passes needs UPDATE. Discover's X was throwing 42501 and never
-- leaving a sent hey looking like it failed for the same reason.
grant update on public.passes to authenticated;

alter table public.community_group_members
  add column if not exists last_read_at timestamptz;

alter table public.community_threads
  add column if not exists media jsonb not null default '[]'::jsonb;

alter table public.community_replies
  add column if not exists media jsonb not null default '[]'::jsonb;

create table if not exists public.community_reactions (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references public.community_threads (id) on delete cascade,
  reply_id uuid references public.community_replies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  check (
    (thread_id is not null and reply_id is null)
    or (thread_id is null and reply_id is not null)
  )
);

create unique index if not exists community_reactions_thread_uniq
  on public.community_reactions (thread_id, user_id, emoji)
  where thread_id is not null;

create unique index if not exists community_reactions_reply_uniq
  on public.community_reactions (reply_id, user_id, emoji)
  where reply_id is not null;

create table if not exists public.community_message_reports (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references public.community_threads (id) on delete cascade,
  reply_id uuid references public.community_replies (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.community_reactions enable row level security;
alter table public.community_message_reports enable row level security;

create policy community_reactions_select
  on public.community_reactions for select
  to authenticated
  using (
    (thread_id is not null and exists (
      select 1 from public.community_threads t
      where t.id = thread_id and public.is_community_member(t.group_id)
    ))
    or (reply_id is not null and exists (
      select 1 from public.community_replies r
      join public.community_threads t on t.id = r.thread_id
      where r.id = reply_id and public.is_community_member(t.group_id)
    ))
  );

create policy community_reactions_write
  on public.community_reactions for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy community_reactions_delete
  on public.community_reactions for delete
  to authenticated
  using (user_id = (select auth.uid()));

create policy community_message_reports_insert
  on public.community_message_reports for insert
  to authenticated
  with check (reporter_id = (select auth.uid()));

grant select, insert, delete on public.community_reactions to authenticated;
grant insert on public.community_message_reports to authenticated;

create or replace function public.mark_community_group_read(p_group_id uuid)
returns void
language sql
security invoker
set search_path = public
as $$
  update public.community_group_members
  set last_read_at = now()
  where group_id = p_group_id
    and user_id = (select auth.uid());
$$;

grant execute on function public.mark_community_group_read(uuid) to authenticated;
