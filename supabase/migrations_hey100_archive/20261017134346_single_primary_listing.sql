-- Marking a listing primary should move the flag, not fail.
--
-- The partial unique index stays as the guarantee, but on its own it turns
-- "make this one primary" into a constraint violation the client has to
-- untangle. Standing the old one down first makes it a switch.

create or replace function app.enforce_single_primary()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not new.is_primary then
    return new;
  end if;

  -- The inner update only ever sets the flag false, so this cannot recurse.
  update public.apps
  set is_primary = false
  where owner_id = new.owner_id
    and id <> new.id
    and is_primary;

  return new;
end;
$$;

create trigger apps_enforce_single_primary
  before insert or update of is_primary on public.apps
  for each row execute function app.enforce_single_primary();
