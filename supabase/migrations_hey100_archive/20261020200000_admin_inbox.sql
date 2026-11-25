-- Admin broadcast + 1:1 DMs with the Hey100 team thread.
--
-- hermannjaryd@gmail.com is the founder account. The flag is set on insert so
-- signing up with that email is enough; a one-shot update covers an existing row.

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

create or replace function app.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

create or replace function app.grant_known_admin()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if exists (
    select 1 from auth.users u
    where u.id = new.id and lower(u.email) = 'hermannjaryd@gmail.com'
  ) then
    new.is_admin := true;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_known_admin on public.profiles;
create trigger profiles_known_admin
  before insert or update of id on public.profiles
  for each row execute function app.grant_known_admin();

update public.profiles p
set is_admin = true
from auth.users u
where u.id = p.id and lower(u.email) = 'hermannjaryd@gmail.com';

create table if not exists public.team_broadcasts (
  id uuid primary key default gen_random_uuid(),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.admin_dms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  from_admin boolean not null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists admin_dms_user_idx on public.admin_dms (user_id, created_at);

revoke all on public.team_broadcasts from anon, authenticated;
revoke all on public.admin_dms from anon, authenticated;
grant select on public.team_broadcasts to authenticated;
grant insert on public.team_broadcasts to authenticated;
grant select, insert on public.admin_dms to authenticated;

alter table public.team_broadcasts enable row level security;
alter table public.admin_dms enable row level security;

create policy "Everyone reads broadcasts"
  on public.team_broadcasts for select to authenticated
  using (true);

create policy "Admins send broadcasts"
  on public.team_broadcasts for insert to authenticated
  with check (app.is_admin());

create policy "Own DMs or admin reads all"
  on public.admin_dms for select to authenticated
  using (user_id = auth.uid() or app.is_admin());

create policy "Users write their DMs"
  on public.admin_dms for insert to authenticated
  with check (
    (user_id = auth.uid() and from_admin = false)
    or (app.is_admin() and from_admin = true)
  );
