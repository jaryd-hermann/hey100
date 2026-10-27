-- Row-typed args cannot be passed from a CTE (`cannot cast record to apps`).
-- Score from scalars instead, and join the viewer's primary listing.

drop function if exists app.discover_fit_score(public.apps, public.apps);

create or replace function app.discover_fit_score(
  p_listing_category text,
  p_listing_platform text,
  p_listing_ideal jsonb,
  p_viewer_category text,
  p_viewer_platform text,
  p_viewer_ideal jsonb
)
returns integer
language sql
stable
set search_path = ''
as $$
  select
    case
      when p_viewer_category is null then 0
      else
        (case when lower(p_listing_category) = lower(p_viewer_category) then 6 else 0 end)
        + (
            select 2 * count(*)::integer
            from jsonb_array_elements_text(coalesce(p_viewer_ideal->'interests', '[]'::jsonb)) mine
            join jsonb_array_elements_text(coalesce(p_listing_ideal->'interests', '[]'::jsonb)) theirs
              on lower(btrim(mine)) = lower(btrim(theirs))
          )
        + case
            when
              lower(replace(replace(coalesce(p_listing_platform, ''), 'iPhone', 'ios'), 'iOS', 'ios'))
              like '%' || lower(replace(replace(coalesce(p_viewer_platform, ''), 'iPhone', 'ios'), 'iOS', 'ios')) || '%'
              or exists (
                select 1
                from jsonb_array_elements_text(coalesce(p_viewer_ideal->'devices', '[]'::jsonb)) mine
                join jsonb_array_elements_text(coalesce(p_listing_ideal->'devices', '[]'::jsonb)) theirs
                  on lower(replace(mine, 'iphone', 'ios')) like '%' || lower(replace(theirs, 'iphone', 'ios')) || '%'
                  or lower(replace(theirs, 'iphone', 'ios')) like '%' || lower(replace(mine, 'iphone', 'ios')) || '%'
              )
            then 1
            else 0
          end
    end;
$$;

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
        select a.category, a.platform, a.ideal_users
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
          app.discover_fit_score(
            a.category,
            a.platform,
            a.ideal_users,
            v.category,
            v.platform,
            v.ideal_users
          ) as fit
        from public.apps a
        left join viewer v on true
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
