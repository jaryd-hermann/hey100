/**
 * Seeds demo builders with real listings, so the loop can be walked alone.
 *
 * Each one is a normal account flagged `is_demo`, which is what lets the
 * `demo_*` functions act on their behalf toward whoever is testing. The
 * listings are built from real store pages and websites through the
 * app-metadata function, so the cards carry real icons and screenshots rather
 * than placeholders.
 *
 * Usage: node scripts/seed-demo.mjs [--reset]
 */

import { readFileSync } from 'node:fs';

const env = {};
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const match = /^([A-Z0-9_]+)="?([^"\n]*)"?$/.exec(line.trim());
  if (match) env[match[1]] = match[2];
}

const URL_BASE = env.SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_BASE || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

/** Password is irrelevant: these accounts are only ever acted on server-side. */
const PASSWORD = 'hey100-demo-' + Math.random().toString(36).slice(2, 10);

const LAYOUT = [
  'shots',
  'problem',
  'pricing',
  'p0',
  'builder',
  'p1',
  'looking',
  'p2',
  'p3',
  'p4',
  'stats',
  'verified',
];

const BUILDERS = [
  {
    email: 'rae@hey100-demo.app',
    realName: 'Rae Mitchell',
    username: 'raebuilds',
    job: 'iOS engineer',
    workplace: 'Solo',
    bio: 'Building Good Times nights and weekends. I test everything I say hey to for a week before I write anything.',
    url: 'https://apps.apple.com/us/app/good-times-one-group-question/id6755366013',
    stage: 'Live',
    problemOf: 'group chats that go quiet after everyone moves',
    problemFor: 'friends who still want a reason to text',
    pricingModel: 'Freemium',
    priceFrom: '$9.99/yr',
    badges: ['Live on the App Store', 'RevenueCat · 100–500 subscribers'],
    prompts: [
      [
        'why',
        'My group chat went quiet after everyone moved cities. One question a day brought it back.',
      ],
      [
        'honest',
        'Whether the daily question is enough to pull people back in, or whether it needs a nudge.',
      ],
      [
        'first',
        'Our first group asked to keep going after the trial week ended. That was the signal.',
      ],
      ['how', 'One question lands each morning. Answer it. See what your people said. That is it.'],
      ['green', 'You will answer tomorrow, not just today.'],
    ],
    feedbackWanted: ['onboarding', 'retention'],
    role: 'Solo founder, second app',
    style: 'Writes long feedback. Replies same day.',
  },
  {
    email: 'theo@hey100-demo.app',
    realName: 'Theo Lindqvist',
    username: 'theoships',
    job: 'Designer who codes',
    workplace: 'Nights and weekends',
    bio: 'Little Moments started as a journal for my daughter. Now a few thousand parents use it.',
    url: 'https://apps.apple.com/us/app/little-moments-photo-journal/id6761054988',
    stage: 'Live',
    problemOf: 'photos of your kid that you never look at again',
    problemFor: 'parents who want a year they can actually hold',
    pricingModel: 'Subscription',
    priceFrom: '$24.99/yr',
    badges: ['Live on the App Store', 'Stripe · $1k–5k MRR'],
    prompts: [
      ['love', "You'll love this if you take photos you never look at again."],
      ['proud', 'The year view. One screen, every moment, no scrolling.'],
      [
        'stuck',
        'People do not realise they can import from an album, so the first week looks empty.',
      ],
      ['how', 'Snap a moment. Add a line. Sunday you get the week back as a letter.'],
      ['works', 'A parent opens last March and stays there for ten minutes.'],
    ],
    feedbackWanted: ['first run', 'pricing'],
    role: 'Designer, ships every Friday',
    style: 'Short, specific feedback. Replies in a day.',
  },
  {
    email: 'nadia@hey100-demo.app',
    realName: 'Nadia Okafor',
    username: 'quickerchat',
    job: 'Founder',
    workplace: 'Quicker',
    bio: 'Building Quicker, a faster way to talk to the people you actually talk to. Pre-launch.',
    url: 'https://quicker.chat/',
    subtitle: 'Chat without the pile-up',
    stage: 'TestFlight',
    problemOf: 'unread counts that make talking feel like work',
    problemFor: 'people who only want the five they actually text',
    pricingModel: 'Free',
    badges: ['GitHub · last commit today'],
    prompts: [
      ['how', 'Open it, pick a person, talk. No feed, no unread count, nothing to manage.'],
      ['honest', 'Whether the lack of a feed feels calm or feels broken. I cannot tell any more.'],
      ['dont', "Don't download this if you want groups. It is one to one by design."],
      ['why', 'I missed the people I love because the apps made them a badge.'],
      ['skipping', 'Stories, groups, and anything that turns a chat into a feed.'],
    ],
    feedbackWanted: ['positioning', 'first run'],
    role: 'Pre-launch, TestFlight open',
    style: 'Asks follow-up questions. Replies within hours.',
  },
];

async function api(method, path, body, headers = {}) {
  const response = await fetch(URL_BASE + path, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: 'Bearer ' + SERVICE_KEY,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  const json = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`${method} ${path} → ${response.status} ${text.slice(0, 300)}`);
  }

  return json;
}

/** The same lookup the app uses, so a demo listing is built like a real one. */
async function metadata(url) {
  return api('POST', '/functions/v1/app-metadata', { url });
}

const EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * The store CDN resets connections when several screenshots are pulled at
 * once, and it does it while the body is being read rather than on connect,
 * so the whole download is what has to be retried.
 */
async function download(url, attempts = 4) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;

      return {
        type: response.headers.get('content-type')?.split(';')[0] ?? 'image/jpeg',
        bytes: Buffer.from(await response.arrayBuffer()),
      };
    } catch (error) {
      if (attempt === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }

  return null;
}

/** A missing icon or shot is worth less than the listing, so it is skipped. */
async function upload(ownerId, assetUrl, name) {
  const asset = await download(assetUrl).catch(() => null);
  if (!asset) return null;

  const { type, bytes } = asset;
  const extension = EXTENSIONS[type] ?? 'jpg';
  const path = `${ownerId}/${Date.now().toString(36)}/${name}.${extension}`;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const stored = await fetch(`${URL_BASE}/storage/v1/object/listing-media/${path}`, {
        method: 'POST',
        headers: {
          apikey: SERVICE_KEY,
          Authorization: 'Bearer ' + SERVICE_KEY,
          'Content-Type': type,
          'x-upsert': 'true',
        },
        body: bytes,
      });

      return stored.ok ? path : null;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }

  return null;
}

async function removeExisting() {
  const existing = await api('GET', '/rest/v1/profiles?is_demo=eq.true&select=id');
  for (const profile of existing) {
    await api('DELETE', `/auth/v1/admin/users/${profile.id}`);
  }
  if (existing.length) console.log(`removed ${existing.length} existing demo builders`);
}

async function seed(builder) {
  const user = await api('POST', '/auth/v1/admin/users', {
    email: builder.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: builder.realName },
  });

  const ownerId = user.id;

  await api('PATCH', `/rest/v1/profiles?id=eq.${ownerId}`, {
    is_demo: true,
    username: builder.username,
    real_name: builder.realName,
    job: builder.job,
    workplace: builder.workplace,
    own_words: { intro: builder.bio },
    looking_for: ['Honest first impressions', 'Weekly testers'],
    app_interests: ['Productivity', 'Social'],
    role_tags: ['iOS', 'Solo'],
    onboarded_at: new Date().toISOString(),
    // Demo builders are Pro so they can hold a listing without the free limit
    // getting in the way of seeding.
    plan: 'pro',
  });

  const meta = await metadata(builder.url);

  const iconPath = meta.icon ? await upload(ownerId, meta.icon, 'icon') : null;

  // One at a time, which is what the store CDN tolerates.
  const shots = [];
  for (const [index, shot] of (meta.shots ?? []).slice(0, 6).entries()) {
    const path = await upload(ownerId, shot, `shot-${index}`);
    if (path) shots.push(path);
  }

  const [app] = await api(
    'POST',
    '/rest/v1/apps',
    {
      owner_id: ownerId,
      name: meta.name,
      // Store listings carry their real subtitle; a website rarely has one
      // short enough, so those are written out like a builder would.
      subtitle: meta.sub || builder.subtitle || '',
      category: meta.cats?.[0] ?? 'Productivity',
      stage: builder.stage,
      hue: meta.hue ?? 220,
      icon_path: iconPath,
      cover_path: shots[0] ?? null,
      is_primary: true,
      builder_role: builder.role,
      builder_style: builder.style,
      feedback_wanted: builder.feedbackWanted,
      links: meta.storeUrl ? { appstore: meta.storeUrl } : meta.web ? { web: meta.web } : {},
      ideal_users: {
        ages: ['25–34', '35–44'],
        gender: 'Anyone',
        interests: meta.cats ?? ['Productivity'],
        devices: ['iPhone'],
      },
      published_at: new Date().toISOString(),
      layout: LAYOUT,
      problem_of: builder.problemOf,
      problem_for: builder.problemFor,
      pricing_model: builder.pricingModel,
      price_from: builder.priceFrom ?? '',
      store_url: meta.storeUrl || builder.url,
      store_rating: meta.rating ?? null,
      store_rating_count: meta.ratingCount ?? null,
      badges: builder.badges ?? [],
    },
    { Prefer: 'return=representation' },
  );

  if (shots.length) {
    await api(
      'POST',
      '/rest/v1/app_media',
      shots.map((path, position) => ({
        app_id: app.id,
        position,
        kind: 'image',
        storage_path: path,
      })),
    );
  }

  await api(
    'POST',
    '/rest/v1/app_prompts',
    builder.prompts.map(([promptId, answer], slot) => ({
      app_id: app.id,
      slot,
      prompt_id: promptId,
      answer: answer.slice(0, 225),
    })),
  );

  console.log(`seeded ${builder.realName} · ${meta.name} · ${shots.length} shots`);
}

await removeExisting();

for (const builder of BUILDERS) {
  try {
    await seed(builder);
  } catch (error) {
    console.error(`failed on ${builder.realName}: ${error.message}`);
    console.error(error.cause ?? error.stack);
  }
}

console.log('\nDone. Discover now has listings, and the demo functions can act for them.');
