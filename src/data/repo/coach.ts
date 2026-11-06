import { fetch as expoFetch } from 'expo/fetch';

import { getSupabase, isServerId } from '@/lib/supabase';

const COACH_URL = 'https://hey100.com/api/listing-coach';

async function accessToken(): Promise<string | null> {
  const db = getSupabase();
  if (!db) return null;
  const { data } = await db.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function streamListingCoach(
  listingId: string,
  messages: { role: 'assistant' | 'user'; content: string }[],
  onText: (full: string) => void,
): Promise<string> {
  const token = await accessToken();
  if (!token || !isServerId(listingId)) throw new Error('coach unavailable');

  const res = await expoFetch(COACH_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'text/event-stream',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ listingId, messages, stream: true }),
  });
  if (res.status === 402) throw new Error('pro_required');
  if (!res.ok) throw new Error('coach failed');

  const type = res.headers.get('content-type') ?? '';
  if (type.includes('application/json')) {
    const json = (await res.json()) as { reply?: string; error?: string };
    const reply = json.reply?.trim();
    if (!reply) throw new Error(json.error || 'coach failed');
    await typeOut(reply, onText);
    return reply;
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('coach failed');

  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';
  let batched = 0;

  const consume = async (payload: { text?: string; done?: boolean; error?: string }) => {
    if (payload.error) throw new Error(payload.error);
    if (!payload.text) return;
    full += payload.text;
    onText(full);
    batched += 1;
    if (batched % 2 === 0) await sleep(16);
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';
    for (const event of events) {
      const line = event.split('\n').find((row) => row.startsWith('data: '));
      if (!line) continue;
      try {
        await consume(JSON.parse(line.slice(6)) as { text?: string; done?: boolean; error?: string });
      } catch (error) {
        if (error instanceof Error && /coach|pro_required/.test(error.message)) throw error;
      }
    }
  }

  if (!full.trim()) throw new Error('coach failed');
  return full.trim();
}

export async function askListingCoach(
  listingId: string,
  messages: { role: 'assistant' | 'user'; content: string }[],
): Promise<string> {
  return streamListingCoach(listingId, messages, () => {});
}

export async function requestPitchTranscript(listingId: string): Promise<void> {
  const token = await accessToken();
  if (!token || !isServerId(listingId)) return;
  await fetch(`${COACH_URL}/transcribe`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ listingId }),
  }).catch(() => {});
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function typeOut(text: string, onText: (full: string) => void) {
  const chunk = Math.max(8, Math.ceil(text.length / 48));
  for (let i = chunk; i < text.length; i += chunk) {
    onText(text.slice(0, i));
    await sleep(18);
  }
  onText(text);
}
