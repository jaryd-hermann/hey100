/**
 * Looks up a listing from a store link, a Product Hunt page, or a website, so
 * onboarding can fill in the name, subtitle, category, icon and screenshots
 * instead of asking for them.
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
  /** Set when the gallery is landscape, as Product Hunt screenshots are. */
  shotLayout?: 'vertical' | 'horizontal';
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

function hiResShot(url: string): string {
  if (!url || !/mzstatic\.com/i.test(url)) return url;
  return url
    .replace(/\/(\d+)x(\d+)([a-z]*)(\.[a-z]+)(\?.*)?$/i, (match, w, h, flags, ext, query = '') => {
      const width = Number(w);
      const height = Number(h);
      if (!width || !height || width >= 1242) return match;
      const scale = 1242 / width;
      return `/${Math.round(width * scale)}x${Math.round(height * scale)}${flags}${ext}${query}`;
    })
    .replace(/\/(\d+)x0w(\.[a-z]+)(\?.*)?$/i, (match, w, ext, query = '') => {
      if (Number(w) >= 1242) return match;
      return `/1242x0w${ext}${query}`;
    });
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
      ]
        .map(hiResShot)
        .slice(0, MAX_SHOTS),
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

/** producthunt.com/products/sagecraft or /posts/sagecraft, ignoring a launch query. */
function productHuntSlug(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!/(^|\.)producthunt\.com$/i.test(parsed.hostname)) return null;
    return /^\/(?:products|posts)\/([a-z0-9-]+)/i.exec(parsed.pathname)?.[1] ?? null;
  } catch {
    return null;
  }
}

/** "quicker.chat - one inbox for all your DMs" → name plus the tagline. */
function titleParts(title: string): { name: string; tagline: string } {
  const parts = title
    .split(/\s*[|·]\s*|\s+[—–-]\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return { name: parts[0] ?? '', tagline: parts.slice(1).join(' ') };
}

/**
 * A website has no App Store subtitle. Prefer the title's tagline when it
 * already fits, then a description sentence that fits, then the longest whole
 * words of the hero line.
 */
function websiteSubtitle(tagline: string, description: string): string {
  if (tagline.length > 2 && tagline.length <= 30) return tagline;
  return oneLine(description) || fitLine(tagline || description);
}

function fitLine(text: string, max = 30): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max + 1);
  const cut = slice.lastIndexOf(' ');
  return (cut > 8 ? slice.slice(0, cut) : clean.slice(0, max)).trim().replace(/[.,;:–—-]+$/, '');
}

type HuntMedia = {
  image_uuid?: string;
  media_type?: string;
  original_width?: number;
  original_height?: number;
};

type HuntProduct = {
  name?: string;
  tagline?: string;
  media?: HuntMedia[];
};

function decodeBase64Json(encoded: string): unknown {
  const padded = encoded + '='.repeat((4 - (encoded.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

/**
 * Product Hunt's product page sits behind a bot challenge. Their public card
 * embed does not, and it carries the name, tagline and gallery.
 */
async function huntCard(kind: 'products' | 'posts', slug: string): Promise<HuntProduct | null> {
  const response = await fetch(
    `https://cards.producthunt.com/cards/${kind}/${encodeURIComponent(slug)}`,
    {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'text/html',
      },
    },
  );
  if (!response.ok) return null;

  const encoded = /window\.initialState = '([^']+)'/.exec(await response.text())?.[1];
  if (!encoded) return null;

  try {
    const data = decodeBase64Json(encoded) as { product?: HuntProduct; post?: HuntProduct };
    const product = data.product ?? data.post;
    return product?.name ? product : null;
  } catch {
    return null;
  }
}

function huntImage(uuid: string): string {
  return `https://ph-files.imgix.net/${uuid}?auto=format&w=1242`;
}

function fromHuntProduct(product: HuntProduct, slug: string): Metadata {
  const images = (product.media ?? []).filter(
    (item) => item.media_type === 'image' && !!item.image_uuid,
  );
  const square = images.find((item) => {
    const width = item.original_width ?? 0;
    const height = item.original_height ?? 0;
    if (width < 80 || height < 80) return false;
    const ratio = width / height;
    return ratio > 0.85 && ratio < 1.15;
  });
  const sized = images.filter((item) => (item.original_width ?? 0) > 0 && (item.original_height ?? 0) > 0);
  const wide = sized.filter((item) => (item.original_width ?? 0) > (item.original_height ?? 0)).length;

  return {
    name: (product.name ?? '').slice(0, 30),
    sub: fitLine(product.tagline ?? ''),
    cats: [],
    // The card does not include the product's own site. Leaving this blank
    // keeps producthunt.com from being saved as the listing website.
    web: '',
    icon: square?.image_uuid ? huntImage(square.image_uuid) : undefined,
    shots: images
      .filter((item) => item !== square)
      .map((item) => huntImage(item.image_uuid!))
      .slice(0, MAX_SHOTS),
    hue: hueOf(slug),
    ...(sized.length ? { shotLayout: wide * 2 >= sized.length ? 'horizontal' as const : 'vertical' as const } : {}),
  };
}

async function fromProductHunt(slug: string): Promise<Metadata | null> {
  const product = (await huntCard('products', slug)) ?? (await huntCard('posts', slug));
  if (!product) return null;
  return fromHuntProduct(product, slug);
}

/** A named listing from the slug when the card is missing, so the app is never called "Product Hunt". */
function huntFallback(slug: string): Metadata {
  const name = slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    name: name.slice(0, 30),
    sub: '',
    cats: [],
    web: '',
    shots: [],
    hue: hueOf(slug),
  };
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
    meta(html, 'og:title') ||
    decodeEntities(/<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1]?.trim() ?? '');

  const description = meta(html, 'og:description') || meta(html, 'description') || meta(html, 'twitter:description');
  const { name: titleName, tagline } = titleParts(title);
  const name = (meta(html, 'og:site_name') || titleName || host.split('.')[0]).slice(0, 30);

  return {
    name: name.charAt(0).toUpperCase() + name.slice(1),
    sub: websiteSubtitle(tagline, description),
    cats: [],
    web: host,
    // A square PNG or apple-touch-icon when the page has one. An SVG-only
    // favicon cannot be drawn in the app, so that case uses a raster of it.
    icon: (() => {
      const linked = absolute(squareIcon(html), response.url || url);
      if (linked && !/\.svg($|\?)/i.test(linked)) return linked;
      return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
    })(),
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
    const hunt = productHuntSlug(target);

    const data = store
      ? ((await fromAppStore(store[2], store[1])) ?? (await fromWebsite(target)))
      : hunt
        ? ((await fromProductHunt(hunt)) ?? huntFallback(hunt))
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
