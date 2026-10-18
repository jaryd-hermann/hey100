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
};

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
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
}

/**
 * Store subtitles and web descriptions both have to fit the 30 characters App
 * Store Connect allows. Cutting on a word keeps the result readable, since the
 * builder edits it on the next screen rather than retyping it.
 */
function oneLine(text: string, max = 30): string {
  const first = text.split(/[\n.·|–—]/)[0].trim();
  if (first.length <= max) return first;

  const cut = first.slice(0, max + 1);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut.slice(0, max)).trim();
}

async function fromAppStore(appId: string, country: string): Promise<Metadata | null> {
  // The country in the URL matters: a listing missing from one storefront is
  // present in another, and the US store is the usual fallback.
  for (const store of [country, 'us']) {
    const response = await fetch(
      `https://itunes.apple.com/lookup?id=${appId}&country=${store}&entity=software`,
    );
    if (!response.ok) continue;

    const { results } = (await response.json()) as { results: Record<string, unknown>[] };
    const app = results?.[0];
    if (!app) continue;

    const web = hostOf(String(app.sellerUrl ?? app.trackViewUrl ?? ''));

    return {
      name: String(app.trackName ?? '').slice(0, 30),
      // The App Store dropped subtitles from the API, so the promo text or the
      // first sentence of the description is the closest thing to one.
      sub: oneLine(String(app.description ?? '')),
      cats: (app.genres as string[] | undefined)?.slice(0, 3) ?? [],
      web,
      icon: String(app.artworkUrl512 ?? app.artworkUrl100 ?? '') || undefined,
      shots: [
        ...((app.screenshotUrls as string[] | undefined) ?? []),
        ...((app.ipadScreenshotUrls as string[] | undefined) ?? []),
      ].slice(0, 6),
      storeUrl: String(app.trackViewUrl ?? ''),
      hue: hueOf(web || String(app.trackName ?? '')),
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

  const iconHref =
    meta(html, 'og:image') ||
    /<link[^>]+rel=["'](?:apple-touch-icon|apple-touch-icon-precomposed)["'][^>]+href=["']([^"']+)["']/i.exec(
      html,
    )?.[1] ||
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:apple-touch-icon|apple-touch-icon-precomposed)["']/i.exec(
      html,
    )?.[1] ||
    '';

  const name = (title.split(/[|·—–]/)[0].trim() || host.split('.')[0]).slice(0, 30);

  return {
    name: name.charAt(0).toUpperCase() + name.slice(1),
    sub: oneLine(description),
    cats: [],
    web: host,
    icon: absolute(iconHref, response.url || url),
    // A marketing page's images are rarely product screenshots, and a wrong
    // guess is worse than an empty carousel the builder fills themselves.
    shots: [],
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
