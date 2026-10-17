-- The slug trigger calls app.unique_slug, and clients have no access to the app
-- schema by design, so every insert failed with "permission denied for schema
-- app". Definer runs the inner call as the owner without opening the schema up.
--
-- Trigger functions that only touch NEW are safe as definer: they take no
-- caller input beyond the row the caller was already allowed to write.

create or replace function app.fill_slug()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.slug is null or btrim(new.slug) = '' then
    new.slug := app.unique_slug(new.name);
  end if;
  return new;
end;
$$;
