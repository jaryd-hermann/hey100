-- htg.chat baseline, part 6: push outbox (carried over from Hey100).
--
-- OneSignal is the last mile; this decides whether to send. The send-push
-- Edge Function drains app.push_outbox. Set app.push_config.function_url (and
-- drain_secret) after deploy via public.admin_set_push_config so inserts wake
-- the function; the minute cron is the backup.

create or replace function public.touch_presence(p_timezone text default null)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.profiles
  set last_active_at = now(),
      timezone = coalesce(nullif(btrim(p_timezone), ''), timezone)
  where id = (select auth.uid());
end;
$$;

revoke all on function public.touch_presence(text) from public, anon;
grant execute on function public.touch_presence(text) to authenticated;

create table app.push_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  event text not null,
  collapse_id text not null,
  title text not null,
  body text not null,
  url text not null default '/',
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'sent', 'skipped', 'failed')),
  skip_reason text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index push_outbox_pending_idx on app.push_outbox (created_at) where status = 'pending';
create index push_outbox_user_event_idx on app.push_outbox (user_id, event, created_at desc);

create table app.push_config (
  id integer primary key default 1 check (id = 1),
  function_url text,
  drain_secret text
);

insert into app.push_config (id) values (1) on conflict (id) do nothing;

revoke all on app.push_outbox from anon, authenticated;
revoke all on app.push_config from anon, authenticated;

-- Collapses onto a pending row with the same collapse_id instead of stacking.
create or replace function app.enqueue_push(
  p_user_id uuid,
  p_event text,
  p_collapse_id text,
  p_title text,
  p_body text,
  p_url text,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = app, public
as $$
declare
  existing uuid;
begin
  if p_user_id is null then
    return null;
  end if;

  update app.push_outbox
  set title = p_title, body = p_body, url = p_url,
      payload = coalesce(p_payload, '{}'::jsonb), created_at = now()
  where user_id = p_user_id and collapse_id = p_collapse_id and status = 'pending'
  returning id into existing;

  if existing is not null then
    return existing;
  end if;

  insert into app.push_outbox (user_id, event, collapse_id, title, body, url, payload)
  values (p_user_id, p_event, p_collapse_id, p_title, p_body, p_url, coalesce(p_payload, '{}'::jsonb))
  returning id into existing;

  return existing;
end;
$$;

create or replace function app.request_push_drain()
returns void
language plpgsql
security definer
set search_path = app, extensions, public
as $$
declare
  cfg app.push_config;
begin
  select * into cfg from app.push_config where id = 1;
  if cfg.function_url is null or length(cfg.function_url) < 8 then
    return;
  end if;

  perform net.http_post(
    url := cfg.function_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', coalesce(cfg.drain_secret, '')),
    body := '{"drain":true}'::jsonb
  );
exception when others then
  null;
end;
$$;

create or replace function app.on_push_enqueued()
returns trigger
language plpgsql
security definer
set search_path = app
as $$
begin
  perform app.request_push_drain();
  return new;
end;
$$;

create trigger push_outbox_drain
  after insert on app.push_outbox
  for each row
  when (new.status = 'pending')
  execute function app.on_push_enqueued();

/* Service-role drain helpers used by send-push. */

create or replace function public.admin_claim_push_batch(p_limit integer default 40)
returns jsonb
language sql
security definer
set search_path = app, public
as $$
  select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
  from (
    select * from app.push_outbox
    where status = 'pending'
    order by created_at
    limit greatest(1, least(coalesce(p_limit, 40), 80))
  ) r;
$$;

create or replace function public.admin_mark_push(p_id uuid, p_status text, p_reason text default null)
returns void
language sql
security definer
set search_path = app
as $$
  update app.push_outbox
  set status = p_status,
      skip_reason = p_reason,
      sent_at = case when p_status = 'sent' then now() else sent_at end
  where id = p_id;
$$;

create or replace function public.admin_profile_for_push(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', p.id,
    'notification_prefs', p.notification_prefs,
    'last_active_at', p.last_active_at,
    'timezone', p.timezone
  )
  from public.profiles p
  where p.id = p_user_id;
$$;

create or replace function public.admin_set_push_config(p_url text, p_secret text)
returns void
language sql
security definer
set search_path = app
as $$
  update app.push_config set function_url = p_url, drain_secret = p_secret where id = 1;
$$;

revoke all on function public.admin_claim_push_batch(integer) from public, anon, authenticated;
revoke all on function public.admin_mark_push(uuid, text, text) from public, anon, authenticated;
revoke all on function public.admin_profile_for_push(uuid) from public, anon, authenticated;
revoke all on function public.admin_set_push_config(text, text) from public, anon, authenticated;
grant execute on function public.admin_claim_push_batch(integer) to service_role;
grant execute on function public.admin_mark_push(uuid, text, text) to service_role;
grant execute on function public.admin_profile_for_push(uuid) to service_role;
grant execute on function public.admin_set_push_config(text, text) to service_role;

do $$
begin
  perform cron.unschedule('hey100-plan-engagement');
exception when others then null;
end $$;

do $$
begin
  perform cron.unschedule('hey100-drain-push');
exception when others then null;
end $$;

do $$
begin
  perform cron.schedule('htg-drain-push', '* * * * *', $cron$select app.request_push_drain()$cron$);
exception when others then
  raise notice 'pg_cron not available: %', sqlerrm;
end $$;
