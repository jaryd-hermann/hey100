import { NextResponse } from 'next/server';

import { bearerToken, transcribePitch, userRpc, type CoachContext } from '@/lib/coach';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const jwt = bearerToken(req);
  if (!jwt) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let listingId = '';
  try {
    const body = (await req.json()) as { listingId?: string };
    listingId = body.listingId?.trim() ?? '';
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 });
  }
  if (!listingId) return NextResponse.json({ error: 'listing_required' }, { status: 400 });

  let ctx: CoachContext;
  try {
    ctx = await userRpc<CoachContext>(jwt, 'my_listing_coach_context', { p_app_id: listingId });
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (ctx.error || !ctx.listing?.pitch_path) {
    return NextResponse.json({ error: ctx.error ?? 'no_pitch' }, { status: 400 });
  }
  if (ctx.listing.pitch_transcript) {
    return NextResponse.json({ ok: true, cached: true });
  }

  const text = await transcribePitch(jwt, listingId, ctx.listing.pitch_path);
  if (!text) return NextResponse.json({ error: 'transcribe_failed' }, { status: 502 });
  return NextResponse.json({ ok: true });
}
