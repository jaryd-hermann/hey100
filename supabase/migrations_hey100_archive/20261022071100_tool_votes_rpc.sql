-- Vote through the database so a missing client session cannot drop the row.
-- Category lets the tools directory filter without hardcoding names.

alter table public.sponsored_tools
  add column if not exists category text not null default 'Tools';

update public.sponsored_tools
set category = case name
  when 'Expo' then 'Development'
  when 'Cursor' then 'Development'
  when 'Supabase' then 'Backend'
  when 'RevenueCat' then 'Monetization'
  when 'Resend' then 'Messaging'
  when 'OneSignal' then 'Messaging'
  when 'Granola' then 'Productivity'
  when 'Attio' then 'CRM'
  else category
end;

create or replace function public.vote_sponsored_tool(p_tool_id uuid, p_vote smallint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'Sign in to vote';
  end if;
  if p_vote = 0 then
    delete from public.sponsored_tool_votes
    where tool_id = p_tool_id and user_id = uid;
    return;
  end if;
  if p_vote not in (-1, 1) then
    raise exception 'Invalid vote';
  end if;
  insert into public.sponsored_tool_votes (tool_id, user_id, vote, updated_at)
  values (p_tool_id, uid, p_vote, now())
  on conflict (tool_id, user_id)
  do update set vote = excluded.vote, updated_at = now();
end;
$$;

revoke all on function public.vote_sponsored_tool(uuid, smallint) from public, anon;
grant execute on function public.vote_sponsored_tool(uuid, smallint) to authenticated;
