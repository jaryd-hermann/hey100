-- Ten more prompts, so a listing can say what it does and why it is different
-- rather than only how it feels. Appended, so the twelve already answered keep
-- their place in the picker.
insert into public.prompts (id, tag, label, sort_order) values
  ('magic',     'Product',  'The magic moment is…',                     13),
  ('solves',    'Product',  'I solve the problem of…',                  14),
  ('different', 'Product',  'My app is different because…',             15),
  ('skipping',  'Product',  'What I''m deliberately not building…',     16),
  ('premise',   'Story',    'The premise is…',                          17),
  ('strength',  'Story',    'My strength as a builder is…',             18),
  ('hardest',   'Story',    'The hardest part to get right…',           19),
  ('hearing',   'Story',    'What I keep hearing from users…',          20),
  ('who',       'Audience', 'Who this is really for…',                  21),
  ('try',       'Feedback', 'Try this first:',                          22)
on conflict (id) do update
  set tag = excluded.tag, label = excluded.label, sort_order = excluded.sort_order;
