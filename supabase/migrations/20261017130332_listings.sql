-- Listings: the app, its media, its prompt answers, and the two rules that
-- publishing triggers.
--
-- Section 9's App entity, with three additions the spec implies but does not
-- name: `slug` for hey100.com/{slug}, `published_at` because "listed" has to be
-- a moment for the referral rule to fire on, and `shot_layout` for the carousel
-- orientation the owner picks.
--
-- `ideal_users` follows the spec's arrays rather than the client's joined
-- strings, because filtering and ranking in a later phase need the arrays. The
-- client mapper joins them for display.

create table public.apps (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,

  name text not null check (char_length(name) between 1 and 30),
  subtitle text not null default '' check (char_length(subtitle) <= 30),
  -- Immutable once set: the public URL should not move under a shared link.
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,39}$'),

  icon_path text,
  cover_path text,
  -- Until an icon is uploaded, the client paints one from the name and hue.
  hue smallint not null default 220 check (hue between 0 and 360),

  category text not null,
  platform text not null default 'iOS',
  stage text not null,
  store_url text,

  -- {web, tiktok, instagram, x}
  links jsonb not null default '{}'::jsonb,
  -- {ages[], gender_focus, interests[], devices[], own_words}
  ideal_users jsonb not null default '{}'::jsonb,
  feedback_wanted text[] not null default '{}',
  -- Section order the owner can rearrange.
  layout text[] not null default '{}',
  shot_layout text not null default 'vertical'
    check (shot_layout in ('vertical', 'horizontal')),

  is_primary boolean not null default false,
  published_at timestamptz,
  -- Billing owns this, so it is not in the client's update grants.
  listed_until timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.apps is 'Section 9 App entity. Public once published_at is set.';

create index apps_owner_idx on public.apps (owner_id);
create index apps_published_idx on public.apps (published_at) where published_at is not null;

-- One primary app per builder, enforced rather than assumed.
create unique index apps_one_primary_per_owner on public.apps (owner_id) where is_primary;

create trigger apps_touch_updated_at
  before update on public.apps
  for each row execute function app.touch_updated_at();

-- The composite primary key is what caps media at six per listing, so there is
-- no count-and-check trigger to get wrong.
create table public.app_media (
  app_id uuid not null references public.apps (id) on delete cascade,
  position smallint not null check (position between 0 and 5),
  kind text not null check (kind in ('image', 'video')),
  storage_path text not null,
  created_at timestamptz not null default now(),
  primary key (app_id, position)
);

-- Same trick: five slots, and a prompt cannot be answered twice in one listing.
create table public.app_prompts (
  app_id uuid not null references public.apps (id) on delete cascade,
  slot smallint not null check (slot between 0 and 4),
  prompt_id text not null references public.prompts (id),
  answer text not null check (char_length(answer) between 1 and 225),
  created_at timestamptz not null default now(),
  primary key (app_id, slot),
  unique (app_id, prompt_id)
);

-- Slugs are allocated server-side so two listings published at the same moment
-- cannot agree on the same URL.
create or replace function app.unique_slug(p_name text)
returns text
language plpgsql
set search_path = ''
as $$
declare
  base text;
  candidate text;
  suffix integer := 1;
begin
  base := btrim(regexp_replace(lower(coalesce(p_name, '')), '[^a-z0-9]+', '-', 'g'), '-');
  base := left(nullif(base, ''), 40);
  if base is null then
    base := 'app';
  end if;

  candidate := base;
  while exists (select 1 from public.apps a where a.slug = candidate) loop
    suffix := suffix + 1;
    candidate := left(base, 36) || '-' || suffix::text;

    if suffix > 50 then
      candidate := left(base, 32) || '-' || substr(md5(random()::text), 1, 6);
      exit;
    end if;
  end loop;

  return candidate;
end;
$$;

create or replace function app.fill_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.slug is null or btrim(new.slug) = '' then
    new.slug := app.unique_slug(new.name);
  end if;
  return new;
end;
$$;

create trigger apps_fill_slug
  before insert on public.apps
  for each row execute function app.fill_slug();

-- Free accounts list one app (spec section 10). Definer because it has to read
-- the owner's plan, which row level security deliberately hides, and because a
-- limit a client could bypass is not a limit.
create or replace function app.enforce_listing_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_plan text;
  already_published integer;
begin
  if new.published_at is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.published_at is not null then
    return new;
  end if;

  select p.plan into owner_plan from public.profiles p where p.id = new.owner_id;

  select count(*) into already_published
  from public.apps a
  where a.owner_id = new.owner_id
    and a.published_at is not null
    and a.id <> new.id;

  -- Pro is uncapped for now. The spec asks to confirm the number, so this is
  -- the one line to change when that is decided.
  if owner_plan <> 'pro' and already_published >= 1 then
    raise exception 'a free account can list one app'
      using errcode = 'P0001', hint = 'upgrade_required';
  end if;

  return new;
end;
$$;

create trigger apps_enforce_listing_limit
  before insert or update of published_at on public.apps
  for each row execute function app.enforce_listing_limit();

-- Spec section 7: both sides get +3 when the invited builder publishes, capped
-- at +15 per account. Granting here rather than at redemption is what stops a
-- code being farmed for matches without ever shipping anything.
create or replace function app.grant_referral_bonus()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  redemption public.invite_redemptions;
begin
  if new.published_at is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.published_at is not null then
    return new;
  end if;

  select * into redemption
  from public.invite_redemptions ir
  where ir.invited_user_id = new.owner_id
    and ir.bonus_granted_at is null
  for update;

  if not found then
    return new;
  end if;

  update public.invite_redemptions
  set bonus_granted_at = now()
  where id = redemption.id;

  -- A null referrer_id simply matches nothing, which is the admin-minted case.
  update public.profiles
  set bonus_matches = least(bonus_matches + 3, 15)
  where id in (redemption.invited_user_id, redemption.referrer_id);

  return new;
end;
$$;

create trigger apps_grant_referral_bonus
  after insert or update of published_at on public.apps
  for each row execute function app.grant_referral_bonus();

-- Grants: published listings are public, because hey100.com/{slug} is a page
-- anyone can open. Writes are the owner's, minus the columns billing owns.
revoke all on public.apps from anon, authenticated;
revoke all on public.app_media from anon, authenticated;
revoke all on public.app_prompts from anon, authenticated;

grant select on public.apps to anon, authenticated;
grant select on public.app_media to anon, authenticated;
grant select on public.app_prompts to anon, authenticated;

grant insert (
  owner_id, name, subtitle, icon_path, cover_path, hue, category, platform,
  stage, store_url, links, ideal_users, feedback_wanted, layout, shot_layout,
  is_primary, published_at
) on public.apps to authenticated;

grant update (
  name, subtitle, icon_path, cover_path, hue, category, platform, stage,
  store_url, links, ideal_users, feedback_wanted, layout, shot_layout,
  is_primary, published_at
) on public.apps to authenticated;

grant delete on public.apps to authenticated;
grant insert, update, delete on public.app_media to authenticated;
grant insert, update, delete on public.app_prompts to authenticated;

alter table public.apps enable row level security;
alter table public.app_media enable row level security;
alter table public.app_prompts enable row level security;

create policy "Published listings are readable by everyone"
  on public.apps
  for select
  to anon, authenticated
  using (published_at is not null);

-- An owner also sees the draft they have not published yet.
create policy "Owners can read their own drafts"
  on public.apps
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Builders can create their own listings"
  on public.apps
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Builders can edit their own listings"
  on public.apps
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Builders can delete their own listings"
  on public.apps
  for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

-- Media and prompt answers inherit the parent listing's visibility, so there is
-- one definition of who can see a listing.
create policy "Listing media follows the listing"
  on public.app_media
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.apps a
      where a.id = app_media.app_id
        and (a.published_at is not null or a.owner_id = (select auth.uid()))
    )
  );

create policy "Owners manage their listing media"
  on public.app_media
  for all
  to authenticated
  using (
    exists (
      select 1 from public.apps a
      where a.id = app_media.app_id and a.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.apps a
      where a.id = app_media.app_id and a.owner_id = (select auth.uid())
    )
  );

create policy "Listing answers follow the listing"
  on public.app_prompts
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.apps a
      where a.id = app_prompts.app_id
        and (a.published_at is not null or a.owner_id = (select auth.uid()))
    )
  );

create policy "Owners manage their listing answers"
  on public.app_prompts
  for all
  to authenticated
  using (
    exists (
      select 1 from public.apps a
      where a.id = app_prompts.app_id and a.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.apps a
      where a.id = app_prompts.app_id and a.owner_id = (select auth.uid())
    )
  );
