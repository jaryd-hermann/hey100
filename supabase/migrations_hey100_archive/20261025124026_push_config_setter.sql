-- Lets the service role write the drain URL once, without exposing app.push_config.

create or replace function public.admin_set_push_config(p_url text, p_secret text)
returns void
language sql
security definer
set search_path = app
as $$
  update app.push_config
  set function_url = p_url,
      drain_secret = p_secret
  where id = 1;
$$;

revoke all on function public.admin_set_push_config(text, text) from public;
grant execute on function public.admin_set_push_config(text, text) to service_role;
