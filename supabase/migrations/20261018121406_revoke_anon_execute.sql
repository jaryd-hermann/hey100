-- Close the functions to anonymous callers, properly this time.
--
-- Every migration so far revoked each function from PUBLIC and then granted it
-- to `authenticated`, which reads like it should be enough. It is not: Supabase
-- ships default privileges that grant EXECUTE on new functions in `public` to
-- `anon` by name, and revoking from PUBLIC does not touch a grant made to a
-- specific role. So the whole surface was callable by anyone holding the anon
-- key. Nothing leaked, because each function resolves `auth.uid()` and refuses
-- when it is null, but refusing by logic is a weaker guarantee than refusing by
-- permission, and only one of the two survives an edit to the logic.
--
-- This revokes anon's execute privilege on everything in `public` except the
-- three functions that have to answer before anyone signs in, and changes the
-- default so later functions start closed.

do $$
declare
  fn record;
  -- The invite screen checks a code, the sign-up screen checks a username, and
  -- a share link is a public page. Everything else needs a session.
  public_functions text[] := array['invite_code_status', 'username_available', 'listing_by_slug'];
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname <> all (public_functions)
  loop
    execute format('revoke execute on function %s from anon', fn.signature);
  end loop;
end;
$$;

-- New functions in public are not anon-callable unless they say so.
alter default privileges in schema public revoke execute on functions from anon;

-- The same oversight on tables: the loop tables were revoked from anon by name
-- already, but the default privilege would hand anon select on the next table
-- added. Published listings and builders are granted explicitly, so there is
-- nothing anon needs from a default.
alter default privileges in schema public revoke all on tables from anon;
