import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

type Sql = NeonQueryFunction<false, false>;

let sql: Sql | null = null;

export function db(): Sql {
  if (!sql) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) throw new Error('Database is not configured (DATABASE_URL missing)');
    sql = neon(url);
  }
  return sql;
}

/** Each successful referral moves the referrer ahead of one day's worth of signups. */
export const REFERRAL_BOOST_MS = 24 * 60 * 60 * 1000;

export async function positionOf(client: Sql, score: number, id: number) {
  const [row] = await client`
    SELECT count(*)::int AS ahead FROM waitlist WHERE (score, id) < (${score}, ${id})
  `;
  return (row?.ahead ?? 0) + 1;
}

export async function countAll(client: Sql) {
  const [row] = await client`SELECT count(*)::int AS n FROM waitlist`;
  return row?.n ?? 0;
}

const ENDPOINT = 'https://api.resend.com/emails';
const TIMEOUT_MS = 5000;
const SANDBOX_FROM = 'Hey100 <onboarding@resend.dev>';

export async function notifySignup({
  id,
  email,
  position,
  count,
  code,
  referredBy,
}: {
  id: number;
  email: string;
  position: number;
  count: number;
  code: string;
  referredBy: string | null;
}) {
  const key = process.env.NOTIFY_RESEND_KEY || process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_TO;
  if (!key || !to) return;

  const lines = [
    `Email: ${email}`,
    `Position: #${position} of ${count}`,
    `Referral code: ${code}`,
    referredBy ? `Referred by: ${referredBy}` : null,
  ].filter(Boolean);

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `waitlist-signup/${id}`,
      },
      body: JSON.stringify({
        from: process.env.NOTIFY_FROM || SANDBOX_FROM,
        to: [to],
        reply_to: email,
        subject: `Hey100 signup #${position}: ${email}`,
        text: lines.join('\n'),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) console.error('notify failed', res.status, await res.text().catch(() => ''));
  } catch (err) {
    console.error('notify error', err);
  }
}
