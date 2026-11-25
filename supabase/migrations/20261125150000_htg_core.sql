-- htg.chat baseline, part 1: extensions, reference data, people, revenue, storage.
--
-- Conventions every htg migration follows (see docs/htg-plan.md §4–§5):
--   1. Internal helpers and private tables live in `app`, which the Data API
--      never exposes. `public` is API surface only.
--   2. Every public table enables RLS immediately. No policy = deny.
--   3. Gated writes go through `security definer` RPCs that call the `app.`
--      access functions. Clients never decide access.
--   4. Exact MRR never leaves `revenue_connections` except to its owner, or
--      to others when the owner set `profiles.show_exact_mrr`.

do $$
begin
  create extension if not exists pg_net with schema extensions;
exception when others then
  raise notice 'pg_net not available: %', sqlerrm;
end $$;

do $$
begin
  create extension if not exists pg_cron with schema pg_catalog;
exception when others then
  raise notice 'pg_cron not available: %', sqlerrm;
end $$;

create extension if not exists vector with schema extensions;

create schema if not exists app;
revoke all on schema app from public, anon, authenticated;
-- RLS policies call app.* helpers as the querying role, so `authenticated`
-- needs usage. The schema is still not exposed by the Data API, and helpers
-- get EXECUTE one by one (htg_access) instead of the PUBLIC default.
grant usage on schema app to authenticated, service_role;
alter default privileges in schema app revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from public, anon;

comment on schema app is 'Internal helpers and private tables. Never exposed through the Data API.';

create or replace function app.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

/* ---------------------------------------------------------------- */
/* Settings — tunable thresholds, read by SQL and the web jobs      */
/* ---------------------------------------------------------------- */

create table app.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into app.settings (key, value) values
  ('split_min_members', '30'),
  ('category_min_members', '8'),
  ('cohort_max_members', '80'),
  ('pro_peeks_per_week', '3'),
  ('pro_peek_band_range', '2'),
  ('member_asks_per_month', '5'),
  ('invite_peek_credits', '3'),
  ('answer_edit_minutes', '15'),
  ('category_changes_per_month', '2'),
  ('disconnect_grace_days', '7'),
  ('ai_candidates_per_day', '3'),
  ('combined_mrr_exact_min_members', '5'),
  ('auto_apply_splits', 'false'),
  ('official_email', '"hermannjaryd@gmail.com"'),
  ('welcome_messages', $json$[
    "Hey, I'm Jaryd. Welcome to htg.chat 👋",
    "I built this because I've shipped 3 apps and made $0. The fastest way to grow is hearing what founders a step ahead are doing.",
    "Two tips: answer every day (it unlocks the room), and ask your group the question you're stuck on.",
    "What are you building right now? Reply here, I read every one."
  ]$json$);

create or replace function app.setting_int(p_key text)
returns integer
language sql
stable
security definer
set search_path = app
as $$
  select (value #>> '{}')::integer from app.settings where key = p_key;
$$;

create or replace function app.setting_text(p_key text)
returns text
language sql
stable
security definer
set search_path = app
as $$
  select value #>> '{}' from app.settings where key = p_key;
$$;

/* ---------------------------------------------------------------- */
/* Reference data                                                   */
/* ---------------------------------------------------------------- */

-- Monthly MRR in cents. A band covers [min_cents, max_cents); null max is open.
-- Pre-revenue has min = max = 0 so no MRR ever maps to it: only GitHub does.
create table public.bands (
  id text primary key,
  label text not null,
  min_cents bigint not null,
  max_cents bigint,
  midpoint_cents bigint not null,
  sort smallint not null unique
);

insert into public.bands (id, label, min_cents, max_cents, midpoint_cents, sort) values
  ('pre_revenue', 'Pre-revenue', 0, 0, 0, 0),
  ('b0_1k', '$0–1k', 0, 100000, 50000, 1),
  ('b1_5k', '$1–5k', 100000, 500000, 300000, 2),
  ('b5_10k', '$5–10k', 500000, 1000000, 750000, 3),
  ('b10_25k', '$10–25k', 1000000, 2500000, 1750000, 4),
  ('b25_50k', '$25–50k', 2500000, 5000000, 3750000, 5),
  ('b50k_plus', '$50k+', 5000000, null, 7500000, 6);

create table public.categories (
  slug text primary key,
  label text not null,
  short_label text not null,
  sort smallint not null unique,
  active boolean not null default true
);

insert into public.categories (slug, label, short_label, sort) values
  ('saas', 'SaaS', 'SaaS', 1),
  ('mobile', 'Mobile app', 'Mobile', 2),
  ('ai', 'AI', 'AI', 3),
  ('devtools', 'Dev tools', 'Dev tools', 4),
  ('ecom', 'E-com', 'E-com', 5);

create table public.themes (
  slug text primary key,
  label text not null,
  blurb text not null,
  color text not null,
  sort smallint not null unique
);

insert into public.themes (slug, label, blurb, color, sort) values
  ('pricing', 'Pricing', 'Annual plans, price raises, discounts', '#FFFF00', 1),
  ('hiring', 'Hiring', 'First hire, contractors, support', '#2E5CFF', 2),
  ('channels', 'Channels', 'SEO, integrations, build in public', '#00FFFF', 3),
  ('retention', 'Retention', 'Pause, churn emails, onboarding', '#FF00FF', 4),
  ('fundraising', 'Fundraising', 'Bootstrapping, angels, revenue-based', '#7B00FF', 5),
  ('tooling', 'Tooling', 'Stack, AI tools, automation', '#00FF00', 6),
  ('product', 'Product', 'Roadmap, features, feedback', '#FF5900', 7),
  ('ops', 'Ops', 'Support, legal, finance', '#E8ECE7', 8),
  ('burnout', 'Burnout', 'Energy, focus, going solo', '#FF1C6F', 9);

alter table public.bands enable row level security;
alter table public.categories enable row level security;
alter table public.themes enable row level security;

create policy "Bands are readable by everyone" on public.bands for select to anon, authenticated using (true);
create policy "Categories are readable by everyone" on public.categories for select to anon, authenticated using (true);
create policy "Themes are readable by everyone" on public.themes for select to anon, authenticated using (true);

/* ---------------------------------------------------------------- */
/* People                                                           */
/* ---------------------------------------------------------------- */

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '' check (char_length(name) <= 60),
  avatar_path text,
  bio text not null default '' check (char_length(bio) <= 160),
  socials jsonb not null default '{}'::jsonb check (jsonb_typeof(socials) = 'object'),
  show_exact_mrr boolean not null default false,
  timezone text not null default 'America/New_York',
  primary_category text references public.categories (slug),
  plan text not null default 'none' check (plan in ('none', 'member', 'pro', 'ultimate')),
  plan_expires_at timestamptz,
  is_official boolean not null default false,
  is_admin boolean not null default false,
  terms_accepted_at timestamptz,
  ai_consent_at timestamptz,
  onboarding_step text not null default 'start',
  onboarded_at timestamptz,
  notification_prefs jsonb not null default jsonb_build_object(
    'daily_question', true,
    'replies', true,
    'dms', true,
    'eavesdrop', true,
    'digest', true,
    'quiet_hours', true,
    'quiet_start', '22:00',
    'quiet_end', '08:00'
  ),
  last_active_at timestamptz,
  banned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per account. Clients read their own row; other people come through public.profile_cards.';

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function app.touch_updated_at();

alter table public.profiles enable row level security;

create policy "People read their own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "People update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Plan, flags, consent stamps, category and bans are written by RPCs and the
-- service role only.
revoke update on public.profiles from authenticated;
grant update (name, avatar_path, bio, socials, show_exact_mrr, timezone, notification_prefs, onboarding_step, last_active_at)
  on public.profiles to authenticated;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  icon_path text,
  one_liner text not null default '' check (char_length(one_liner) <= 80),
  url text not null default '' check (char_length(url) <= 300),
  category text not null references public.categories (slug),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger products_touch_updated_at
  before update on public.products
  for each row execute function app.touch_updated_at();

alter table public.products enable row level security;

create policy "Signed-in people read products"
  on public.products for select to authenticated using (true);

create policy "People create their own product"
  on public.products for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "People edit their own product"
  on public.products for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create table public.category_changes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  from_category text references public.categories (slug),
  to_category text not null references public.categories (slug),
  created_at timestamptz not null default now()
);

create index category_changes_user_idx on public.category_changes (user_id, created_at desc);

alter table public.category_changes enable row level security;

create policy "People read their own category changes"
  on public.category_changes for select to authenticated
  using (user_id = (select auth.uid()));

/* ---------------------------------------------------------------- */
/* Revenue                                                          */
/* ---------------------------------------------------------------- */

create table public.revenue_connections (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  provider text not null check (provider in ('stripe', 'revenuecat', 'github')),
  status text not null default 'pending' check (status in ('pending', 'verified', 'failed', 'disconnected')),
  band_id text references public.bands (id),
  mrr_cents bigint,
  subscriptions integer,
  commits_90d integer,
  github_login text,
  rc_project_id text,
  is_fixture boolean not null default false,
  verified_at timestamptz,
  last_checked_at timestamptz,
  below_band_since date,
  grace_until timestamptz,
  error text,
  updated_at timestamptz not null default now()
);

comment on table public.revenue_connections is
  'The only place exact MRR lives. Owners read their own row; nobody else reads it directly.';

create trigger revenue_connections_touch_updated_at
  before update on public.revenue_connections
  for each row execute function app.touch_updated_at();

alter table public.revenue_connections enable row level security;

create policy "People read their own revenue connection"
  on public.revenue_connections for select to authenticated
  using (user_id = (select auth.uid()));

-- Read-only provider keys. Service role only: no policies, no grants.
create table public.revenue_secrets (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  provider text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.revenue_secrets enable row level security;
revoke all on public.revenue_secrets from anon, authenticated;

create table public.revenue_oauth_states (
  state text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null,
  created_at timestamptz not null default now()
);

alter table public.revenue_oauth_states enable row level security;
revoke all on public.revenue_oauth_states from anon, authenticated;

create table public.revenue_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null,
  mrr_cents bigint,
  band_id text references public.bands (id),
  checked_at timestamptz not null default now()
);

create index revenue_checks_user_idx on public.revenue_checks (user_id, checked_at desc);

alter table public.revenue_checks enable row level security;
revoke all on public.revenue_checks from anon, authenticated;

create or replace function app.band_for_mrr(p_mrr_cents bigint)
returns text
language sql
stable
set search_path = public
as $$
  select b.id
  from public.bands b
  where b.id <> 'pre_revenue'
    and p_mrr_cents >= b.min_cents
    and (b.max_cents is null or p_mrr_cents < b.max_cents)
  order by b.sort
  limit 1;
$$;

-- A user's band while their verification is usable: verified, or inside the
-- grace window after a disconnect.
create or replace function app.user_band(p_user uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select rc.band_id
  from public.revenue_connections rc
  where rc.user_id = p_user
    and (rc.status = 'verified' or (rc.status = 'disconnected' and rc.grace_until > now()));
$$;

create or replace function app.band_rank(p_band text)
returns smallint
language sql
stable
set search_path = public
as $$
  select sort from public.bands where id = p_band;
$$;

/* ---------------------------------------------------------------- */
/* Storage                                                          */
/* ---------------------------------------------------------------- */

-- Avatars and product icons are public (random paths). Group and DM media are
-- private: reads go through signed URLs and the policies in the access migration.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('product-icons', 'product-icons', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('message-media', 'message-media', false, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']),
  ('dm-media', 'dm-media', false, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Public images are readable by everyone"
  on storage.objects for select to anon, authenticated
  using (bucket_id in ('avatars', 'product-icons'));

create policy "People write public images in their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('avatars', 'product-icons')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "People replace their own public images"
  on storage.objects for update to authenticated
  using (
    bucket_id in ('avatars', 'product-icons')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "People delete their own public images"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('avatars', 'product-icons')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
