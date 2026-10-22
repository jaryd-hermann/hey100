/**
 * Looks up a listing from a store link or a website, so onboarding can fill in
 * the name, subtitle, category, icon and screenshots instead of asking for them.
 *
 * It runs on the server for three reasons: the App Store lookup API has no CORS
 * headers, a website's HTML is far too large to ship to a phone just to read
 * four meta tags, and the whole response is cacheable per URL.
 */

type Metadata = {
  name: string;
  sub: string;
  cats: string[];
  web: string;
  /** Square icon, when the source has one. */
  icon?: string;
  /** Screenshots in store order, which onboarding offers as the carousel. */
  shots: string[];
  storeUrl?: string;
  /** Generated from the host, so a listing without an icon still has a colour. */
  hue: number;
  rating?: number;
  ratingCount?: number;
};

/** Media slots a listing has, kept in step with the client's own cap. */
const MAX_SHOTS = 10;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** Matches the client's own fallback, so a listing's colour never changes. */
function hueOf(host: string): number {
  let sum = 0;
  for (const char of host) sum += char.codePointAt(0) ?? 0;
  return sum % 360;
}

function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0];
  }
}

/**
 * A subtitle has to fit the 30 characters App Store Connect allows, and the
 * App Store API no longer returns the real one, so the closest thing is the
 * opening of the description.
 *
 * Only a phrase that is complete at that length is offered. Cutting a sentence
 * mid-thought produced things like "Good Times is private-group", which the
 * builder has to delete before writing their own, so nothing is better: the
 * field is editable on the next screen and shows its own counter.
 */
function oneLine(text: string, max = 30): string {
  // The first sentence, whole or not at all. A clause out of the middle reads
  // like "Bear is a beautiful", which the builder has to delete anyway.
  const first = text.split(/[\n.·|]/)[0].trim();

  return first.length > 2 && first.length <= max ? first : '';
}

/**
 * The real subtitle, which the lookup API does not return but the store page
 * shows under the app name. Worth one extra request: it is written by the
 * builder, already fits 30 characters, and is the line the spec asks the fetch
 * to fill in.
 */
async function storeSubtitle(storeUrl: string): Promise<string> {
  if (!storeUrl) return '';

  try {
    const response = await fetch(storeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Hey100/1.0; +https://hey100.com)',
        Accept: 'text/html',
      },
    });
    if (!response.ok) return '';

    const html = (await response.text()).slice(0, 400_000);

    // The header subtitle is the first subtitle-classed element on the page;
    // the later ones belong to the "you might also like" apps. Apple's class
    // names carry a build hash, so the stable part is the word itself.
    const subtitle = /class="[^"]*\bsubtitle\b[^"]*"[^>]*>([^<]+)</i.exec(html)?.[1] ?? '';

    return decodeEntities(subtitle.trim()).slice(0, 30);
  } catch {
    return '';
  }
}

async function fromAppStore(appId: string, country: string): Promise<Metadata | null> {
  // The country in the URL matters: a listing missing from one storefront is
  // present in another, and the US store is the usual fallback.
  for (const store of [country, 'us']) {
    const response = await fetch(
      `https://itunes.apple.com/lookup?id=${appId}&country=${store}&entity=software`,
    );
    if (!response.ok) continue;

    const { results } = (await response.json()) as {
      results: Record<string, unknown>[];
    };
    const app = results?.[0];
    if (!app) continue;

    const web = hostOf(String(app.sellerUrl ?? app.trackViewUrl ?? ''));
    const storeUrl = String(app.trackViewUrl ?? '');

    return {
      name: String(app.trackName ?? '').slice(0, 30),
      // The page's own subtitle first, then the description's opening sentence
      // if it happens to fit on its own.
      sub: (await storeSubtitle(storeUrl)) || oneLine(String(app.description ?? '')),
      cats: (app.genres as string[] | undefined)?.slice(0, 3) ?? [],
      web,
      icon: String(app.artworkUrl512 ?? app.artworkUrl100 ?? '') || undefined,
      shots: [
        ...((app.screenshotUrls as string[] | undefined) ?? []),
        ...((app.ipadScreenshotUrls as string[] | undefined) ?? []),
      ].slice(0, MAX_SHOTS),
      storeUrl,
      hue: hueOf(web || String(app.trackName ?? '')),
      rating: typeof app.averageUserRating === 'number' ? app.averageUserRating : undefined,
      ratingCount: typeof app.userRatingCount === 'number' ? app.userRatingCount : undefined,
    };
  }

  return null;
}

/** Reads one meta tag, tolerating either attribute order. */
function meta(html: string, name: string): string {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${name}["']`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match?.[1]) return decodeEntities(match[1]);
  }
  return '';
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function absolute(href: string, base: string): string | undefined {
  if (!href) return undefined;
  try {
    return new URL(href, base).toString();
  } catch {
    return undefined;
  }
}

/**
 * A square raster icon from the page's own icon links.
 *
 * The social card is deliberately not a candidate: it is a wide banner, and a
 * banner cropped into an icon tile reads as a broken image. A page with no
 * square icon gets none, and the app falls back to its lettered tile.
 */
function squareIcon(html: string): string {
  const links = html.match(/<link[^>]+>/gi) ?? [];
  const wanted = /apple-touch-icon(?:-precomposed)?|shortcut icon|^icon$/i;

  const candidates = links
    .filter((link) => wanted.test(/rel=["']([^"']+)["']/i.exec(link)?.[1]?.trim() ?? ''))
    .map((link) => ({
      href: /href=["']([^"']+)["']/i.exec(link)?.[1] ?? '',
      // The largest declared size wins, and an apple-touch-icon with no size
      // still beats a 16px favicon.
      size: Number(/sizes=["'](\d+)/i.exec(link)?.[1] ?? (/apple/i.test(link) ? 180 : 0)),
    }))
    .filter(({ href }) => href && !/\.svg($|\?)/i.test(href))
    .sort((a, b) => b.size - a.size);

  return candidates[0]?.href ?? '';
}

async function fromWebsite(url: string): Promise<Metadata> {
  const host = hostOf(url);

  const response = await fetch(url, {
    headers: {
      // Some sites serve a stub to unknown agents, and og tags are what we want.
      'User-Agent': 'Mozilla/5.0 (compatible; Hey100/1.0; +https://hey100.com)',
      Accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
  });

  // 400 KB is well past where <head> ends on any real page.
  const html = (await response.text()).slice(0, 400_000);

  const title =
    meta(html, 'og:site_name') ||
    meta(html, 'og:title') ||
    decodeEntities(/<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1]?.trim() ?? '');

  const description = meta(html, 'og:description') || meta(html, 'description');

  const name = (title.split(/[|·—–]/)[0].trim() || host.split('.')[0]).slice(0, 30);

  return {
    name: name.charAt(0).toUpperCase() + name.slice(1),
    sub: oneLine(description),
    cats: [],
    web: host,
    icon: absolute(squareIcon(html), response.url || url),
    // The social card, which is the one image on a marketing page the builder
    // chose themselves. Everything else on such a page is decoration, and a
    // wrong guess is worse than a carousel they fill in themselves.
    shots: [absolute(meta(html, 'og:image'), response.url || url)].filter(
      (shot): shot is string => !!shot,
    ),
    hue: hueOf(host),
  };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { url } = (await request.json()) as { url?: string };
    const trimmed = url?.trim();
    if (!trimmed) {
      return Response.json({ error: 'A url is required' }, { status: 400, headers: CORS });
    }

    const target = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const store = /apps\.apple\.com\/([a-z]{2})\/app\/[^/]+\/id(\d+)/i.exec(target);

    const data = store
      ? ((await fromAppStore(store[2], store[1])) ?? (await fromWebsite(target)))
      : await fromWebsite(target);

    return Response.json(data, {
      headers: { ...CORS, 'Cache-Control': 'public, max-age=86400' },
    });
  } catch (error) {
    // The client falls back to parsing the host itself, so this stays a plain
    // failure rather than something it has to interpret.
    return Response.json(
      { error: error instanceof Error ? error.message : 'Lookup failed' },
      { status: 502, headers: CORS },
    );
  }
});
