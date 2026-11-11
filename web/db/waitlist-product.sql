-- Product link and review consent collected by the landing-page waitlist.
alter table waitlist
  add column if not exists product_url text,
  add column if not exists ok_video boolean not null default true,
  add column if not exists ok_newsletter boolean not null default true;
