-- The points users earn are called Block Points. The stored column stays
-- `karma`; only the push a builder sees after sending feedback changes.

create or replace function app.on_feedback_push()
returns trigger
language plpgsql
security definer
set search_path = app, public
as $$
declare
  giver text;
  receiver text;
  app_title text;
  they_gave boolean;
  karma integer;
begin
  giver := app.first_name(new.from_user_id);
  receiver := app.first_name(new.to_user_id);
  app_title := app.app_name(new.app_id);
  they_gave := app.feedback_unlocked(new.match_id, new.to_user_id);
  karma := app.feedback_field_karma(
    new.stars,
    new.summary,
    new.keep,
    new.confusion,
    new.best_moment,
    new.bug,
    new.bug_shot,
    new.bug_shots,
    new.video_path,
    new.price
  );

  perform app.enqueue_push(
    new.from_user_id,
    'feedback_thanks',
    'feedback_thanks:' || new.id::text,
    'Thanks — +' || karma || ' Block Points',
    'You shared feedback with ' || receiver,
    '/chat/' || new.match_id::text,
    jsonb_build_object('matchId', new.match_id, 'karma', karma)
  );

  if they_gave then
    perform app.enqueue_push(
      new.to_user_id,
      'feedback',
      'feedback:' || new.match_id::text || ':' || new.from_user_id::text,
      'You have feedback! Check it out here',
      giver || ' left feedback on ' || app_title,
      '/chat/' || new.match_id::text,
      jsonb_build_object('matchId', new.match_id)
    );
  else
    perform app.enqueue_push(
      new.to_user_id,
      'feedback',
      'feedback:' || new.match_id::text || ':' || new.from_user_id::text,
      'Share your feedback with ' || giver || ' to unlock it',
      giver || ' left feedback on ' || app_title,
      '/feedback-form?matchId=' || new.match_id::text,
      jsonb_build_object('matchId', new.match_id)
    );
  end if;

  return new;
end;
$$;
