-- UIXO — Postgres schema (targets Neon).
--
-- Mirrors the types in src/types.ts and src/lib/submissions.ts so the frontend can move
-- onto it without reshaping anything. Apply with:
--   psql "$DATABASE_URL" -f db/schema.sql

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- identity

create type user_role as enum ('member', 'curator');

create table if not exists users (
  id          uuid primary key default gen_random_uuid(),
  email       text unique not null,
  name        text not null,
  role        user_role not null default 'member',
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- content

create type pricing_tier as enum ('Free', 'Freemium', 'Paid');

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

-- ---------------------------------------------------------------- moderation

create type submission_status as enum ('pending', 'approved', 'declined');

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
