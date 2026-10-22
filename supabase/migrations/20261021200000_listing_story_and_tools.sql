-- Problem statement, pricing, onboarding copy, store rating, and a
-- sponsored-tools directory the Apps tab can promote.

alter table public.apps
  add column if not exists problem_of text not null default '',
  add column if not exists problem_for text not null default '',
  add column if not exists pricing_model text not null default '',
  add column if not exists price_from text not null default '',
  add column if not exists onboarding text not null default '',
  add column if not exists store_rating numeric,
  add column if not exists store_rating_count integer;

create table if not exists public.sponsored_tools (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  subtitle text not null default '',
  url text not null,
  logo_url text not null default '',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.sponsored_tools enable row level security;

revoke all on public.sponsored_tools from anon, authenticated;
grant select on public.sponsored_tools to anon, authenticated;

create policy sponsored_tools_read
  on public.sponsored_tools
  for select
  to anon, authenticated
  using (active);

insert into public.sponsored_tools (name, subtitle, url, logo_url, sort_order) values
  ('Expo', 'Ship iOS and Android from one codebase', 'https://expo.dev', 'https://avatars.githubusercontent.com/u/12504344?s=128', 10),
  ('RevenueCat', 'Subscriptions and in-app purchases', 'https://www.revenuecat.com', 'https://avatars.githubusercontent.com/u/31720269?s=128', 20),
  ('Granola', 'AI notepad for meetings', 'https://www.granola.ai', 'https://www.granola.ai/favicon.ico', 30),
  ('Attio', 'CRM for founders who live in their inbox', 'https://attio.com', 'https://attio.com/favicon.ico', 40),
  ('OneSignal', 'Push, email and in-app messages', 'https://onesignal.com', 'https://avatars.githubusercontent.com/u/5955002?s=128', 50),
  ('Resend', 'Email API for developers', 'https://resend.com', 'https://avatars.githubusercontent.com/u/109384852?s=128', 60),
  ('Supabase', 'Postgres, auth and storage', 'https://supabase.com', 'https://avatars.githubusercontent.com/u/54469796?s=128', 70),
  ('Cursor', 'The AI code editor', 'https://cursor.com', 'https://www.cursor.com/favicon.ico', 80)
on conflict do nothing;
