-- htg.chat baseline, part 2: groups, memberships, daily questions, the queue, messages.

/* ---------------------------------------------------------------- */
/* Groups                                                           */
/* ---------------------------------------------------------------- */

-- kind: band_all = every category in the band (launch state, D8);
--       category = split out for one category; mixed = what's left after a split.
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  band_id text not null references public.bands (id),
  category text references public.categories (slug),
  kind text not null default 'band_all' check (kind in ('band_all', 'category', 'mixed')),
  cohort smallint not null default 1 check (cohort >= 1),
  parent_group_id uuid references public.groups (id) on delete set null,
  timezone text not null default 'America/New_York',
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  split_at timestamptz,
  constraint groups_category_matches_kind check ((kind = 'category') = (category is not null))
);

create unique index groups_active_slot_key
  on public.groups (band_id, coalesce(category, ''), kind, cohort)
  where status = 'active';

alter table public.groups enable row level security;

-- Every group is visible (the ladder shows groups above you). Contents are not.
create policy "Signed-in people see groups"
  on public.groups for select to authenticated using (true);

create or replace function app.group_label(p_group uuid)
returns text
language sql
stable
set search_path = public
as $$
  select b.label
    || ' · '
    || case g.kind
         when 'category' then c.short_label
         when 'mixed' then 'Mixed'
         else 'All'
       end
    || case when g.cohort > 1 then ' · Cohort ' || g.cohort else '' end
  from public.groups g
  join public.bands b on b.id = g.band_id
  left join public.categories c on c.slug = g.category
  where g.id = p_group;
$$;

-- The question day for a group (D7): one timezone per group.
create or replace function app.group_today(p_group uuid)
returns date
language sql
stable
set search_path = public
as $$
  select (now() at time zone g.timezone)::date from public.groups g where g.id = p_group;
$$;

-- left_reason distinguishes "I left" (access ends) from moves the app made
-- (split, band change), where answered history stays readable.
create table public.memberships (
  user_id uuid not null references public.profiles (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  is_primary boolean not null default false,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  left_reason text check (left_reason in ('left', 'split', 'band_move', 'category_change', 'removed')),
  muted boolean not null default false,
  last_read_at timestamptz,
  primary key (user_id, group_id)
);

create unique index memberships_one_primary_key
  on public.memberships (user_id)
  where is_primary and left_at is null;

create index memberships_group_active_idx on public.memberships (group_id) where left_at is null;

alter table public.memberships enable row level security;

create table public.group_split_proposals (
  id uuid primary key default gen_random_uuid(),
  band_id text not null references public.bands (id),
  source_group_id uuid not null references public.groups (id) on delete cascade,
  plan jsonb not null,
  status text not null default 'proposed' check (status in ('proposed', 'applied', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.group_split_proposals enable row level security;
revoke all on public.group_split_proposals from anon, authenticated;

/* ---------------------------------------------------------------- */
/* Questions                                                        */
/* ---------------------------------------------------------------- */

create table public.daily_questions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  question_date date not null,
  text text not null check (char_length(text) between 5 and 200),
  theme text references public.themes (slug),
  source text not null check (source in ('member', 'ai', 'admin', 'bank')),
  candidate_id uuid,
  asked_by_user_id uuid references public.profiles (id) on delete set null,
  published_at timestamptz not null default now(),
  edited_at timestamptz,
  unique (group_id, question_date)
);

create index daily_questions_group_date_idx on public.daily_questions (group_id, question_date desc);

alter table public.daily_questions enable row level security;

-- Questions are public inside the app: the ladder and peek-locked screens show
-- "their question today". Answers are what's gated.
create policy "Signed-in people see daily questions"
  on public.daily_questions for select to authenticated using (true);

create table public.question_candidates (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  for_date date not null,
  text text not null check (char_length(text) between 5 and 200),
  theme text references public.themes (slug),
  source text not null check (source in ('member', 'ai', 'admin')),
  author_user_id uuid references public.profiles (id) on delete cascade,
  ai_rationale text,
  ai_rank smallint,
  ai_run_id uuid,
  status text not null default 'open' check (status in ('open', 'picked', 'vetoed', 'expired')),
  pinned boolean not null default false,
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  constraint question_candidates_member_has_author check (source <> 'member' or author_user_id is not null)
);

alter table public.daily_questions
  add constraint daily_questions_candidate_fkey
  foreign key (candidate_id) references public.question_candidates (id) on delete set null;

create unique index question_candidates_one_per_member_key
  on public.question_candidates (group_id, for_date, author_user_id)
  where source = 'member';

create index question_candidates_queue_idx on public.question_candidates (group_id, for_date, status);

alter table public.question_candidates enable row level security;

create table public.question_votes (
  candidate_id uuid not null references public.question_candidates (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (candidate_id, user_id)
);

alter table public.question_votes enable row level security;

-- Cold start and fallback. Tagged by band range and categories (null = any).
create table public.question_bank (
  id uuid primary key default gen_random_uuid(),
  text text not null unique check (char_length(text) between 5 and 200),
  theme text not null references public.themes (slug),
  min_band text references public.bands (id),
  max_band text references public.bands (id),
  categories text[],
  used_count integer not null default 0,
  active boolean not null default true
);

alter table public.question_bank enable row level security;
revoke all on public.question_bank from anon, authenticated;

create table app.ai_runs (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('question_agent', 'tldr_tag', 'tldr_summary', 'tldr_ask', 'moderation')),
  group_id uuid references public.groups (id) on delete set null,
  model text,
  input_tokens integer,
  output_tokens integer,
  status text not null default 'ok' check (status in ('ok', 'error', 'skipped')),
  error text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

/* ---------------------------------------------------------------- */
/* Messages                                                         */
/* ---------------------------------------------------------------- */

-- Every group message belongs to a day bucket (day_question_id). Thread replies
-- carry their parent's day, so one access check covers the whole thread.
-- author_id goes null when an account is deleted; the body is scrubbed first.
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  day_question_id uuid not null references public.daily_questions (id) on delete cascade,
  kind text not null check (kind in ('answer', 'chat', 'thread_reply', 'system')),
  parent_id uuid references public.messages (id) on delete cascade,
  also_in_group boolean not null default false,
  quoted_message_id uuid references public.messages (id) on delete set null,
  body text not null default '' check (char_length(body) <= 4000),
  answered_late boolean not null default false,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  hidden_at timestamptz,
  hidden_by uuid references public.profiles (id) on delete set null,
  constraint messages_thread_shape check ((kind = 'thread_reply') = (parent_id is not null))
);

create unique index messages_one_answer_per_day_key
  on public.messages (author_id, day_question_id)
  where kind = 'answer';

create index messages_room_idx on public.messages (group_id, day_question_id, created_at);
create index messages_parent_idx on public.messages (parent_id, created_at) where parent_id is not null;
create index messages_author_idx on public.messages (author_id, created_at desc);

alter table public.messages enable row level security;

create table public.message_media (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  path text not null unique,
  mime text not null default 'image/jpeg',
  width integer,
  height integer,
  sort smallint not null default 0
);

create index message_media_message_idx on public.message_media (message_id, sort);

alter table public.message_media enable row level security;

create table public.reactions (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

alter table public.reactions enable row level security;

-- Snapshot = the question + answer pair as it was, so Saved renders even after
-- a peek expires (spec §7.7).
create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  message_id uuid references public.messages (id) on delete set null,
  group_id uuid references public.groups (id) on delete set null,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, message_id)
);

create index bookmarks_user_idx on public.bookmarks (user_id, created_at desc);

alter table public.bookmarks enable row level security;

create policy "People read their own bookmarks"
  on public.bookmarks for select to authenticated
  using (user_id = (select auth.uid()));

create policy "People remove their own bookmarks"
  on public.bookmarks for delete to authenticated
  using (user_id = (select auth.uid()));

-- Backs the public share page for one of your own answers (spec §11: only your
-- own answers leave the app).
create table public.answer_shares (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  show_identity boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.answer_shares enable row level security;

create policy "People read their own shares"
  on public.answer_shares for select to authenticated
  using (user_id = (select auth.uid()));
