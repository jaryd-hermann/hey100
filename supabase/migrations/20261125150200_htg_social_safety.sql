-- htg.chat baseline, part 3: DMs, peeks, eavesdrops, invites, safety, new-user setup.

/* ---------------------------------------------------------------- */
/* DMs                                                              */
/* ---------------------------------------------------------------- */

-- user_a < user_b so a pair has exactly one thread.
-- status: request until the recipient replies or accepts (Chats → Requests).
create table public.dm_threads (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  is_official boolean not null default false,
  status text not null default 'request' check (status in ('request', 'active')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  constraint dm_threads_ordered check (user_a < user_b),
  unique (user_a, user_b)
);

alter table public.dm_threads enable row level security;

create table public.dm_participants (
  thread_id uuid not null references public.dm_threads (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz,
  muted boolean not null default false,
  hidden boolean not null default false,
  accepted_at timestamptz,
  primary key (thread_id, user_id)
);

create index dm_participants_user_idx on public.dm_participants (user_id);

alter table public.dm_participants enable row level security;

create table public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.dm_threads (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  body text not null default '' check (char_length(body) <= 4000),
  quoted_message_id uuid references public.messages (id) on delete set null,
  quote_snapshot jsonb,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  hidden_at timestamptz
);

create index dm_messages_thread_idx on public.dm_messages (thread_id, created_at);

alter table public.dm_messages enable row level security;

create table public.dm_media (
  id uuid primary key default gen_random_uuid(),
  dm_message_id uuid not null references public.dm_messages (id) on delete cascade,
  path text not null unique,
  mime text not null default 'image/jpeg',
  width integer,
  height integer,
  sort smallint not null default 0
);

alter table public.dm_media enable row level security;

create table public.dm_reactions (
  dm_message_id uuid not null references public.dm_messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (dm_message_id, user_id, emoji)
);

alter table public.dm_reactions enable row level security;

/* ---------------------------------------------------------------- */
/* Peek, eavesdrop, invites                                         */
/* ---------------------------------------------------------------- */

-- One row per (user, group, that group's question day). Re-opening the same
-- group the same day reuses the row and costs nothing.
create table public.peeks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  question_date date not null,
  source text not null check (source in ('weekly', 'credit', 'ultimate')),
  created_at timestamptz not null default now(),
  unique (user_id, group_id, question_date)
);

create index peeks_user_week_idx on public.peeks (user_id, created_at desc);
create index peeks_group_day_idx on public.peeks (group_id, question_date);

alter table public.peeks enable row level security;

create policy "People read their own peeks"
  on public.peeks for select to authenticated
  using (user_id = (select auth.uid()));

create table public.peek_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  delta integer not null check (delta <> 0),
  reason text not null check (reason in ('invite', 'spend', 'admin')),
  invite_redemption_id uuid,
  peek_id uuid references public.peeks (id) on delete set null,
  created_at timestamptz not null default now()
);

create index peek_credit_ledger_user_idx on public.peek_credit_ledger (user_id);

alter table public.peek_credit_ledger enable row level security;

create policy "People read their own credit ledger"
  on public.peek_credit_ledger for select to authenticated
  using (user_id = (select auth.uid()));

create table public.eavesdrops (
  user_id uuid not null references public.profiles (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  alerts boolean not null default true,
  in_tldr boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, group_id)
);

alter table public.eavesdrops enable row level security;

create policy "People read their own eavesdrops"
  on public.eavesdrops for select to authenticated
  using (user_id = (select auth.uid()));

create table public.invite_codes (
  code text primary key check (code ~ '^HTG-[A-Z0-9]{4}-[A-Z0-9]{2}$'),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.invite_codes enable row level security;

create policy "People read their own invite code"
  on public.invite_codes for select to authenticated
  using (user_id = (select auth.uid()));

-- joined_at is stamped when the invitee is placed and subscribed; credits are
-- granted then, never at sign-up (no farming with throwaway accounts).
create table public.invite_redemptions (
  id uuid primary key default gen_random_uuid(),
  code text not null references public.invite_codes (code) on delete cascade,
  inviter_id uuid not null references public.profiles (id) on delete cascade,
  invitee_id uuid not null unique references public.profiles (id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  joined_at timestamptz,
  credits_granted integer not null default 0,
  constraint invite_redemptions_not_self check (inviter_id <> invitee_id)
);

alter table public.peek_credit_ledger
  add constraint peek_credit_ledger_redemption_fkey
  foreign key (invite_redemption_id) references public.invite_redemptions (id) on delete set null;

alter table public.invite_redemptions enable row level security;

create policy "Inviters read their redemptions"
  on public.invite_redemptions for select to authenticated
  using (inviter_id = (select auth.uid()));

/* ---------------------------------------------------------------- */
/* Safety + moderation (Apple 1.2)                                  */
/* ---------------------------------------------------------------- */

create table public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_not_self check (blocker_id <> blocked_id)
);

create index user_blocks_blocked_idx on public.user_blocks (blocked_id);

alter table public.user_blocks enable row level security;

create policy "People read their own blocks"
  on public.user_blocks for select to authenticated
  using (blocker_id = (select auth.uid()));

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  target_type text not null check (target_type in ('user', 'message', 'dm_message', 'group', 'question', 'block')),
  target_id uuid not null,
  subject_user_id uuid references public.profiles (id) on delete set null,
  reason text not null check (reason in ('spam', 'fake_revenue', 'harassment', 'sharing_outside', 'other', 'blocked', 'auto_flag')),
  note text check (char_length(note) <= 1000),
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  action text,
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index reports_open_idx on public.reports (created_at) where status = 'open';
create index reports_target_idx on public.reports (target_type, target_id);

alter table public.reports enable row level security;
revoke all on public.reports from anon, authenticated;

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles (id) on delete set null,
  action text not null check (action in ('hide_message', 'unhide_message', 'hide_question', 'remove_from_group', 'ban', 'unban', 'reverify_revenue', 'dismiss')),
  target_type text not null,
  target_id uuid not null,
  report_id uuid references public.reports (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

alter table public.moderation_actions enable row level security;
revoke all on public.moderation_actions from anon, authenticated;

/* ---------------------------------------------------------------- */
/* New-user setup                                                   */
/* ---------------------------------------------------------------- */

create or replace function app.random_code(p_len integer)
returns text
language sql
volatile
as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::integer, 1), '')
  from generate_series(1, p_len);
$$;

create or replace function app.official_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles where is_official order by created_at limit 1;
$$;

-- The pinned founder thread every account gets, with the welcome messages
-- (copy lives in app.settings so it can change without a deploy).
create or replace function app.ensure_official_thread(p_user uuid)
returns uuid
language plpgsql
security definer
set search_path = public, app
as $$
declare
  official uuid := app.official_user_id();
  a uuid;
  b uuid;
  thread uuid;
  line text;
  n integer := 0;
begin
  if official is null or official = p_user then
    return null;
  end if;

  a := least(official, p_user);
  b := greatest(official, p_user);

  select id into thread from public.dm_threads where user_a = a and user_b = b;
  if thread is not null then
    return thread;
  end if;

  insert into public.dm_threads (user_a, user_b, is_official, status, created_by)
  values (a, b, true, 'active', official)
  returning id into thread;

  insert into public.dm_participants (thread_id, user_id, accepted_at)
  values (thread, official, now()), (thread, p_user, now());

  for line in select jsonb_array_elements_text(app.settings.value) from app.settings where key = 'welcome_messages' loop
    insert into public.dm_messages (thread_id, sender_id, body, created_at)
    values (thread, official, line, now() + make_interval(secs => n));
    n := n + 1;
  end loop;

  update public.dm_threads set last_message_at = now() + make_interval(secs => n) where id = thread;
  return thread;
end;
$$;

create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, app
as $$
declare
  is_founder boolean := lower(coalesce(new.email, '')) = lower(app.setting_text('official_email'));
  code text;
  tries integer := 0;
  member record;
begin
  insert into public.profiles (id, name, is_official, is_admin)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 60),
    is_founder,
    is_founder
  );

  loop
    code := 'HTG-' || app.random_code(4) || '-' || app.random_code(2);
    begin
      insert into public.invite_codes (code, user_id) values (code, new.id);
      exit;
    exception when unique_violation then
      tries := tries + 1;
      if tries > 8 then raise; end if;
    end;
  end loop;

  if is_founder then
    -- The founder signed up after others: give everyone their thread now.
    for member in select id from public.profiles where id <> new.id loop
      perform app.ensure_official_thread(member.id);
    end loop;
  else
    perform app.ensure_official_thread(new.id);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();
