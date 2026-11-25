-- htg.chat baseline, part 4: TLDR corpus, rankings, insights, Ask history.
-- Written by the web cron jobs (service role). Clients read through RPCs that
-- apply app.tldr_scope (plan §8.1), except their own Ask history.

create table public.message_themes (
  message_id uuid not null references public.messages (id) on delete cascade,
  theme text not null references public.themes (slug),
  subtopic text,
  confidence real,
  created_at timestamptz not null default now(),
  primary key (message_id, theme)
);

create index message_themes_theme_idx on public.message_themes (theme, created_at desc);

alter table public.message_themes enable row level security;
revoke all on public.message_themes from anon, authenticated;

create table public.message_embeddings (
  message_id uuid primary key references public.messages (id) on delete cascade,
  embedding extensions.vector(1536) not null,
  model text not null,
  created_at timestamptz not null default now()
);

create index message_embeddings_hnsw_idx
  on public.message_embeddings using hnsw (embedding extensions.vector_cosine_ops);

alter table public.message_embeddings enable row level security;
revoke all on public.message_embeddings from anon, authenticated;

-- Question texts are embedded too, so the agent can reject near-duplicates.
create table public.question_embeddings (
  daily_question_id uuid primary key references public.daily_questions (id) on delete cascade,
  embedding extensions.vector(1536) not null,
  model text not null,
  created_at timestamptz not null default now()
);

alter table public.question_embeddings enable row level security;
revoke all on public.question_embeddings from anon, authenticated;

create table public.tldr_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('top_question', 'top_answer', 'group_insight', 'theme_insight')),
  period text not null check (period in ('week', 'all')),
  group_id uuid references public.groups (id) on delete cascade,
  theme text references public.themes (slug),
  daily_question_id uuid references public.daily_questions (id) on delete cascade,
  message_id uuid references public.messages (id) on delete cascade,
  text text not null,
  excerpt text check (char_length(excerpt) <= 140),
  rank_score numeric not null default 0,
  participant_mrr_cents bigint not null default 0,
  answer_count integer not null default 0,
  reply_count integer not null default 0,
  source_message_ids uuid[] not null default '{}',
  period_start date not null,
  period_end date not null,
  created_at timestamptz not null default now()
);

create index tldr_items_feed_idx on public.tldr_items (period, rank_score desc);
create index tldr_items_group_idx on public.tldr_items (group_id, period);
create index tldr_items_text_search_idx on public.tldr_items using gin (to_tsvector('english', text));

alter table public.tldr_items enable row level security;
revoke all on public.tldr_items from anon, authenticated;

create table public.theme_stats (
  theme text not null references public.themes (slug),
  period_start date not null,
  period_end date not null,
  answer_count integer not null default 0,
  group_count integer not null default 0,
  hot boolean not null default false,
  insight text,
  primary key (theme, period_start)
);

alter table public.theme_stats enable row level security;

create policy "Signed-in people read theme stats"
  on public.theme_stats for select to authenticated using (true);

create table public.tldr_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text,
  created_at timestamptz not null default now()
);

alter table public.tldr_conversations enable row level security;

create policy "People read their own TLDR conversations"
  on public.tldr_conversations for select to authenticated
  using (user_id = (select auth.uid()));

create table public.tldr_asks (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.tldr_conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  question text not null check (char_length(question) between 1 and 1000),
  answer text,
  citations jsonb not null default '[]'::jsonb,
  suggestions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index tldr_asks_user_month_idx on public.tldr_asks (user_id, created_at desc);

alter table public.tldr_asks enable row level security;

create policy "People read their own TLDR asks"
  on public.tldr_asks for select to authenticated
  using (user_id = (select auth.uid()));
