-- Baseline for Hey100.
--
-- Two conventions every later migration follows:
--   1. Internal helpers live in `app`, which is not exposed to the Data API.
--      Anything in `public` is reachable by the anon and authenticated roles,
--      so only tables and functions meant as API surface belong there.
--   2. Every table in `public` enables row level security immediately. With
--      RLS on and no policy, the table denies everything, so the safe state is
--      the default and each policy is an explicit, reviewable grant.

create schema if not exists app;

revoke all on schema app from anon, authenticated;

comment on schema app is
  'Internal helpers and private tables. Never exposed through the Data API.';

-- Keeps `updated_at` honest without the client having to set it.
create or replace function app.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- The prompt library. Reference data rather than user data: every builder picks
-- from the same list, so it is world-readable and only ever written by a
-- migration.
create table public.prompts (
  id text primary key,
  tag text not null check (tag in ('Product', 'Audience', 'Story', 'Feedback')),
  label text not null,
  sort_order smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.prompts is
  'Prompt library offered when a builder writes a listing. Seeded by migration.';

create unique index prompts_sort_order_key on public.prompts (sort_order);

create trigger prompts_touch_updated_at
  before update on public.prompts
  for each row execute function app.touch_updated_at();

alter table public.prompts enable row level security;

-- Readable before sign-in, because the public listing pages on hey100.com
-- render prompt labels too.
create policy "Prompts are readable by everyone"
  on public.prompts
  for select
  to anon, authenticated
  using (true);

insert into public.prompts (id, tag, label, sort_order) values
  ('honest', 'Feedback', 'The honest thing I need feedback on…',     1),
  ('love',   'Audience', 'You''ll love this app if…',                2),
  ('how',    'Product',  'In 30 seconds, here''s how it works:',     3),
  ('proud',  'Product',  'The feature I''m most proud of…',          4),
  ('works',  'Feedback', 'I''ll know this app works when…',          5),
  ('dont',   'Audience', 'Don''t download this if…',                 6),
  ('green',  'Audience', 'Green flag in a user:',                    7),
  ('why',    'Story',    'Why I built this…',                        8),
  ('first',  'Story',    'Our first user said…',                     9),
  ('weird',  'Story',    'The weirdest thing I learned building it…', 10),
  ('next',   'Product',  'What''s coming next…',                     11),
  ('stuck',  'Feedback', 'Where people get stuck…',                  12);
