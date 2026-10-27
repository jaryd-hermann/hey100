-- Discover can rank the deck, not only return newest first.
--
-- Best fit scores the viewer's primary listing against each published card
-- (same category, overlapping interests, same device). Most liked is hey
-- count. Newest stays published_at. listing_card now carries that count so
-- the client can show it and keep a local sort honest.

create or replace function app.listing_card(p_app_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'app', to_jsonb(a),
    'media', coalesce(
      (
        select jsonb_agg(to_jsonb(m) order by m.position)
        from public.app_media m
        where m.app_id = a.id
      ),
      '[]'::jsonb
    ),
    'prompts', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'slot', ap.slot,
            'prompt_id', ap.prompt_id,
            'label', pr.label,
            'tag', pr.tag,
            'answer', ap.answer
          )
          order by ap.slot
        )
        from public.app_prompts ap
        join public.prompts pr on pr.id = ap.prompt_id
        where ap.app_id = a.id
      ),
      '[]'::jsonb
    ),
    'builder', (select to_jsonb(b) from public.builders b where b.id = a.owner_id),
    'hey_count', (
      select count(*)::integer
      from public.heys h
      where h.to_app_id = a.id
    )
  )
  from public.apps a
  where a.id = p_app_id;
$$;

create or replace function app.discover_fit_score(p_listing public.apps, p_viewer public.apps)
returns integer
language sql
stable
set search_path = ''
as $$
  select
    case
      when p_viewer.id is null then 0
      else
        (case when lower(p_listing.category) = lower(p_viewer.category) then 6 else 0 end)
        + (
            select 2 * count(*)::integer
            from jsonb_array_elements_text(coalesce(p_viewer.ideal_users->'interests', '[]'::jsonb)) mine
            join jsonb_array_elements_text(coalesce(p_listing.ideal_users->'interests', '[]'::jsonb)) theirs
              on lower(btrim(mine)) = lower(btrim(theirs))
          )
        + case
            when
              lower(replace(replace(p_listing.platform, 'iPhone', 'ios'), 'iOS', 'ios'))
              like '%' || lower(replace(replace(p_viewer.platform, 'iPhone', 'ios'), 'iOS', 'ios')) || '%'
              or exists (
                select 1
                from jsonb_array_elements_text(coalesce(p_viewer.ideal_users->'devices', '[]'::jsonb)) mine
                join jsonb_array_elements_text(coalesce(p_listing.ideal_users->'devices', '[]'::jsonb)) theirs
                  on lower(replace(mine, 'iphone', 'ios')) like '%' || lower(replace(theirs, 'iphone', 'ios')) || '%'
                  or lower(replace(theirs, 'iphone', 'ios')) like '%' || lower(replace(mine, 'iphone', 'ios')) || '%'
              )
            then 1
            else 0
          end
    end;
$$;

drop function if exists public.discover_deck(integer);

create or replace function public.discover_deck(
  p_limit integer default 30,
  p_sort text default 'best_fit'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  sort text := case
    when lower(coalesce(p_sort, 'best_fit')) in ('most_liked', 'newest', 'best_fit')
      then lower(p_sort)
    else 'best_fit'
  end;
begin
  if me is null then
    return '[]'::jsonb;
  end if;

  return coalesce(
    (
      with viewer as (
        select a.*
        from public.apps a
        where a.owner_id = me
        order by a.is_primary desc, a.published_at desc nulls last
        limit 1
      ),
      eligible as (
        select
          a.id,
          a.published_at,
          (select count(*)::integer from public.heys h where h.to_app_id = a.id) as hey_count,
          app.discover_fit_score(a, (select v from viewer v)) as fit
        from public.apps a
        where a.published_at is not null
          and a.owner_id <> me
          and not exists (
            select 1 from public.passes p where p.user_id = me and p.app_id = a.id
          )
          and not exists (
            select 1 from public.heys h where h.from_user_id = me and h.to_app_id = a.id
          )
          and not exists (
            select 1 from public.matches m
            where (m.user_a = me and m.user_b = a.owner_id)
               or (m.user_b = me and m.user_a = a.owner_id)
          )
      )
      select jsonb_agg(app.listing_card(d.id) order by
        case
          when sort = 'most_liked' then d.hey_count
          when sort = 'newest' then extract(epoch from d.published_at)::integer
          else d.fit
        end desc,
        d.published_at desc
      )
      from (
        select *
        from eligible
        order by
          case
            when sort = 'most_liked' then hey_count
            when sort = 'newest' then extract(epoch from published_at)::integer
            else fit
          end desc,
          published_at desc
        limit greatest(1, least(coalesce(p_limit, 30), 100))
      ) d
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.discover_deck(integer, text) from public;
revoke execute on function public.discover_deck(integer, text) from anon;
grant execute on function public.discover_deck(integer, text) to authenticated;
