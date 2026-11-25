-- Team chat is broadcasts + DMs. Match threads were already on the
-- publication; these two (and reactions) were not, so a user sitting on the
-- other desk never saw a message until they reopened the app.

do $$
begin
  begin
    alter publication supabase_realtime add table public.team_broadcasts;
  exception
    when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.admin_dms;
  exception
    when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.chat_reactions;
  exception
    when duplicate_object then null;
  end;
end
$$;
