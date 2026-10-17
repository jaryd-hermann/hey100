-- Identity: profiles, invite codes and the referral link between them.
--
-- Field names follow section 9 of the design spec so the schema and the spec
-- can be read against each other. Two deliberate departures:
--
--   * `heys_remaining_today` is not here. A stored counter needs a scheduled
--     reset, and the reset timezone is still an open product question. Phase 3
--     counts today's rows in `heys` instead, which cannot drift and answers the
--     timezone question with one expression.
--   * `theme_pref` is kept because the spec lists it, but the client still owns
--     it in AsyncStorage. It moves here when a second device needs to agree.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,

  -- Shown in chat once matched. Apple only hands over a name on the very first
  -- authorization, so it can legitimately be null.
  real_name text,
  -- Same rule as the client's USERNAME_PATTERN.
  username text unique check (username ~ '^[a-z0-9_]{1,20}$'),
  display_pref text not null default 'username'
    check (display_pref in ('username', 'real_name')),
  photo_url text,
  job text,
  workplace text,

  role_tags text[] not null default '{}',
  test_devices text[] not null default '{}',
  looking_for text[] not null default '{}',
  app_interests text[] not null default '{}',
  life_tags text[] not null default '{}',

  -- own_words is {field: text}, visibility is {field: bool}, links is
  -- {x, github, linkedin, web}. All three are open-ended per the spec.
  own_words jsonb not null default '{}'::jsonb,
  visibility jsonb not null default '{}'::jsonb,
  links jsonb not null default '{}'::jsonb,

  theme_pref text not null default 'system'
    check (theme_pref in ('system', 'light', 'dark')),

  -- Everything below is server-owned. Column grants further down stop a client
  -- from writing any of it, so a user cannot award themselves Pro or matches.
  plan text not null default 'free' check (plan in ('free', 'pro')),
  plan_expires_at timestamptz,
  referral_code text not null unique,
  referred_by uuid references public.profiles (id) on delete set null,
  bonus_matches smallint not null default 0 check (bonus_matches between 0 and 15),

  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per auth user, created by trigger. Section 9 User entity.';
comment on column public.profiles.bonus_matches is
  'Referral bonus, +3 per invited builder who publishes, capped at +15 (spec 7).';

create index profiles_referred_by_idx on public.profiles (referred_by);

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function app.touch_updated_at();

-- Invite codes. Deliberately unreadable by clients: the only way to learn
-- anything about a code is `invite_code_status`, which answers valid or not and
-- never lists codes.
create table public.invite_codes (
  code text primary key check (code ~ '^[A-Z0-9]{6,12}$'),
  -- Null means minted by us rather than earned by a builder.
  owner_id uuid references public.profiles (id) on delete set null,
  max_redemptions integer not null default 1 check (max_redemptions > 0),
  redemption_count integer not null default 0 check (redemption_count >= 0),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint invite_codes_not_oversubscribed
    check (redemption_count <= max_redemptions)
);

create index invite_codes_owner_idx on public.invite_codes (owner_id);

-- One redemption per account, enforced by the unique constraint rather than by
-- the application remembering to check.
create table public.invite_redemptions (
  id uuid primary key default gen_random_uuid(),
  code text not null references public.invite_codes (code) on delete restrict,
  invited_user_id uuid not null unique references public.profiles (id) on delete cascade,
  referrer_id uuid references public.profiles (id) on delete set null,
  redeemed_at timestamptz not null default now(),
  -- Stays null until the invited builder publishes a listing, which is when
  -- spec section 7 says the +3 is actually earned. Phase 2 sets it.
  bonus_granted_at timestamptz
);

create index invite_redemptions_referrer_idx on public.invite_redemptions (referrer_id);

-- Unambiguous alphabet: no I, L, O, 0 or 1 to mistype when read aloud.
create or replace function app.new_referral_code()
returns text
language plpgsql
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  candidate text;
  attempts integer := 0;
begin
  loop
    candidate := '';
    for _ in 1..6 loop
      candidate := candidate
        || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
    end loop;

    exit when not exists (
      select 1 from public.profiles p where p.referral_code = candidate
    );

    attempts := attempts + 1;
    if attempts > 20 then
      raise exception 'could not allocate a referral code';
    end if;
  end loop;

  return candidate;
end;
$$;

-- A profile row exists from the moment the account does, so no screen has to
-- cope with a signed-in user who has no profile.
create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, real_name, photo_url, referral_code)
  values (
    new.id,
    -- Provider metadata is display-only. It is user-editable upstream, so it
    -- must never be read for an authorization decision.
    nullif(btrim(coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      ''
    )), ''),
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'avatar_url', '')), ''),
    app.new_referral_code()
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();

-- Checked at onboarding step 1, before the user has an account, so it has to be
-- callable by anon. It returns only whether the code can still be used and who
-- to credit, never the code list.
create or replace function public.invite_code_status(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  found_owner uuid;
  inviter text;
begin
  select c.owner_id into found_owner
  from public.invite_codes c
  where c.code = upper(btrim(p_code))
    and (c.expires_at is null or c.expires_at > now())
    and c.redemption_count < c.max_redemptions;

  if not found then
    return jsonb_build_object('valid', false, 'inviter', null);
  end if;

  select coalesce(p.real_name, '@' || p.username) into inviter
  from public.profiles p
  where p.id = found_owner;

  return jsonb_build_object('valid', true, 'inviter', inviter);
end;
$$;

-- Redemption is separate from validation because sign-in is the last onboarding
-- step: the code is checked at step 1 and claimed once an account exists.
create or replace function public.redeem_invite(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  normalized text := upper(btrim(p_code));
  found_owner uuid;
begin
  if uid is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if exists (select 1 from public.invite_redemptions r where r.invited_user_id = uid) then
    return jsonb_build_object('redeemed', false, 'reason', 'already_redeemed');
  end if;

  -- Locked so two devices racing on the last seat of a code cannot both win.
  select c.owner_id into found_owner
  from public.invite_codes c
  where c.code = normalized
    and (c.expires_at is null or c.expires_at > now())
    and c.redemption_count < c.max_redemptions
  for update;

  if not found then
    return jsonb_build_object('redeemed', false, 'reason', 'invalid_code');
  end if;

  if found_owner = uid then
    return jsonb_build_object('redeemed', false, 'reason', 'own_code');
  end if;

  insert into public.invite_redemptions (code, invited_user_id, referrer_id)
  values (normalized, uid, found_owner);

  update public.invite_codes
  set redemption_count = redemption_count + 1
  where code = normalized;

  update public.profiles
  set referred_by = found_owner
  where id = uid and referred_by is null;

  -- No bonus here on purpose. Spec section 7 earns it when the invited builder
  -- publishes a listing, so phase 2 grants it and stamps bonus_granted_at.
  return jsonb_build_object('redeemed', true);
end;
$$;

-- Also pre-account: the username step runs before sign-in. Handles are public,
-- so answering this for anon leaks nothing a profile page would not.
create or replace function public.username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_username ~ '^[a-z0-9_]{1,20}$'
    and not exists (
      select 1 from public.profiles p where p.username = p_username
    );
$$;

-- Default privileges hand anon and authenticated full table access, so take it
-- back and grant only what each role genuinely needs.
revoke all on public.profiles from anon, authenticated;
revoke all on public.invite_codes from anon, authenticated;
revoke all on public.invite_redemptions from anon, authenticated;

grant select on public.profiles to authenticated;

-- Column-level grants are the only way to stop a client writing plan,
-- plan_expires_at, bonus_matches, referral_code or referred_by: row level
-- security can choose rows but not columns.
grant update (
  real_name,
  username,
  display_pref,
  photo_url,
  job,
  workplace,
  role_tags,
  test_devices,
  looking_for,
  app_interests,
  life_tags,
  own_words,
  visibility,
  links,
  theme_pref
) on public.profiles to authenticated;

revoke execute on function public.invite_code_status(text) from public;
revoke execute on function public.redeem_invite(text) from public;
revoke execute on function public.username_available(text) from public;

grant execute on function public.invite_code_status(text) to anon, authenticated;
grant execute on function public.username_available(text) to anon, authenticated;
grant execute on function public.redeem_invite(text) to authenticated;

alter table public.profiles enable row level security;
alter table public.invite_codes enable row level security;
alter table public.invite_redemptions enable row level security;

-- Only your own profile for now. Reading other builders means reading real
-- names and plans, which the spec only reveals after a match, so that read
-- arrives in a later phase as an explicit view rather than as a blanket policy.
create policy "Profiles are readable by their owner"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

-- WITH CHECK as well as USING, so a row cannot be handed to another account.
create policy "Profiles are editable by their owner"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- invite_codes and invite_redemptions get no policies at all. RLS with no
-- policy denies everything, and every legitimate access goes through the
-- functions above.

-- A code to open the beta with. The admin console in section 11 will mint the
-- rest; until then this is the only way in.
insert into public.invite_codes (code, max_redemptions)
values ('HEY100FOUND', 50);
