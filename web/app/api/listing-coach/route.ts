import {
  bearerToken,
  canUseCoach,
  COACH_SYSTEM,
  dossierText,
  streamClaude,
  transcribePitch,
  userRpc,
  type CoachContext,
} from '@/lib/coach';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

type Body = {
  listingId?: string;
  messages?: { role?: string; content?: string }[];
  stream?: boolean;
};

export async function POST(req: Request) {
  const jwt = bearerToken(req);
  if (!jwt) return jsonError('unauthorized', 401);

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return jsonError('bad_json', 400);
  }

  const listingId = body.listingId?.trim();
  if (!listingId) return jsonError('listing_required', 400);

  const messages = (body.messages ?? [])
    .filter((item) => item.content && (item.role === 'user' || item.role === 'assistant'))
    .slice(-16);

  const last = messages[messages.length - 1]?.content?.toLowerCase() ?? '';
  const stream = body.stream !== false;

  if (jailbreak(last)) {
    const reply = 'I only help with your listing and growth ideas for it. What should we tighten first?';
    return stream ? sseOf(reply) : Response.json({ reply });
  }

  let ctx: CoachContext;
  try {
    ctx = await userRpc<CoachContext>(jwt, 'my_listing_coach_context', { p_app_id: listingId });
  } catch (error) {
    if (String(error).includes('unauthorized')) return jsonError('unauthorized', 401);
    return jsonError('context_failed', 500);
  }

  if (ctx.error === 'unauthorized') return jsonError('unauthorized', 401);
  if (ctx.error === 'not_found') return jsonError('not_found', 404);
  if (!(await canUseCoach(jwt, ctx))) return jsonError('pro_required', 402);

  if (ctx.listing?.pitch_path && !ctx.listing.pitch_transcript) {
    const transcript = await transcribePitch(jwt, listingId, ctx.listing.pitch_path);
    if (transcript) ctx.listing.pitch_transcript = transcript;
  }

  const system = `${COACH_SYSTEM}\n\n${dossierText(ctx)}`;
  if (!stream) {
    let reply = '';
    for await (const chunk of streamClaude(system, messages)) reply += chunk;
    if (!reply.trim()) return jsonError('coach_failed', 502);
    return Response.json({ reply: reply.trim() });
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      const send = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };
      try {
        let any = false;
        for await (const text of streamClaude(system, messages)) {
          if (!text) continue;
          any = true;
          send({ text });
        }
        if (!any) send({ error: 'coach_failed' });
        else send({ done: true });
      } catch (error) {
        console.error('listing-coach stream', error);
        send({ error: 'coach_failed' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    },
  });
}

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status });
}

function sseOf(text: string) {
  const encoder = new TextEncoder();
  const body = encoder.encode(`data: ${JSON.stringify({ text })}\n\ndata: ${JSON.stringify({ done: true })}\n\n`);
  return new Response(body, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
    },
  });
}

function jailbreak(text: string): boolean {
  return /ignore (all|previous|the) (instructions|prompts)|system prompt|bypass|jailbreak|do anything now/.test(
    text,
  );
}
