-- The slug is allocated by a trigger, but a not-null column with no default
-- reads as required to the type generator, which forces callers to invent a
-- value they are not even granted to write.
--
-- The empty default never reaches the table: the trigger replaces it, and the
-- format check would reject it if it ever got through.

alter table public.apps alter column slug set default '';
