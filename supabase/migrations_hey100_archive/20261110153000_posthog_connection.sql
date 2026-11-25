-- PostHog is a fourth verified listing connection. The OAuth code verifier
-- stays on the short-lived state row so the callback can finish PKCE.

alter table public.app_connections
  drop constraint if exists app_connections_provider_check;

alter table public.app_connections
  add constraint app_connections_provider_check
  check (provider in ('github', 'asc', 'revenuecat', 'stripe', 'posthog'));

alter table public.app_oauth_states
  add column if not exists code_verifier text;
