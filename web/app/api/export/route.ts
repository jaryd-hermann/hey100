import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

import { db } from '@/lib/waitlist';

export const runtime = 'nodejs';

function json(status: number, body: unknown) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function csvCell(v: unknown) {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export async function GET(req: Request) {
  try {
    const expected = process.env.ADMIN_KEY || '';
    const url = new URL(req.url);
    const given =
      (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '') ||
      url.searchParams.get('key') ||
      '';
    if (!expected || !safeEqual(given, expected)) return json(401, { error: 'Unauthorized' });

    const sql = db();
    const rows = await sql`
      SELECT email, code, referred_by, referrals, joined_at FROM waitlist ORDER BY score, id
    `;
    const out = rows.map((r, i) => ({
      position: i + 1,
      email: String(r.email),
      code: String(r.code),
      joinedAt: new Date(String(r.joined_at)).toISOString(),
      referredBy: r.referred_by ? String(r.referred_by) : '',
      referrals: Number(r.referrals || 0),
    }));

    if (url.searchParams.get('format') === 'json') {
      return json(200, { count: out.length, rows: out });
    }

    const header = ['position', 'email', 'code', 'joinedAt', 'referredBy', 'referrals'] as const;
    const csv =
      [header.join(','), ...out.map((row) => header.map((k) => csvCell(row[k])).join(','))].join(
        '\r\n',
      ) + '\r\n';

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="hey100-waitlist.csv"',
      },
    });
  } catch (err) {
    console.error('export error', err);
    return json(500, { error: 'Export failed' });
  }
}
