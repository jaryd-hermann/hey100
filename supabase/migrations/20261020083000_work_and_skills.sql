-- Structured answers for the two "what keeps you busy" steps, plus skills.
--
-- Industry, department, company size and years of experience are deliberately
-- plain text rather than enums: the lists are product copy and will change, and
-- a client sending something off-list is a worse outcome than a free-text row.
-- They are classification data for matching, so none of them are in the public
-- `builders` view. Skills are, since choosing who to trade with is the reason
-- they exist.
alter table public.profiles
  add column industry text,
  add column company_size text,
  add column department text,
  add column years_experience text,
  add column skills text[] not null default '{}';

comment on column public.profiles.skills is
  'Self-declared, up to ten, shown on the profile. Section 9 User entity.';

grant update (
  industry,
  company_size,
  department,
  years_experience,
  skills
) on public.profiles to authenticated;

-- New columns go on the end, which is all a view replacement allows.
create or replace view public.builders with (security_invoker = false) as
select
  p.id,
  p.username,
  p.display_pref,
  p.photo_url,
  case when coalesce((p.visibility ->> 'job')::boolean, true) then p.job end as job,
  case when coalesce((p.visibility ->> 'workplace')::boolean, true) then p.workplace end
    as workplace,
  p.role_tags,
  p.looking_for,
  p.app_interests,
  p.life_tags,
  p.own_words,
  p.links,
  p.created_at,
  case
    when exists (
      select 1 from public.matches m
      where (m.user_a = p.id and m.user_b = (select auth.uid()))
         or (m.user_b = p.id and m.user_a = (select auth.uid()))
    )
    then p.real_name
  end as real_name,
  p.skills
from public.profiles p;
