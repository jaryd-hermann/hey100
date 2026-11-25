#!/usr/bin/env node
/**
 * Writes src/types/supabase.ts from the local migrations (PGlite), in the
 * same shape as `supabase gen types`. Lets the app typecheck against schema
 * that has not been pushed yet; `npm run db:types` replaces it from the
 * linked project once it has.
 *
 *   node scripts/gen-types-local.mjs
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { loadSchema } from './lib/schema-db.mjs';

const OUT = join(process.cwd(), 'src/types/supabase.ts');
const db = await loadSchema({ quiet: true });

const STRING = new Set([
  'text', 'varchar', 'bpchar', 'char', 'name', 'uuid', 'date', 'time', 'timetz', 'timestamp',
  'timestamptz', 'interval', 'inet', 'cidr', 'citext', 'bytea', 'vector',
]);
const NUMBER = new Set(['int2', 'int4', 'int8', 'float4', 'float8', 'numeric', 'oid']);

const types = new Map(
  (
    await db.query(`
      select t.oid, t.typname, t.typtype, t.typelem, t.typrelid, c.relname as relname
      from pg_type t
      left join pg_class c on c.oid = t.typrelid
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname in ('pg_catalog', 'public', 'extensions')
    `)
  ).rows.map((r) => [r.oid, r]),
);

function tsType(oid) {
  const t = types.get(oid);
  if (!t) return 'unknown';
  if (t.typname.startsWith('_') && t.typelem) return `${tsType(t.typelem)}[]`;
  if (STRING.has(t.typname)) return 'string';
  if (NUMBER.has(t.typname)) return 'number';
  if (t.typname === 'bool') return 'boolean';
  if (t.typname === 'json' || t.typname === 'jsonb') return 'Json';
  if (t.typname === 'void') return 'undefined';
  if (t.typtype === 'e') return `Database["public"]["Enums"]["${t.typname}"]`;
  if (t.typrelid && t.relname) return `Database["public"]["Tables"]["${t.relname}"]["Row"]`;
  return 'unknown';
}

const columns = (
  await db.query(`
    select c.relname, c.relkind, a.attname, a.atttypid, a.attnotnull, a.atthasdef,
           a.attidentity, a.attgenerated
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid
    where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm')
      and a.attnum > 0 and not a.attisdropped
    order by c.relname, a.attname
  `)
).rows;

const relations = new Map();
for (const col of columns) {
  if (!relations.has(col.relname)) relations.set(col.relname, { kind: col.relkind, cols: [] });
  relations.get(col.relname).cols.push(col);
}

const indent = (n) => ' '.repeat(n);
const lines = (cols, fn) => cols.map(fn).filter(Boolean).join('\n');

function tableBlock(name, { cols }) {
  const row = lines(cols, (c) => `${indent(10)}${c.attname}: ${tsType(c.atttypid)}${c.attnotnull ? '' : ' | null'}`);
  const insert = lines(cols, (c) => {
    const t = `${tsType(c.atttypid)}${c.attnotnull ? '' : ' | null'}`;
    if (c.attgenerated === 's' || c.attidentity === 'a') return `${indent(10)}${c.attname}?: never`;
    const optional = !c.attnotnull || c.atthasdef || c.attidentity === 'd';
    return `${indent(10)}${c.attname}${optional ? '?' : ''}: ${t}`;
  });
  const update = lines(cols, (c) => {
    if (c.attgenerated === 's' || c.attidentity === 'a') return `${indent(10)}${c.attname}?: never`;
    return `${indent(10)}${c.attname}?: ${tsType(c.atttypid)}${c.attnotnull ? '' : ' | null'}`;
  });
  return `${indent(6)}${name}: {
${indent(8)}Row: {
${row}
${indent(8)}}
${indent(8)}Insert: {
${insert}
${indent(8)}}
${indent(8)}Update: {
${update}
${indent(8)}}
${indent(8)}Relationships: []
${indent(6)}}`;
}

function viewBlock(name, { cols }) {
  const row = lines(cols, (c) => `${indent(10)}${c.attname}: ${tsType(c.atttypid)} | null`);
  return `${indent(6)}${name}: {
${indent(8)}Row: {
${row}
${indent(8)}}
${indent(8)}Relationships: []
${indent(6)}}`;
}

const tables = [...relations].filter(([, r]) => r.kind === 'r' || r.kind === 'p');
const views = [...relations].filter(([, r]) => r.kind === 'v' || r.kind === 'm');

const functions = (
  await db.query(`
    select p.proname, p.prorettype, p.proretset, p.pronargdefaults,
           p.proargtypes::oid[] as argtypes, p.proallargtypes, p.proargmodes, p.proargnames
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and p.prorettype <> 'trigger'::regtype
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
    order by p.proname
  `)
).rows;

function functionBlock(fn) {
  const inTypes = fn.argtypes ?? [];
  const names = fn.proargnames ?? [];
  const modes = fn.proargmodes ?? inTypes.map(() => 'i');
  const allTypes = fn.proallargtypes ?? inTypes;
  const firstDefault = inTypes.length - fn.pronargdefaults;

  const args = [];
  const tableCols = [];
  let inIndex = 0;
  modes.forEach((mode, i) => {
    const name = names[i] || `arg${i}`;
    if (mode === 'i' || mode === 'b' || mode === 'v') {
      args.push(`${name}${inIndex >= firstDefault ? '?' : ''}: ${tsType(allTypes[i])}`);
      inIndex += 1;
    } else if (mode === 't' || mode === 'o') {
      tableCols.push(`${name}: ${tsType(allTypes[i])}`);
    }
  });

  let returns = tableCols.length ? `{ ${tableCols.join('; ')} }` : tsType(fn.prorettype);
  if (fn.proretset) returns = `${returns}[]`;
  const argType = args.length ? `{ ${args.join('; ')} }` : 'never';
  return `${indent(6)}${fn.proname}: { Args: ${argType}; Returns: ${returns} }`;
}

const enums = (
  await db.query(`
    select t.typname, array_agg(e.enumlabel order by e.enumsortorder) as labels
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
    group by t.typname
    order by t.typname
  `)
).rows;

const empty = `{\n${indent(6)}[_ in never]: never\n${indent(4)}}`;
const block = (items) => (items.length ? `{\n${items.join('\n')}\n${indent(4)}}` : empty);

const out = `// Generated by scripts/gen-types-local.mjs from supabase/migrations.
// \`npm run db:types\` overwrites this from the linked project.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: ${block(tables.map(([n, r]) => tableBlock(n, r)))}
    Views: ${block(views.map(([n, r]) => viewBlock(n, r)))}
    Functions: ${block(functions.map(functionBlock))}
    Enums: ${block(enums.map((e) => `${indent(6)}${e.typname}: ${e.labels.map((l) => JSON.stringify(l)).join(' | ')}`))}
    CompositeTypes: ${empty}
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof (PublicSchema["Tables"] & PublicSchema["Views"])> =
  (PublicSchema["Tables"] & PublicSchema["Views"])[T] extends { Row: infer R } ? R : never

export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]

export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]

export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]
`;

writeFileSync(OUT, out);
console.log(`Wrote ${OUT}: ${tables.length} tables, ${views.length} views, ${functions.length} functions.`);
