-- Media on team broadcasts and admin DMs, quoted replies, and WhatsApp-style
-- reactions on match threads, broadcasts and DMs.

alter table public.admin_dms
  add column if not exists media jsonb not null default '[]'::jsonb,
  add column if not exists reply_to uuid references public.admin_dms (id) on delete set null;

alter table public.team_broadcasts
  add column if not exists media jsonb not null default '[]'::jsonb,
  add column if not exists reply_to uuid references public.team_broadcasts (id) on delete set null;

alter table public.messages
  add column if not exists reply_to uuid references public.messages (id) on delete set null;

alter table public.admin_dms drop constraint if exists admin_dms_body_check;
alter table public.team_broadcasts drop constraint if exists team_broadcasts_body_check;

alter table public.admin_dms
  alter column body drop not null,
  alter column body set default '';

alter table public.team_broadcasts
  alter column body drop not null,
  alter column body set default '';

alter table public.admin_dms
  add constraint admin_dms_say_something
  check (char_length(coalesce(body, '')) between 1 and 2000 or jsonb_array_length(media) > 0);

alter table public.team_broadcasts
  add constraint team_broadcasts_say_something
  check (char_length(coalesce(body, '')) between 1 and 2000 or jsonb_array_length(media) > 0);

create table if not exists public.chat_reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  message_id uuid references public.messages (id) on delete cascade,
  dm_id uuid references public.admin_dms (id) on delete cascade,
  broadcast_id uuid references public.team_broadcasts (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (
    (message_id is not null)::int
    + (dm_id is not null)::int
    + (broadcast_id is not null)::int = 1
  )
);

create unique index if not exists chat_reactions_message_uniq
  on public.chat_reactions (message_id, user_id, emoji)
  where message_id is not null;
create unique index if not exists chat_reactions_dm_uniq
  on public.chat_reactions (dm_id, user_id, emoji)
  where dm_id is not null;
create unique index if not exists chat_reactions_broadcast_uniq
  on public.chat_reactions (broadcast_id, user_id, emoji)
  where broadcast_id is not null;

revoke all on public.chat_reactions from anon, authenticated;
grant select, insert, delete on public.chat_reactions to authenticated;

alter table public.chat_reactions enable row level security;

create policy "See reactions on visible chat"
  on public.chat_reactions for select to authenticated
  using (
    (message_id is not null and exists (
      select 1
      from public.messages m
      join public.matches t on t.id = m.match_id
      where m.id = chat_reactions.message_id
        and auth.uid() in (t.user_a, t.user_b)
    ))
    or (broadcast_id is not null)
    or (dm_id is not null and exists (
      select 1 from public.admin_dms d
      where d.id = chat_reactions.dm_id
        and (d.user_id = auth.uid() or app.is_admin())
    ))
  );

create policy "React as yourself"
  on public.chat_reactions for insert to authenticated
  with check (user_id = auth.uid());

create policy "Remove your reaction"
  on public.chat_reactions for delete to authenticated
  using (user_id = auth.uid());

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
