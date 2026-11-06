-- Supabase now rejects DELETE on storage.objects (statement trigger) so the
-- account-delete RPC never reached auth.users. Drop the media files through
-- the Storage API on the client; this function only removes the account.

create or replace function public.delete_my_account()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    return jsonb_build_object('status', 'blocked', 'reason', 'not_signed_in');
  end if;

  update public.feedback
  set from_user_id = null
  where from_user_id = me;

  delete from auth.users where id = me;

  return jsonb_build_object('status', 'deleted');
end;
$$;
