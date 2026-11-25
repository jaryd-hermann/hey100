-- The builder line under a listing ("iOS · Supabase" and a sentence about how
-- they give feedback). It reads like profile data, but the edit sheet puts it
-- per listing, so that is where it is stored.

alter table public.apps
  add column builder_role text check (char_length(builder_role) <= 60),
  add column builder_style text check (char_length(builder_style) <= 120);

grant insert (builder_role, builder_style),
      update (builder_role, builder_style)
  on public.apps to authenticated;
