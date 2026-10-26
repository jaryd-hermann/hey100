import { hiResStoreImages } from '@/lib/storeImages';
import { getSupabase } from '@/lib/supabase';

/** App Store Connect caps the name and subtitle at 30 characters. */
export const NAME_MAX = 30;

export type AppMetadata = {
  name: string;
  sub: string;
  cats: string[];
  web: string;
  icon?: string;
  /** Store screenshots in order, offered as the starting carousel. */
  shots: string[];
  storeUrl?: string;
  hue: number;
  rating?: number;
  ratingCount?: number;
};

/**
 * Last resort when the lookup cannot run: a plausible listing derived from the
 * host, so a bad network or a missing backend never blocks onboarding. The hue
 * matches what the edge function computes, so the colour does not change if the
 * builder retries and it succeeds.
 */
export function metadataFromHost(url: string): AppMetadata {
  const host = url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0];

  const base = (host.split('.')[0] || 'Your app').replace(/[-_]/g, ' ');
  const name = base.charAt(0).toUpperCase() + base.slice(1);

  return {
    name: name.slice(0, NAME_MAX),
    sub: '',
    cats: [],
    web: host,
    shots: [],
    hue: [...host].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360,
  };
}

export async function fetchAppMetadata(url: string): Promise<AppMetadata> {
  const db = getSupabase();
  if (!db) return metadataFromHost(url);

  const { data, error } = await db.functions.invoke<AppMetadata>('app-metadata', {
    body: { url },
  });

  if (error || !data?.name) return metadataFromHost(url);
  return {
    ...data,
    shots: hiResStoreImages(data.shots ?? []),
    cats: data.cats ?? [],
  };
}
