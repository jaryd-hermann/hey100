import { NextResponse } from 'next/server';

import {
  askClaude,
  bearerToken,
  canUseCoach,
  COACH_SYSTEM,
  dossierText,
  transcribePitch,
  userRpc,
  type CoachContext,
} from '@/lib/coach';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Body = {
  listingId?: string;
  messages?: { role?: string; content?: string }[];
};

export async function POST(req: Request) {
  const jwt = bearerToken(req);
  if (!jwt) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 });
  }

  const listingId = body.listingId?.trim();
  if (!listingId) return NextResponse.json({ error: 'listing_required' }, { status: 400 });

  const messages = (body.messages ?? [])
    .filter((item) => item.content && (item.role === 'user' || item.role === 'assistant'))
    .slice(-16);

  const last = messages[messages.length - 1]?.content?.toLowerCase() ?? '';
  if (jailbreak(last)) {
    return NextResponse.json({
      reply: 'I only help with your listing and growth ideas for it. What should we tighten first?',
    });
  }

  let ctx: CoachContext;
  try {
    ctx = await userRpc<CoachContext>(jwt, 'my_listing_coach_context', { p_app_id: listingId });
  } catch (error) {
    if (String(error).includes('unauthorized')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'context_failed' }, { status: 500 });
  }

  if (ctx.error === 'unauthorized') return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (ctx.error === 'not_found') return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (!(await canUseCoach(jwt, ctx))) {
    return NextResponse.json({ error: 'pro_required' }, { status: 402 });
  }

  if (ctx.listing?.pitch_path && !ctx.listing.pitch_transcript) {
    const transcript = await transcribePitch(jwt, listingId, ctx.listing.pitch_path);
    if (transcript) ctx.listing.pitch_transcript = transcript;
  }

  const reply = await askClaude(`${COACH_SYSTEM}\n\n${dossierText(ctx)}`, messages);
  return NextResponse.json({ reply: reply || fallbackReply(ctx) });
}

function jailbreak(text: string): boolean {
  return /ignore (all|previous|the) (instructions|prompts)|system prompt|bypass|jailbreak|do anything now/.test(
    text,
  );
}

function fallbackReply(ctx: CoachContext): string {
  const name = ctx.listing?.name ?? 'this product';
  const problem = ctx.listing?.problem_of ?? '';
  const who = ctx.listing?.problem_for ?? '';
  const avg = Number(ctx.insights?.pitch_avg_seconds ?? 0);
  const length = Number(ctx.listing?.pitch_seconds ?? 0);
  return [
    `Let's tighten ${name}.`,
    problem && who ? `Lead with the pain (${problem}) for ${who} in the first screen.` : 'Make the first screen say who it is for and what pain it removes.',
    avg > 0 && length > 0 && avg < length * 0.5
      ? `People watch about ${Math.round(avg)}s of a ${length}s pitch — rewrite the opening line.`
      : 'Put the demo or strongest screenshot first — that is where heys start.',
    'What part of the listing should we rewrite first: headline, pitch, or ideal users?',
  ]
    .filter(Boolean)
    .join(' ');
}
