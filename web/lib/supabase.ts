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
    category?: string | null;
    platform?: string | null;
    stage?: string | null;
    problem_of?: string | null;
    problem_for?: string | null;
    pitch_path?: string | null;
    pitch_seconds?: number | null;
    pricing_model?: string | null;
    price_from?: string | null;
    store_rating?: number | null;
    store_rating_count?: number | null;
    store_url?: string | null;
    shot_layout?: string | null;
  };
  media: { storage_path: string; kind: string; label?: string | null; position: number }[];
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

export type PublicBuilder = {
  id: string;
  username: string | null;
  photo_url: string | null;
  job: string | null;
  workplace: string | null;
  own_words: Record<string, string> | null;
  app_interests: string[] | null;
};

export type PublicApp = {
  name: string;
  slug: string | null;
  hue: number;
  icon_path: string | null;
  subtitle: string | null;
};

async function rest<T>(path: string): Promise<T | null> {
  if (!URL || !KEY) return null;
  try {
    const res = await fetch(`${URL}/rest/v1/${path}`, {
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
      },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function builderByUsername(username: string): Promise<{
  builder: PublicBuilder;
  apps: PublicApp[];
} | null> {
  const handle = username.trim().toLowerCase();
  if (!handle) return null;
  const people = await rest<PublicBuilder[]>(
    `builders?username=eq.${encodeURIComponent(handle)}&select=id,username,photo_url,job,workplace,own_words,app_interests`,
  );
  const builder = people?.[0];
  if (!builder?.id) return null;
  const apps = await rest<PublicApp[]>(
    `apps?owner_id=eq.${builder.id}&published_at=not.is.null&select=name,slug,hue,icon_path,subtitle&order=created_at.asc`,
  );
  return { builder, apps: apps ?? [] };
}

export function inviteStatus(code: string) {
  return rpc<InviteStatus>('invite_code_status', { p_code: code });
}

export function groupById(id: string) {
  return rpc<GroupCard>('group_by_id', { p_id: id });
}
