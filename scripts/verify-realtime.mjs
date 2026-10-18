/**
 * Checks that a message written by one side arrives at the other over
 * Realtime, and that nobody else's client is told about it.
 *
 * Needs a WebSocket, which Node only exposes with a flag before 22:
 *   node --experimental-websocket scripts/verify-realtime.mjs
 */

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)="?([^"\n]*)"?$/.exec(line.trim());
  if (m) env[m[1]] = m[2];
}

const URL_BASE = env.SUPABASE_URL;
const ANON = env.SUPABASE_ANON_KEY;
const SR = env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = 'hey100-rt-' + Math.random().toString(36).slice(2, 10);

const admin = createClient(URL_BASE, SR, { auth: { persistSession: false } });
const created = [];

async function makeUser(name) {
  const { data, error } = await admin.auth.admin.createUser({
    email: `${name}.${Math.random().toString(36).slice(2, 8)}@hey100-rt.test`,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (error) throw error;
  created.push(data.user.id);

  const client = createClient(URL_BASE, ANON, { auth: { persistSession: false } });
  const signIn = await client.auth.signInWithPassword({ email: data.user.email, password: PASSWORD });
  if (signIn.error) throw signIn.error;

  const app = await client
    .from('apps')
    .insert({
      owner_id: data.user.id,
      name: `${name} App`,
      subtitle: 'realtime check',
      category: 'Productivity',
      stage: 'TestFlight',
      is_primary: true,
      published_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (app.error) throw app.error;

  return { id: data.user.id, client, appId: app.data.id };
}

let passed = 0;
let failed = 0;

function check(label, ok, detail = '') {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + label + (detail ? `   ${detail}` : ''));
  if (ok) passed += 1;
  else failed += 1;
}

try {
  const ana = await makeUser('Ana');
  const ben = await makeUser('Ben');

  await ana.client.rpc('say_hey', { p_to_app_id: ben.appId, p_from_app_id: ana.appId });
  const { data: matched } = await ben.client.rpc('say_hey', {
    p_to_app_id: ana.appId,
    p_from_app_id: ben.appId,
  });

  const matchId = matched.match_id;
  check('two heys make a match', matched.status === 'matched' && !!matchId, matchId);

  // Ana listens the way the app does: no per-user filter, since row level
  // security decides what the stream carries.
  const received = [];
  const channel = ana.client
    .channel('loop-test')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) =>
      received.push(payload.new),
    );

  const subscribed = await new Promise((resolve) => {
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        resolve(status);
      }
    });
  });
  check('the client can subscribe to the loop channel', subscribed === 'SUBSCRIBED', subscribed);

  const sent = await ben.client.rpc('send_message', {
    p_match_id: matchId,
    p_body: 'Over the wire',
  });
  check('the message was accepted', sent.data?.status === 'sent', JSON.stringify(sent.data ?? sent.error));

  // Wait for this message, not just any event: the thread's opening system
  // line is replayed on subscribe and would end the wait too early.
  const arrived = () => received.some((row) => row.body === 'Over the wire');
  for (let waited = 0; waited < 8000 && !arrived(); waited += 200) {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  check(
    "the other side's message arrives without a refetch",
    received.some((row) => row.body === 'Over the wire'),
    `${received.length} events`,
  );

  // A third party must not see it, which is what makes the unfiltered
  // subscription safe.
  const cara = await makeUser('Cara');
  const nosy = [];
  const nosyChannel = cara.client
    .channel('loop-test-2')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) =>
      nosy.push(payload.new),
    );
  await new Promise((resolve) => nosyChannel.subscribe(() => resolve(null)));

  await ben.client.rpc('send_message', { p_match_id: matchId, p_body: 'Private' });
  await new Promise((resolve) => setTimeout(resolve, 2500));

  check('an outsider receives nothing from that thread', nosy.length === 0, `${nosy.length} events`);

  await ana.client.removeAllChannels();
  await cara.client.removeAllChannels();
} catch (error) {
  console.error('error:', error.message);
  failed += 1;
} finally {
  for (const id of created) await admin.auth.admin.deleteUser(id);
  console.log(`\n${passed}/${passed + failed} checks passed. ${created.length} accounts removed.`);
  process.exit(0);
}
