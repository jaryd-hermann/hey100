-- Welcome 1:1 from Jaryd, three minutes after signup.
--
-- Existing profiles are stamped so they never get a late hello. New rows keep
-- welcome_dm_at null; cron inserts an admin_dm and the push trigger fires.

alter table public.profiles
  add column if not exists welcome_dm_at timestamptz;

comment on column public.profiles.welcome_dm_at is
  'When the founder welcome DM was sent. Null means it is still due.';

update public.profiles
set welcome_dm_at = coalesce(onboarded_at, created_at)
where welcome_dm_at is null;

create or replace function app.send_welcome_dms()
returns integer
language plpgsql
security definer
set search_path = app, public
as $$
declare
  queued integer := 0;
begin
  with due as (
    select p.id
    from public.profiles p
    where p.welcome_dm_at is null
      and not p.is_admin
      and not coalesce(p.is_demo, false)
      and p.created_at <= now() - interval '3 minutes'
    order by p.created_at
    limit 50
  ),
  sent as (
    insert into public.admin_dms (user_id, from_admin, body)
    select
      due.id,
      true,
      $welcome$Hey! Welcome to my app. Genuinely, I'm so happy to have another builder be part of this. Things are new here and I'm working to bring new builders into the app everyday. If you have any feedback, ideas, see issues, or just want to chat about building (I'm working on a few of my own apps — tap my profile), I'm always down to chat ideas.$welcome$
    from due
    returning user_id
  )
  update public.profiles p
  set welcome_dm_at = now()
  from sent
  where p.id = sent.user_id;

  get diagnostics queued = row_count;
  return queued;
end;
$$;

revoke all on function app.send_welcome_dms() from public;

create or replace function app.on_admin_dm_push()
returns trigger
language plpgsql
security definer
set search_path = app, public
as $$
begin
  if new.from_admin then
    perform app.enqueue_push(
      new.user_id,
      'message',
      'admin-dm:' || new.id::text,
      'Jaryd from Hey100',
      left(btrim(coalesce(new.body, '')), 140),
      '/chat/team',
      jsonb_build_object('dmId', new.id)
    );
  end if;
  return new;
end;
$$;

revoke all on function app.on_admin_dm_push() from public;

drop trigger if exists admin_dms_push on public.admin_dms;
create trigger admin_dms_push
  after insert on public.admin_dms
  for each row
  execute function app.on_admin_dm_push();

do $$
begin
  perform cron.unschedule('hey100-welcome-dms');
exception when others then null;
end $$;

do $$
begin
  perform cron.schedule(
    'hey100-welcome-dms',
    '* * * * *',
    $cron$select app.send_welcome_dms()$cron$
  );
exception
  when others then
    raise notice 'pg_cron not available: %', sqlerrm;
end $$;
