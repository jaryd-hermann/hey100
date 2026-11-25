const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const MODEL = 'claude-sonnet-5-5';

export type Turn = { role: 'user' | 'assistant'; content: string };

export function bearerToken(req: Request): string | null {
  const header = req.headers.get('authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  return token || null;
}

/** Calls a Postgres RPC as the signed-in user, so RLS and `auth.uid()` apply. */
export async function userRpc<T>(jwt: string, name: string, body: Record<string, unknown>): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_ANON) throw new Error('supabase_unconfigured');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (res.status === 401) throw new Error('unauthorized');
  if (!res.ok) throw new Error(`rpc_${name}_${res.status}`);
  return (await res.json()) as T;
}

/** Merges consecutive same-role turns and drops a leading assistant turn, as the API requires. */
export function normalizeTurns(turns: { role?: string; content?: string }[]): Turn[] {
  const out: Turn[] = [];
  for (const turn of turns) {
    const text = String(turn.content ?? '').trim();
    if (!text) continue;
    const role = turn.role === 'assistant' ? 'assistant' : 'user';
    if (!out.length && role === 'assistant') continue;
    const last = out[out.length - 1];
    if (last?.role === role) last.content += `\n\n${text}`;
    else out.push({ role, content: text });
  }
  return out;
}

export async function* streamClaude(
  system: string,
  turns: { role?: string; content?: string }[],
  opts: { model?: string; maxTokens?: number } = {},
): AsyncGenerator<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('anthropic_unconfigured');

  const messages = normalizeTurns(turns);
  if (!messages.length || messages[messages.length - 1].role !== 'user') return;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2026-10-21',
    },
    body: JSON.stringify({
      model: opts.model ?? MODEL,
      max_tokens: opts.maxTokens ?? 4096,
      system,
      messages,
      thinking: { type: 'between_tools' },
      output_config: { effort: 'medium' },
      stream: true,
    }),
  });
  if (!res.ok || !res.body) {
    const err = await res.text().catch(() => '');
    throw new Error(`anthropic_${res.status}:${err.slice(0, 300)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';
    for (const event of events) {
      const data = event
        .split('\n')
        .filter((line) => line.startsWith('data: '))
        .map((line) => line.slice(6))
        .join('');
      if (!data || data === '[DONE]') continue;
      try {
        const json = JSON.parse(data) as { type?: string; delta?: { type?: string; text?: string } };
        if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta' && json.delta.text) {
          yield json.delta.text;
        }
      } catch {
        // Skip a torn SSE frame.
      }
    }
  }
}

export async function askClaude(
  system: string,
  turns: { role?: string; content?: string }[],
  opts?: { model?: string; maxTokens?: number },
): Promise<string> {
  let reply = '';
  for await (const chunk of streamClaude(system, turns, opts)) reply += chunk;
  return reply.trim();
}
