import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';

import { countAll, db, notifySignup, positionOf, REFERRAL_BOOST_MS } from '@/lib/waitlist';

export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RATE_LIMIT_PER_MINUTE = 10;

function json(status: number, body: unknown) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function random(n: number) {
  return (
    randomBytes(n * 2)
      .toString('base64url')
      .replace(/[^a-z0-9]/gi, '')
      .toLowerCase()
      .slice(0, n) || 'x'.repeat(n)
  );
}

function cleanCode(v: unknown) {
  return String(v || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 32);
}

export async function GET(req: Request) {
  try {
    const sql = db();
    const code = cleanCode(new URL(req.url).searchParams.get('code'));
    const body: { count: number; position?: number } = { count: await countAll(sql) };
    if (code) {
      const [row] = await sql`SELECT id, score FROM waitlist WHERE code = ${code}`;
      if (row) body.position = await positionOf(sql, Number(row.score), Number(row.id));
    }
    return json(200, body);
  } catch (err) {
    console.error('waitlist error', err);
    return json(500, { error: 'Something went wrong. Please try again.' });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    if (body.website) return json(400, { error: 'Invalid submission.' });

    const email = String(body.email || '')
      .trim()
      .toLowerCase();
    if (email.length > 254 || !EMAIL_RE.test(email)) {
      return json(400, { error: 'Enter a valid email address.' });
    }

    const sql = db();
    const ip =
      (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
    const [{ hits }] = await sql`
      INSERT INTO waitlist_rate (ip, hits, window_start) VALUES (${ip}, 1, now())
      ON CONFLICT (ip) DO UPDATE SET
        hits = CASE WHEN waitlist_rate.window_start < now() - interval '1 minute' THEN 1 ELSE waitlist_rate.hits + 1 END,
        window_start = CASE WHEN waitlist_rate.window_start < now() - interval '1 minute' THEN now() ELSE waitlist_rate.window_start END
      RETURNING hits
    `;
    if (Number(hits) > RATE_LIMIT_PER_MINUTE) {
      return json(429, { error: 'Too many attempts. Try again in a minute.' });
    }

    const [existing] = await sql`SELECT id, code, score FROM waitlist WHERE email = ${email}`;
    if (existing) {
      return json(200, {
        ok: true,
        existing: true,
        code: existing.code,
        position: await positionOf(sql, Number(existing.score), Number(existing.id)),
        count: await countAll(sql),
      });
    }

    let referrer: { id: number; email: string } | null = null;
    const ref = cleanCode(body.ref);
    if (ref) {
      const [row] = await sql`SELECT id, email FROM waitlist WHERE code = ${ref}`;
      if (row && row.email !== email) referrer = { id: Number(row.id), email: String(row.email) };
    }

    const joinedAt = Date.now();
    const base = (email.split('@')[0] || '').replace(/[^a-z0-9]/g, '').slice(0, 14) || 'you';
    let row: { id: number; code: string; score: number } | null = null;
    for (let attempt = 0; attempt < 6 && !row; attempt++) {
      const code = attempt === 0 ? base : attempt < 5 ? base.slice(0, 10) + random(4) : random(10);
      try {
        const rows = await sql`
          INSERT INTO waitlist (email, code, referred_by, score)
          VALUES (${email}, ${code}, ${referrer ? ref : null}, ${joinedAt})
          ON CONFLICT (email) DO NOTHING
          RETURNING id, code, score
        `;
        if (rows.length) {
          row = { id: Number(rows[0].id), code: String(rows[0].code), score: Number(rows[0].score) };
        } else {
          const [dup] = await sql`SELECT id, code, score FROM waitlist WHERE email = ${email}`;
          if (dup) row = { id: Number(dup.id), code: String(dup.code), score: Number(dup.score) };
          referrer = null;
        }
      } catch (err) {
        if (err && typeof err === 'object' && 'code' in err && err.code === '23505') continue;
        throw err;
      }
    }
    if (!row) return json(500, { error: 'Could not create your spot. Please try again.' });

    if (referrer) {
      await sql`
        UPDATE waitlist SET referrals = referrals + 1, score = score - ${REFERRAL_BOOST_MS}
        WHERE id = ${referrer.id}
      `;
    }

    const position = await positionOf(sql, row.score, row.id);
    const count = await countAll(sql);
    await notifySignup({
      id: row.id,
      email,
      position,
      count,
      code: row.code,
      referredBy: referrer ? ref : null,
    });

    return json(200, { ok: true, code: row.code, position, count });
  } catch (err) {
    console.error('waitlist error', err);
    return json(500, { error: 'Something went wrong. Please try again.' });
  }
}
