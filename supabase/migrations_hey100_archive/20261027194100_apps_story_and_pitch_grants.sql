-- Story, store rating, and pitch columns were added after the original apps
-- grants. The client already writes them on publish, which PostgREST rejects
-- as permission denied for column.

grant insert (
  problem_of,
  problem_for,
  pricing_model,
  price_from,
  onboarding,
  store_rating,
  store_rating_count,
  pitch_path,
  pitch_seconds
),
update (
  problem_of,
  problem_for,
  pricing_model,
  price_from,
  onboarding,
  store_rating,
  store_rating_count,
  pitch_path,
  pitch_seconds
) on public.apps to authenticated;
