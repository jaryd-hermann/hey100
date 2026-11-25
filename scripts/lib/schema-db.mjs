/**
 * In-process Postgres (PGlite) with stand-ins for the Supabase pieces it lacks
 * (auth, storage, roles, realtime publication). pg_net and pg_cron are absent;
 * the migrations already guard those calls.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite-pgvector';

const DIR = join(process.cwd(), 'supabase/migrations');

const SUPABASE_STUBS = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;

create schema extensions;
create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;

create schema storage;
create table storage.buckets (
  id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid
);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
$$;
grant usage on schema storage to anon, authenticated;
grant execute on function storage.foldername(text) to anon, authenticated;

create publication supabase_realtime;
`;


async function exec(db, sql, label) {
  try {
    await db.exec(sql);
  } catch (error) {
    console.error(`\n✗ ${label}\n  ${error.message}`);
    if (error.position) {
      const pos = Number(error.position);
      console.error(`  near: …${sql.slice(Math.max(0, pos - 160), pos + 80).replace(/\n/g, '\n  ')}…`);
    }
    process.exit(1);
  }
}

/** Fresh in-memory Postgres with every migration applied. */
export async function loadSchema({ quiet = false } = {}) {
  const db = new PGlite({ extensions: { vector } });
  await exec(db, SUPABASE_STUBS, 'supabase stubs');
  const files = readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    await exec(db, readFileSync(join(DIR, file), 'utf8'), file);
    if (!quiet) console.log(`✓ ${file}`);
  }
  return db;
}
