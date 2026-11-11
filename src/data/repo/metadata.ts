import { hiResStoreImages } from '@/lib/storeImages';
import { getSupabase } from '@/lib/supabase';

/** App Store Connect caps the name and subtitle at 30 characters. */
export const NAME_MAX = 30;
/** Longer listing description under the tags. */
export const DESCRIPTION_MAX = 330;

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
  /** Gallery orientation, when the source knows it. */
  shotLayout?: 'vertical' | 'horizontal';
};

function hostOf(url: string): string {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0];
}

/**
 * A picture the app can draw. A page that only publishes an SVG favicon, or
 * none at all, gets the raster of that site's icon.
 */
function rasterIcon(url: string, icon?: string): string | undefined {
  if (icon && !/\.svg($|\?)/i.test(icon)) return icon;
  const host = hostOf(url);
  if (!host.includes('.')) return icon;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
}

function productHuntSlug(url: string): string | null {
  return /producthunt\.com\/(?:products|posts)\/([a-z0-9-]+)/i.exec(url)?.[1] ?? null;
}

function nameFromSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Last resort when the lookup cannot run: a plausible listing derived from the
 * host, so a bad network or a missing backend never blocks onboarding. The hue
 * matches what the edge function computes, so the colour does not change if the
 * builder retries and it succeeds.
 */
export function metadataFromHost(url: string): AppMetadata {
  const hunt = productHuntSlug(url);
  if (hunt) {
    return {
      name: nameFromSlug(hunt).slice(0, NAME_MAX),
      sub: '',
      cats: [],
      web: '',
      shots: [],
      hue: [...hunt].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360,
    };
  }

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
  if (!db) return { ...metadataFromHost(url), icon: rasterIcon(url) };

  const { data, error } = await db.functions.invoke<AppMetadata>('app-metadata', {
    body: { url },
  });

  const hunt = productHuntSlug(url);
  // A Product Hunt page fetched as a normal website comes back as the bot
  // challenge, or as the host with no gallery. Either one is not a listing.
  const huntMiss =
    !!hunt &&
    (!!error ||
      !data?.name ||
      /just a moment/i.test(data.name) ||
      (/producthunt\.com$/i.test(data.web ?? '') && !(data.shots?.length)));
  if (huntMiss || error || !data?.name) return { ...metadataFromHost(url), icon: rasterIcon(url) };
  // Web pages often have an og:image, which is a banner, not a listing shot.
  // App Store lookups and Product Hunt galleries are real screenshots.
  const fromStore = !!data.storeUrl || /apps\.apple\.com\/.+\/id\d+/i.test(url);
  return {
    ...data,
    icon: rasterIcon(url, data.icon),
    web: hunt && /producthunt\.com$/i.test(data.web ?? '') ? '' : data.web,
    shots: fromStore ? hiResStoreImages(data.shots ?? []) : hunt ? (data.shots ?? []).slice(0, 10) : [],
    cats: data.cats ?? [],
  };
}
