import { getSupabase, isServerId } from '@/lib/supabase';

const COACH_URL = 'https://hey100.com/api/listing-coach';

async function accessToken(): Promise<string | null> {
  const db = getSupabase();
  if (!db) return null;
  const { data } = await db.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function askListingCoach(
  listingId: string,
  messages: { role: 'assistant' | 'user'; content: string }[],
): Promise<string> {
  const token = await accessToken();
  if (!token || !isServerId(listingId)) throw new Error('coach unavailable');

  const res = await fetch(COACH_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ listingId, messages }),
  });
  if (res.status === 402) throw new Error('pro_required');
  if (!res.ok) throw new Error('coach failed');
  const json = (await res.json()) as { reply?: string };
  return json.reply?.trim() || 'Tell me what part of the listing you want to improve first.';
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