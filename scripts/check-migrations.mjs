#!/usr/bin/env node
/**
 * Applies supabase/migrations/*.sql to PGlite, then runs smoke checks on the
 * access rules. Catches SQL errors and broken gates before anything reaches
 * the real project.
 *
 *   node scripts/check-migrations.mjs
 */

import { loadSchema } from './lib/schema-db.mjs';

const db = await loadSchema();

/* ---------------------------------------------------------------- */
/* Smoke checks: run as `authenticated` with a JWT sub, like PostgREST */
/* ---------------------------------------------------------------- */

let failures = 0;

async function as(userId, sql) {
  await db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub', '${userId ?? ''}', false);`);
  try {
    return (await db.query(sql)).rows;
  } finally {
    await db.exec('reset role;');
  }
}

function check(label, ok) {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) failures += 1;
}

const one = async (sql) => (await db.query(sql)).rows[0];

// Founder + two members of the $5–10k group + one $25–50k founder.
const jaryd = (await one(`insert into auth.users (email) values ('hermannjaryd@gmail.com') returning id`)).id;
const tom = (await one(`insert into auth.users (email, raw_user_meta_data) values ('tom@test.dev', '{"full_name":"Tom"}') returning id`)).id;
const priya = (await one(`insert into auth.users (email, raw_user_meta_data) values ('priya@test.dev', '{"full_name":"Priya"}') returning id`)).id;
const kenji = (await one(`insert into auth.users (email, raw_user_meta_data) values ('kenji@test.dev', '{"full_name":"Kenji"}') returning id`)).id;

check('founder flagged official + admin', (await one(`select is_official and is_admin as ok from profiles where id = '${jaryd}'`)).ok);
check('every user gets an invite code', Number((await one(`select count(*) as n from invite_codes`)).n) === 4);
check(
  'new users get the Jaryd thread with 4 welcome messages',
  Number((await one(`select count(*) as n from dm_messages m join dm_threads t on t.id = m.thread_id where t.is_official and (t.user_a = '${tom}' or t.user_b = '${tom}')`)).n) === 4,
);

await db.exec(`
  insert into revenue_connections (user_id, provider, status, band_id, mrr_cents, verified_at) values
    ('${tom}', 'stripe', 'verified', 'b5_10k', 840000, now()),
    ('${priya}', 'stripe', 'verified', 'b5_10k', 530000, now()),
    ('${kenji}', 'revenuecat', 'verified', 'b25_50k', 3100000, now());
  update profiles set plan = 'member' where id in ('${tom}', '${priya}');
  update profiles set plan = 'pro' where id = '${kenji}';
`);

const g5 = (await one(`insert into groups (band_id) values ('b5_10k') returning id`)).id;
const g25 = (await one(`insert into groups (band_id) values ('b25_50k') returning id`)).id;
await db.exec(`
  insert into memberships (user_id, group_id, is_primary) values
    ('${tom}', '${g5}', true), ('${priya}', '${g5}', true), ('${kenji}', '${g25}', true);
`);
const q5 = (await one(`insert into daily_questions (group_id, question_date, text, source) values ('${g5}', app.group_today('${g5}'), 'What channel did you stop doing?', 'bank') returning id`)).id;
const q25 = (await one(`insert into daily_questions (group_id, question_date, text, source) values ('${g25}', app.group_today('${g25}'), 'What is your churn this month?', 'bank') returning id`)).id;
await db.exec(`
  insert into messages (group_id, author_id, day_question_id, kind, body) values
    ('${g5}', '${priya}', '${q5}', 'answer', 'Weekly newsletter.'),
    ('${g25}', '${kenji}', '${q25}', 'answer', '3.1%. Added a pause option.');
`);

check('group label reads "$5–10k · All"', (await one(`select app.group_label('${g5}') as l`)).l === '$5–10k · All');
check('unanswered member sees 0 of today\'s answers', (await as(tom, `select id from messages where group_id = '${g5}'`)).length === 0);
check('member cannot see a group above without answering', (await as(priya, `select id from messages where group_id = '${g25}'`)).length === 0);

await db.exec(`insert into messages (group_id, author_id, day_question_id, kind, body) values ('${g5}', '${tom}', '${q5}', 'answer', 'Paid Reddit ads.')`);
check('answering unlocks today (2 answers visible)', (await as(tom, `select id from messages where group_id = '${g5}'`)).length === 2);
check('Member plan cannot read a higher group even after answering', (await as(tom, `select id from messages where group_id = '${g25}'`)).length === 0);

await db.exec(`update profiles set plan = 'pro' where id = '${tom}'`);
check('Pro without a peek still sees nothing above', (await as(tom, `select id from messages where group_id = '${g25}'`)).length === 0);
check('Pro is 2 bands below $25–50k (in range)', Number((await one(`select app.bands_above('${tom}', '${g25}') as n`)).n) === 2);
await db.exec(`insert into peeks (user_id, group_id, question_date, source) values ('${tom}', '${g25}', app.group_today('${g25}'), 'weekly')`);
check('Pro with a peek reads today above', (await as(tom, `select id from messages where group_id = '${g25}'`)).length === 1);
check('higher group never reads a lower group', (await as(kenji, `select id from messages where group_id = '${g5}'`)).length === 0);

await db.exec(`update profiles set plan = 'none' where id = '${tom}'`);
check('lapsed plan sees only their own messages', (await as(tom, `select id from messages where group_id = '${g5}'`)).length === 1);
await db.exec(`update profiles set plan = 'pro' where id = '${tom}'`);

check('profile_cards hides exact MRR by default', (await as(priya, `select exact_mrr_cents from profile_cards where id = '${tom}'`))[0]?.exact_mrr_cents == null);
check('nobody reads another user\'s revenue row', (await as(priya, `select * from revenue_connections where user_id = '${tom}'`)).length === 0);
check('revenue_secrets is closed to clients', await as(tom, `select * from revenue_secrets`).then(() => false, () => true));
check('can_dm within a shared group', (await one(`select app.can_dm('${tom}', '${priya}') as ok`)).ok);
check('cannot DM someone in a group above', !(await one(`select app.can_dm('${tom}', '${kenji}') as ok`)).ok);
check('anyone can DM the official account', (await one(`select app.can_dm('${kenji}', '${jaryd}') as ok`)).ok);
await db.exec(`insert into user_blocks (blocker_id, blocked_id) values ('${priya}', '${tom}')`);
check('a block stops DMs both ways', !(await one(`select app.can_dm('${tom}', '${priya}') as ok`)).ok);

const meRow = (await as(tom, `select public.me() as me`))[0].me;
check('me() returns band, plan and primary group', meRow.band_id === 'b5_10k' && meRow.plan === 'pro' && meRow.primary_group_id === g5);
check('me() counts the weekly peek', meRow.entitlements.weekly_peeks_used === 1);

const stats = (await as(tom, `select * from group_stats where group_id = '${g5}'`))[0];
check('group_stats uses band midpoints under 5 members', Number(stats.combined_mrr_cents) === 1500000 && stats.answers_today === 2);

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nAll migrations applied and access checks passed.');
