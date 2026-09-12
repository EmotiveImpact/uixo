-- UIXO — Postgres schema (targets Neon).
--
-- Mirrors the types in src/types.ts and src/lib/submissions.ts so the frontend can move
-- onto it without reshaping anything. Safe to re-run. Apply with:
--   psql "$DATABASE_URL" -f db/schema.sql

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- identity

do $$ begin
  create type user_role as enum ('member', 'curator');
exception when duplicate_object then null;
end $$;

create table if not exists users (
  id          uuid primary key default gen_random_uuid(),
  email       text unique not null,
  name        text not null,
  role        user_role not null default 'member',
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- content

do $$ begin
  create type pricing_tier as enum ('Free', 'Freemium', 'Paid');
exception when duplicate_object then null;
end $$;

create table if not exists resources (
  -- Text id, not a uuid: it is the public URL (/r/lucide) and the thumbnail filename.
  id           text primary key,
  name         text not null,
  description  text not null,
  category     text not null,
  subcategory  text not null,
  tags         text[] not null default '{}',
  pricing      pricing_tier not null,
  creator      text not null,
  formats      text[] not null default '{}',
  aliases      text[] not null default '{}',
  added_order  integer not null,
  -- Editorial only: "we reach for this", never "someone paid" and never "this is
  -- popular". Paid placement lives in `sponsorships`; popularity, if it is ever
  -- measured, belongs in its own sort. Do not overload this column.
  featured     boolean not null default false,
  url          text not null,
  last_checked date not null default current_date,
  published    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists resources_category_idx on resources (category);
create index if not exists resources_added_order_idx on resources (added_order desc);
create index if not exists resources_tags_idx on resources using gin (tags);

create table if not exists categories (
  name  text primary key,
  icon  text not null,
  sub   text[] not null default '{}',
  position integer not null default 0
);

create table if not exists collections (
  slug          text primary key,
  name          text not null,
  tagline       text not null,
  description   text not null,
  featured      boolean not null default false,
  position      integer not null default 0
);

create table if not exists collection_resources (
  collection_slug text not null references collections (slug) on delete cascade,
  resource_id     text not null references resources (id) on delete cascade,
  position        integer not null default 0,
  primary key (collection_slug, resource_id)
);

-- ---------------------------------------------------------------- user data

create table if not exists lists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users (id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists list_resources (
  list_id     uuid not null references lists (id) on delete cascade,
  resource_id text not null references resources (id) on delete cascade,
  added_at    timestamptz not null default now(),
  primary key (list_id, resource_id)
);

-- The unit of sync is the whole snapshot the app already holds (`favourites`, `c…`).
-- One row per account; membership is inside the JSON so we never fight uuid vs text ids.
create table if not exists user_lists (
  user_id     uuid primary key references users (id) on delete cascade,
  payload     jsonb not null,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- moderation

do $$ begin
  create type submission_status as enum ('pending', 'approved', 'declined');
exception when duplicate_object then null;
end $$;

create table if not exists submissions (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  url           text not null,
  note          text not null default '',
  status        submission_status not null default 'pending',
  -- Null for anonymous submissions; the frontend already handles that case.
  submitted_by  uuid references users (id) on delete set null,
  submitted_at  timestamptz not null default now(),
  reviewed_by   uuid references users (id) on delete set null,
  reviewed_at   timestamptz
);

create index if not exists submissions_status_idx on submissions (status, submitted_at desc);

create table if not exists link_reports (
  id           uuid primary key default gen_random_uuid(),
  resource_id  text not null references resources (id) on delete cascade,
  reason       text not null default '',
  reported_by  uuid references users (id) on delete set null,
  reported_at  timestamptz not null default now(),
  resolved     boolean not null default false,
  resolved_at  timestamptz
);

-- One open report per resource; resolved ones are kept for history.
create unique index if not exists link_reports_open_idx
  on link_reports (resource_id) where not resolved;

-- ---------------------------------------------------------------- commercial
--
-- Kept structurally apart from `resources.featured` on purpose. The directory's
-- only real asset is that its recommendations are believed, and the way
-- directories lose that is by letting paid placement quietly become editorial
-- endorsement. Separate tables make the two impossible to confuse: a query for
-- what is featured cannot accidentally return what is sponsored.

do $$ begin
  create type placement_slot as enum ('landing_banner', 'browse_inline', 'newsletter');
exception when duplicate_object then null;
end $$;

create table if not exists sponsorships (
  id           uuid primary key default gen_random_uuid(),
  resource_id  text not null references resources (id) on delete cascade,
  -- Who is paying, which is not always the resource's creator.
  sponsor_name text not null,
  slot         placement_slot not null,
  starts_on    date not null,
  -- Inclusive. A run must be a real interval, not a point or a reversal.
  ends_on      date not null,
  -- Minor units (pence), to keep money out of floating point.
  amount_minor integer not null default 0,
  currency     char(3) not null default 'GBP',
  -- Rolled up from placement_events so the common read is one row, not a count.
  impressions  bigint not null default 0,
  clicks       bigint not null default 0,
  created_at   timestamptz not null default now(),

  constraint sponsorships_real_interval check (ends_on >= starts_on),
  constraint sponsorships_non_negative check (amount_minor >= 0)
);

-- One paid placement per slot at a time: overlapping runs would mean selling the
-- same space twice, which is the kind of mistake you only notice from a complaint.
create extension if not exists btree_gist;
alter table sponsorships
  drop constraint if exists sponsorships_no_overlap;
alter table sponsorships
  add constraint sponsorships_no_overlap
  exclude using gist (
    slot with =,
    daterange(starts_on, ends_on, '[]') with &&
  );

create index if not exists sponsorships_active_idx on sponsorships (slot, starts_on, ends_on);

-- Raw events, so the rolled-up counters above can always be rebuilt and a sponsor
-- can be shown a day-by-day breakdown rather than one number they have to trust.
do $$ begin
  create type placement_event as enum ('impression', 'click');
exception when duplicate_object then null;
end $$;

create table if not exists placement_events (
  id             bigserial primary key,
  sponsorship_id uuid not null references sponsorships (id) on delete cascade,
  kind           placement_event not null,
  occurred_at    timestamptz not null default now()
);

create index if not exists placement_events_rollup_idx
  on placement_events (sponsorship_id, kind, occurred_at);

-- What the app asks for when rendering: at most one row per slot, today.
create or replace view active_sponsorships as
select s.*, r.name as resource_name, r.url as resource_url
from sponsorships s
join resources r on r.id = s.resource_id
where current_date between s.starts_on and s.ends_on
  and r.published;
