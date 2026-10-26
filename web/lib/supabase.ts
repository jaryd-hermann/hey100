const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export type ListingCard = {
  app: {
    id: string;
    name: string;
    subtitle: string;
    slug: string;
    hue: number;
    icon_path: string | null;
    cover_path: string | null;
    problem_of?: string | null;
    problem_for?: string | null;
    category?: string | null;
    stage?: string | null;
  };
  prompts: { label: string; answer: string; slot: number }[];
  builder: { real_name: string | null; username: string | null; photo_url: string | null } | null;
};

export type GroupCard = {
  id: string;
  name: string;
  bio: string | null;
  audience: string | null;
  cover_path: string | null;
  join_mode: 'open' | 'request' | 'criteria';
  member_count: number;
};

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

export function listingBySlug(slug: string) {
  return rpc<ListingCard>('listing_by_slug', { p_slug: slug });
}

export function inviteStatus(code: string) {
  return rpc<InviteStatus>('invite_code_status', { p_code: code });
}

export function groupById(id: string) {
  return rpc<GroupCard>('group_by_id', { p_id: id });
}
