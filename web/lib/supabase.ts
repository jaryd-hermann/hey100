const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export type InviteStatus = { valid: boolean; inviter: string | null };

async function rpc<T>(name: string, body: Record<string, unknown>): Promise<T | null> {
  if (!URL || !KEY) return null;
  try {
    const res = await fetch(`${URL}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json ?? null) as T | null;
  } catch {
    return null;
  }
}

export function inviteStatus(code: string) {
  return rpc<InviteStatus>('invite_code_status', { p_code: code });
}
