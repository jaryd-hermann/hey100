-- Verified listing connections. Snapshots are readable; tokens and API keys
-- sit on tables with RLS on and no client policies, so only the service role
-- (the edge function) can touch them.

alter table public.apps
  add column if not exists badges text[] not null default '{}';

create table if not exists public.app_connections (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps (id) on delete cascade,
  provider text not null check (provider in ('github', 'asc', 'revenuecat', 'stripe')),
  badge text not null,
  label text not null,
  detail text,
  snapshot jsonb not null default '{}'::jsonb,
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (app_id, provider)
);

create index if not exists app_connections_app_idx on public.app_connections (app_id);

create table if not exists public.app_oauth_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  app_id uuid not null,
  provider text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.app_connection_secrets (
  connection_id uuid primary key references public.app_connections (id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

revoke all on public.app_connections from anon, authenticated;
grant select on public.app_connections to anon, authenticated;

revoke all on public.app_oauth_states from anon, authenticated;
revoke all on public.app_connection_secrets from anon, authenticated;

alter table public.app_connections enable row level security;
alter table public.app_oauth_states enable row level security;
alter table public.app_connection_secrets enable row level security;

create policy "Owner or published listing can read connections"
  on public.app_connections
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.apps a
      where a.id = app_connections.app_id
        and (
          a.published_at is not null
          or a.owner_id = (select auth.uid())
        )
    )
  );
