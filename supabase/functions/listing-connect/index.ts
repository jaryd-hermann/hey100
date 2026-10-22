/**
 * Connects a listing to GitHub, the App Store, RevenueCat or Stripe.
 *
 * Tokens and API keys stay here. The client only ever sees the banded
 * snapshot that goes on the public listing.
 *
 * GitHub is OAuth, then pick a repo — not a GitHub App install on that repo.
 * App Store is a public iTunes lookup (live only; downloads come later).
 * RevenueCat is a v2 secret key the builder pastes.
 * Stripe is Connect OAuth with read_only.
 */

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const APP_REDIRECT = 'hey100://connect';

type Provider = 'github' | 'asc' | 'revenuecat' | 'stripe';

type Snapshot = {
  badge: string;
  /** Extra public rows from one connect, e.g. RevenueCat traction bands. */
  badges?: string[];
  label: string;
  detail?: string;
  snapshot: Record<string, unknown>;
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: CORS });
}

function env(name: string): string {
  return Deno.env.get(name) ?? '';
}

function admin(): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function functionUrl(): string {
  return `${env('SUPABASE_URL')}/functions/v1/listing-connect`;
}

function countBand(n: number): string {
  if (n < 10) return '1–10';
  if (n < 50) return '10–50';
  if (n < 100) return '50–100';
  if (n < 500) return '100–500';
  if (n < 1000) return '500–1k';
  return '1k+';
}

function moneyBand(usd: number): string {
  if (usd < 100) return '$1–100';
  if (usd < 1000) return '$100–1k';
  if (usd < 5000) return '$1k–5k';
  if (usd < 10000) return '$5k–10k';
  return '$10k+';
}

async function userFrom(request: Request): Promise<{ id: string } | null> {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await db.auth.getUser(token);
  return data.user ? { id: data.user.id } : null;
}

async function ownedApp(db: SupabaseClient, userId: string, appId: string) {
  const { data } = await db.from('apps').select('id, owner_id, store_url, badges').eq('id', appId).maybeSingle();
  if (!data || data.owner_id !== userId) return null;
  return data;
}

async function upsertConnection(
  db: SupabaseClient,
  appId: string,
  provider: Provider,
  snap: Snapshot,
  secret?: Record<string, unknown>,
) {
  const { data, error } = await db
    .from('app_connections')
    .upsert(
      {
        app_id: appId,
        provider,
        badge: snap.badge,
        label: snap.label,
        detail: snap.detail ?? null,
        snapshot: snap.snapshot,
        checked_at: new Date().toISOString(),
      },
      { onConflict: 'app_id,provider' },
    )
    .select('id')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Could not save connection');

  if (secret) {
    await db.from('app_connection_secrets').upsert({
      connection_id: data.id,
      payload: secret,
      updated_at: new Date().toISOString(),
    });
  }

  await refreshBadges(db, appId);
  return data.id;
}

async function refreshBadges(db: SupabaseClient, appId: string) {
  const { data } = await db.from('app_connections').select('badge, snapshot').eq('app_id', appId);
  const badges = (data ?? []).flatMap((row) => {
    const extra = (row.snapshot as { badges?: unknown } | null)?.badges;
    return Array.isArray(extra) && extra.length
      ? extra.filter((item): item is string => typeof item === 'string')
      : [row.badge];
  });
  await db.from('apps').update({ badges }).eq('id', appId);
}

async function saveState(db: SupabaseClient, userId: string, appId: string | null, provider: Provider) {
  const { data, error } = await db.from('app_oauth_states').insert({
    user_id: userId,
    app_id: appId,
    provider,
  }).select('id').single();
  if (error || !data) throw new Error(error?.message ?? 'Could not start OAuth');
  return data.id as string;
}

async function takeState(db: SupabaseClient, id: string) {
  const { data } = await db.from('app_oauth_states').select('*').eq('id', id).maybeSingle();
  if (!data) return null;
  await db.from('app_oauth_states').delete().eq('id', id);
  const age = Date.now() - new Date(data.created_at).getTime();
  if (age > 15 * 60 * 1000) return null;
  return data as { id: string; user_id: string; app_id: string | null; provider: string };
}

function redirectApp(params: Record<string, string>) {
  const url = new URL(APP_REDIRECT);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return new Response(null, { status: 302, headers: { ...CORS, Location: url.toString() } });
}

/* ---------------------------------------------------------------- */
/* GitHub                                                            */
/* ---------------------------------------------------------------- */

function ghHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'hey100',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function commitCountFrom(response: Response, rows: unknown): number {
  const link = response.headers.get('link') ?? '';
  const last = /[?&]page=(\d+)>;\s*rel="last"/.exec(link);
  if (last) return Number(last[1]);
  return Array.isArray(rows) ? rows.length : 0;
}

async function githubRepoCommits(token: string, fullName: string): Promise<number> {
  const res = await fetch(`https://api.github.com/repos/${fullName}/commits?per_page=1`, {
    headers: ghHeaders(token),
  });
  if (!res.ok) return 0;
  return commitCountFrom(res, await res.json());
}

async function githubMe(token: string): Promise<{ login: string }> {
  const res = await fetch('https://api.github.com/user', { headers: ghHeaders(token) });
  if (!res.ok) throw new Error('Could not read the GitHub account');
  const body = (await res.json()) as { login?: string };
  if (!body.login) throw new Error('That GitHub account has no username');
  return { login: body.login };
}

async function githubAuthorCommits(token: string, login: string): Promise<number> {
  const search = await fetch(
    `https://api.github.com/search/commits?q=${encodeURIComponent(`author:${login}`)}&per_page=1`,
    { headers: ghHeaders(token) },
  );
  if (search.ok) {
    const body = (await search.json()) as { total_count?: number };
    if (typeof body.total_count === 'number') return body.total_count;
  }

  const repos = await githubRepos(token);
  let total = 0;
  for (const repo of repos.slice(0, 25)) {
    const res = await fetch(
      `https://api.github.com/repos/${repo.fullName}/commits?author=${encodeURIComponent(login)}&per_page=1`,
      { headers: ghHeaders(token) },
    );
    if (!res.ok) continue;
    total += commitCountFrom(res, await res.json());
  }
  return total;
}

async function syncProfileGithub(
  db: SupabaseClient,
  userId: string,
  token: string,
): Promise<{ login: string; commits: number }> {
  const { login } = await githubMe(token);
  const commits = await githubAuthorCommits(token, login);
  await db.from('profiles').update({ github_login: login, github_commits: commits }).eq('id', userId);
  await db.from('profile_secrets').upsert({
    user_id: userId,
    provider: 'github',
    payload: { access_token: token },
    updated_at: new Date().toISOString(),
  });
  return { login, commits };
}

async function profileGithubTokens(db: SupabaseClient, userId: string): Promise<string[]> {
  const found: string[] = [];
  const add = (token?: string | null) => {
    if (token && !found.includes(token)) found.push(token);
  };

  const { data } = await db
    .from('profile_secrets')
    .select('payload')
    .eq('user_id', userId)
    .eq('provider', 'github')
    .maybeSingle();
  add((data?.payload as { access_token?: string } | null)?.access_token);

  const { data: apps } = await db.from('apps').select('id').eq('owner_id', userId);
  const ids = (apps ?? []).map((app) => app.id);
  if (!ids.length) return found;

  const { data: conns } = await db
    .from('app_connections')
    .select('id')
    .eq('provider', 'github')
    .in('app_id', ids);
  const connIds = (conns ?? []).map((row) => row.id);
  if (!connIds.length) return found;

  const { data: secrets } = await db
    .from('app_connection_secrets')
    .select('payload')
    .in('connection_id', connIds);
  for (const row of secrets ?? []) {
    add((row.payload as { access_token?: string } | null)?.access_token);
  }
  return found;
}

async function githubStart(db: SupabaseClient, userId: string, appId: string | null) {
  const clientId = env('GITHUB_CLIENT_ID');
  if (!clientId) throw new Error('GitHub OAuth is not configured yet');
  const state = await saveState(db, userId, appId, 'github');
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', `${functionUrl()}/github/callback`);
  url.searchParams.set('scope', 'read:user repo');
  url.searchParams.set('state', state);
  return { url: url.toString() };
}

async function githubCallback(db: SupabaseClient, url: URL) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) return redirectApp({ status: 'error', reason: 'missing_code', provider: 'github' });
  const row = await takeState(db, state);
  if (!row) return redirectApp({ status: 'error', reason: 'expired', provider: 'github' });

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env('GITHUB_CLIENT_ID'),
      client_secret: env('GITHUB_CLIENT_SECRET'),
      code,
      redirect_uri: `${functionUrl()}/github/callback`,
    }),
  });
  const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string };
  if (!tokenJson.access_token) {
    return redirectApp({ status: 'error', reason: tokenJson.error ?? 'token', provider: 'github' });
  }

  const token = tokenJson.access_token;
  await syncProfileGithub(db, row.user_id, token).catch(() => {});

  if (row.app_id) {
    await upsertConnection(
      db,
      row.app_id,
      'github',
      {
        badge: 'GitHub · pick a repo',
        label: 'Signed in · pick a repo',
        snapshot: { pending: true },
      },
      { access_token: token },
    );
    return redirectApp({ status: 'ok', provider: 'github', app_id: row.app_id, next: 'repos' });
  }

  return redirectApp({ status: 'ok', provider: 'github', next: 'profile' });
}

async function githubToken(db: SupabaseClient, appId: string): Promise<string | null> {
  const { data: conn } = await db
    .from('app_connections')
    .select('id')
    .eq('app_id', appId)
    .eq('provider', 'github')
    .maybeSingle();
  if (!conn) return null;
  const { data } = await db.from('app_connection_secrets').select('payload').eq('connection_id', conn.id).maybeSingle();
  const token = (data?.payload as { access_token?: string } | null)?.access_token;
  return token ?? null;
}

async function githubRepos(token: string) {
  const repos: { fullName: string; private: boolean; pushedAt: string }[] = [];
  for (let page = 1; page <= 3; page += 1) {
    const res = await fetch(
      `https://api.github.com/user/repos?per_page=100&page=${page}&sort=pushed&affiliation=owner,collaborator,organization_member`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'hey100' } },
    );
    if (!res.ok) throw new Error('GitHub would not list your repos');
    const rows = (await res.json()) as { full_name: string; private: boolean; pushed_at: string }[];
    for (const row of rows) {
      repos.push({ fullName: row.full_name, private: row.private, pushedAt: row.pushed_at });
    }
    if (rows.length < 100) break;
  }
  return repos;
}

async function githubSelect(db: SupabaseClient, appId: string, fullName: string, token: string) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  let commits = 0;
  let lastMessage = '';
  let lastAt = '';

  for (let page = 1; page <= 3; page += 1) {
    const res = await fetch(
      `https://api.github.com/repos/${fullName}/commits?since=${encodeURIComponent(since)}&per_page=100&page=${page}`,
      { headers: ghHeaders(token) },
    );
    if (!res.ok) throw new Error('Could not read commits on that repo');
    const rows = (await res.json()) as { commit?: { message?: string; committer?: { date?: string } } }[];
    if (page === 1 && rows[0]) {
      lastMessage = (rows[0].commit?.message ?? '').split('\n')[0].slice(0, 80);
      lastAt = rows[0].commit?.committer?.date ?? '';
    }
    commits += rows.length;
    if (rows.length < 100) break;
  }

  const total = await githubRepoCommits(token, fullName);
  const band = countBand(Math.max(commits, 1));
  const ago = lastAt ? shortAgo(lastAt) : 'recently';
  const totalLabel = `${total.toLocaleString()} commits`;
  const snap: Snapshot = {
    badge: total > 0 ? `GitHub · ${totalLabel}` : `GitHub · ${band} commits in 30 days`,
    badges: [
      total > 0 ? `GitHub · ${totalLabel}` : `GitHub · ${band} commits in 30 days`,
      commits > 0 ? `GitHub · ${band} in the last 30 days` : '',
    ].filter(Boolean),
    label: total > 0 ? totalLabel : `${band} commits in 30 days`,
    detail: lastMessage ? `${fullName} · last ${ago} · ${lastMessage}` : `${fullName} · last ${ago}`,
    snapshot: {
      repo: fullName,
      commits_30d: commits,
      commits_total: total,
      last_commit_at: lastAt,
      last_message: lastMessage,
    },
  };

  await upsertConnection(db, appId, 'github', snap, { access_token: token, repo: fullName });
  const { data: owner } = await db.from('apps').select('owner_id').eq('id', appId).maybeSingle();
  if (owner?.owner_id) await syncProfileGithub(db, owner.owner_id, token).catch(() => {});
  return snap;
}

function shortAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(1, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/* ---------------------------------------------------------------- */
/* App Store (live only)                                             */
/* ---------------------------------------------------------------- */

function parseStore(input: string): { id?: string; bundle?: string; country: string } {
  const trimmed = input.trim();
  const full = /apps\.apple\.com\/([a-z]{2})\/app\/[^/?#]+\/id(\d+)/i.exec(trimmed);
  if (full) return { id: full[2], country: full[1] };
  const loose = /apps\.apple\.com\/.*id(\d+)/i.exec(trimmed);
  if (loose) return { id: loose[1], country: 'us' };
  if (/^\d+$/.test(trimmed)) return { id: trimmed, country: 'us' };
  return { bundle: trimmed.replace(/^id/i, ''), country: 'us' };
}

async function verifyAsc(input: string): Promise<Snapshot> {
  const parsed = parseStore(input);
  const query = parsed.id
    ? `id=${parsed.id}&country=${parsed.country}`
    : `bundleId=${encodeURIComponent(parsed.bundle ?? '')}&country=${parsed.country}`;
  const res = await fetch(`https://itunes.apple.com/lookup?${query}&entity=software`);
  const body = (await res.json()) as {
    resultCount?: number;
    results?: {
      trackName?: string;
      bundleId?: string;
      trackId?: number;
      averageUserRating?: number;
      userRatingCount?: number;
    }[];
  };
  const app = body.results?.[0];
  if (!app?.trackId) throw new Error('No live App Store listing matched that link');

  return {
    badge: 'Live on the App Store',
    label: 'Live on the App Store',
    detail: app.trackName ?? app.bundleId,
    snapshot: {
      track_id: app.trackId,
      bundle_id: app.bundleId,
      name: app.trackName,
      rating: typeof app.averageUserRating === 'number' ? app.averageUserRating : null,
      rating_count: typeof app.userRatingCount === 'number' ? app.userRatingCount : null,
    },
  };
}

/* ---------------------------------------------------------------- */
/* RevenueCat                                                        */
/* ---------------------------------------------------------------- */

async function rcProjects(apiKey: string) {
  const res = await fetch('https://api.revenuecat.com/v2/projects', {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    const message = body.message ?? '';
    if (/project_configuration:projects:read/i.test(message)) {
      throw new Error(
        'This key needs Project configuration → Projects → Read. Edit the key in RevenueCat, then try again.',
      );
    }
    throw new Error(message || 'RevenueCat rejected that key. Use a v2 secret key.');
  }
  const body = (await res.json()) as { items?: { id: string; name?: string }[] };
  return (body.items ?? []).map((item) => ({ id: item.id, name: item.name ?? item.id }));
}

type RcMetric = { id?: string; name?: string; value?: number };

function rcValue(metrics: RcMetric[], ids: string | string[], fallback: RegExp): number | null {
  const wanted = new Set(Array.isArray(ids) ? ids : [ids]);
  const exact = metrics.find((item) => item.id && wanted.has(item.id));
  if (typeof exact?.value === 'number') return exact.value;
  const fuzzy = metrics.find((item) => fallback.test(`${item.id ?? ''} ${item.name ?? ''}`));
  return typeof fuzzy?.value === 'number' ? fuzzy.value : null;
}

async function rcOverview(apiKey: string, projectId: string) {
  const res = await fetch(
    `https://api.revenuecat.com/v2/projects/${projectId}/metrics/overview?currency=USD`,
    { headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' } },
  );
  if (!res.ok) return null;
  const body = (await res.json()) as { metrics?: RcMetric[] };
  const metrics = body.metrics ?? [];
  return {
    subscriptions: rcValue(metrics, 'active_subscriptions', /active[-_ ]+sub(?!.*trial)/i),
    mrr: rcValue(metrics, 'mrr', /\bmrr\b|monthly recurring/i),
    revenue: rcValue(metrics, 'revenue', /^(?!.*mrr).*revenue/i),
    customers: rcValue(
      metrics,
      ['active_customers', 'customers_active', 'active_users'],
      /active[-_ ]+(customers?|users?)|customers[-_ ]+active/i,
    ),
  };
}

function countPhrase(n: number | null, suffix: string): string | null {
  if (n == null || n <= 0) return null;
  return `${countBand(n)} ${suffix}`;
}

function moneyPhrase(n: number | null, suffix: string): string | null {
  if (n == null || n <= 0) return null;
  return `${moneyBand(n)} ${suffix}`;
}

async function connectRevenueCat(apiKey: string, projectId: string, projectName: string): Promise<Snapshot> {
  const overview = await rcOverview(apiKey, projectId);
  const subscriptions = overview?.subscriptions ?? null;
  const mrr = overview?.mrr ?? null;
  const revenue = overview?.revenue ?? null;
  const customers = overview?.customers ?? null;

  const lines = [
    countPhrase(subscriptions, 'subscriptions'),
    moneyPhrase(mrr, 'MRR'),
    moneyPhrase(revenue, 'revenue (28d)'),
    countPhrase(customers, 'customers'),
  ].filter((item): item is string => !!item);

  if (!overview || !lines.length) {
    return {
      badge: 'RevenueCat · connected',
      badges: ['RevenueCat · connected'],
      label: 'Connected',
      detail: projectName,
      snapshot: {
        project_id: projectId,
        project_name: projectName,
        badges: ['RevenueCat · connected'],
      },
    };
  }

  const badges = lines.map((line) => `RevenueCat · ${line}`);

  return {
    badge: badges[0],
    badges,
    label: lines[0] ?? 'Connected',
    detail: [projectName, ...lines.slice(1)].filter(Boolean).join(' · '),
    snapshot: {
      project_id: projectId,
      project_name: projectName,
      subscriptions,
      mrr,
      revenue,
      customers,
      badges,
    },
  };
}

/* ---------------------------------------------------------------- */
/* Stripe                                                            */
/* ---------------------------------------------------------------- */

async function stripeStart(db: SupabaseClient, userId: string, appId: string) {
  const clientId = env('STRIPE_CLIENT_ID');
  if (!clientId) throw new Error('Stripe Connect is not configured yet');
  const state = await saveState(db, userId, appId, 'stripe');
  const url = new URL('https://connect.stripe.com/oauth/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('scope', 'read_only');
  url.searchParams.set('redirect_uri', `${functionUrl()}/stripe/callback`);
  url.searchParams.set('state', state);
  return { url: url.toString() };
}

async function stripeCallback(db: SupabaseClient, url: URL) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) return redirectApp({ status: 'error', reason: 'missing_code', provider: 'stripe' });
  const row = await takeState(db, state);
  if (!row) return redirectApp({ status: 'error', reason: 'expired', provider: 'stripe' });

  const tokenRes = await fetch('https://connect.stripe.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: env('STRIPE_CLIENT_ID'),
      client_secret: env('STRIPE_SECRET_KEY'),
      code,
    }),
  });
  const tokenJson = (await tokenRes.json()) as { stripe_user_id?: string; error?: string };
  if (!tokenJson.stripe_user_id) {
    return redirectApp({ status: 'error', reason: tokenJson.error ?? 'token', provider: 'stripe' });
  }

  const snap = await stripeSnapshot(tokenJson.stripe_user_id);
  await upsertConnection(db, row.app_id, 'stripe', snap, { stripe_user_id: tokenJson.stripe_user_id });
  return redirectApp({ status: 'ok', provider: 'stripe', app_id: row.app_id });
}

async function stripeGet(
  apiKey: string,
  path: string,
  query?: Record<string, string>,
): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  const url = new URL(`https://api.stripe.com/v1/${path}`);
  Object.entries(query ?? {}).forEach(([key, value]) => url.searchParams.set(key, value));
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, body };
}

async function stripePages<T extends { id: string }>(
  apiKey: string,
  path: string,
  query: Record<string, string>,
): Promise<T[]> {
  const rows: T[] = [];
  let startingAfter = '';
  for (let page = 0; page < 5; page += 1) {
    const params = { ...query, limit: '100' };
    if (startingAfter) params.starting_after = startingAfter;
    const { ok, body } = await stripeGet(apiKey, path, params);
    if (!ok) {
      const message = typeof body.error === 'object' && body.error && 'message' in body.error
        ? String((body.error as { message?: string }).message)
        : 'Stripe rejected that key';
      throw new Error(message);
    }
    const data = (body.data as T[] | undefined) ?? [];
    rows.push(...data);
    if (!body.has_more || !data.length) break;
    startingAfter = data[data.length - 1].id;
  }
  return rows;
}

async function connectStripe(apiKey: string): Promise<Snapshot> {
  const trimmed = apiKey.trim();
  if (!/^rk_(live|test)_/.test(trimmed)) {
    throw new Error('Use a restricted key (rk_…). Charges and Subscriptions: Read. Do not paste a secret key.');
  }

  type Sub = {
    id: string;
    items?: { data?: { price?: { unit_amount?: number; recurring?: { interval?: string; interval_count?: number } } }[] };
  };
  type Charge = { id: string; paid?: boolean; amount?: number; amount_refunded?: number };

  const [subs, charges] = await Promise.all([
    stripePages<Sub>(trimmed, 'subscriptions', { status: 'active' }),
    stripePages<Charge>(trimmed, 'charges', {
      'created[gte]': String(Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60),
    }),
  ]);

  let mrr = 0;
  for (const sub of subs) {
    for (const item of sub.items?.data ?? []) {
      const amount = (item.price?.unit_amount ?? 0) / 100;
      const interval = item.price?.recurring?.interval ?? 'month';
      const count = item.price?.recurring?.interval_count ?? 1;
      if (interval === 'year') mrr += amount / (12 * count);
      else if (interval === 'week') mrr += (amount * 52) / (12 * count);
      else if (interval === 'day') mrr += (amount * 365) / (12 * count);
      else mrr += amount / count;
    }
  }

  const revenue30 = charges.reduce((sum, charge) => {
    if (!charge.paid) return sum;
    return sum + ((charge.amount ?? 0) - (charge.amount_refunded ?? 0)) / 100;
  }, 0);

  const lines = [
    mrr > 0 ? `${moneyBand(mrr)} MRR` : null,
    revenue30 > 0 ? `${moneyBand(revenue30)} revenue (30d)` : null,
    subs.length > 0 ? `${countBand(subs.length)} subscriptions` : null,
  ].filter((item): item is string => !!item);

  const badges = lines.length ? lines.map((line) => `Stripe · ${line}`) : ['Stripe · connected'];

  return {
    badge: badges[0],
    badges,
    label: lines[0] ?? 'Connected',
    detail: lines.slice(1).join(' · ') || undefined,
    snapshot: { mrr, revenue_30d: revenue30, subscriptions: subs.length, badges },
  };
}

/* ---------------------------------------------------------------- */
/* HTTP                                                              */
/* ---------------------------------------------------------------- */

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  const db = admin();

  try {
    const path = url.pathname;
    if (
      request.method === 'GET' &&
      (action === 'github_callback' || path.endsWith('/github/callback'))
    ) {
      return await githubCallback(db, url);
    }
    if (
      request.method === 'GET' &&
      (action === 'stripe_callback' || path.endsWith('/stripe/callback'))
    ) {
      return await stripeCallback(db, url);
    }

    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    const user = await userFrom(request);
    if (!user) return json({ error: 'Sign in first' }, 401);

    const body = (await request.json()) as {
      action?: string;
      appId?: string;
      repo?: string;
      url?: string;
      apiKey?: string;
      projectId?: string;
      projectName?: string;
      provider?: Provider;
    };

    const act = body.action;
    if (act === 'status') {
      const clientId = !!env('GITHUB_CLIENT_ID');
      return json({ github: clientId, stripe: true, revenuecat: true, asc: true });
    }

    if (act === 'github_profile_start') return json(await githubStart(db, user.id, null));

    if (act === 'github_profile_sync') {
      const tokens = await profileGithubTokens(db, user.id);
      for (const token of tokens) {
        try {
          return json(await syncProfileGithub(db, user.id, token));
        } catch {
          // Stale listing or profile token — try the next, then OAuth.
        }
      }
      return json(await githubStart(db, user.id, null));
    }

    if (!body.appId) return json({ error: 'appId is required' }, 400);
    const app = await ownedApp(db, user.id, body.appId);
    if (!app) return json({ error: 'Not your listing' }, 403);

    if (act === 'list') {
      const { data } = await db
        .from('app_connections')
        .select('provider, badge, label, detail, checked_at, snapshot')
        .eq('app_id', body.appId);
      const github = (data ?? []).find((row) => row.provider === 'github');
      const snap = (github?.snapshot ?? {}) as { repo?: string; commits_total?: number };
      if (snap.repo && snap.commits_total == null) {
        const token = await githubToken(db, body.appId);
        if (token) {
          await githubSelect(db, body.appId, snap.repo, token);
          const { data: next } = await db
            .from('app_connections')
            .select('provider, badge, label, detail, checked_at, snapshot')
            .eq('app_id', body.appId);
          return json({ connections: next ?? [] });
        }
      }
      return json({ connections: data ?? [] });
    }

    if (act === 'disconnect') {
      if (!body.provider) return json({ error: 'provider is required' }, 400);
      await db.from('app_connections').delete().eq('app_id', body.appId).eq('provider', body.provider);
      await refreshBadges(db, body.appId);
      return json({ ok: true });
    }

    if (act === 'github_start') return json(await githubStart(db, user.id, body.appId));

    if (act === 'github_repos') {
      const token = await githubToken(db, body.appId);
      if (!token) return json({ error: 'Sign in with GitHub first' }, 400);
      return json({ repos: await githubRepos(token) });
    }

    if (act === 'github_select') {
      if (!body.repo) return json({ error: 'repo is required' }, 400);
      const token = await githubToken(db, body.appId);
      if (!token) return json({ error: 'Sign in with GitHub first' }, 400);
      return json(await githubSelect(db, body.appId, body.repo, token));
    }

    if (act === 'asc_verify') {
      const target = body.url || app.store_url;
      if (!target) return json({ error: 'Paste an App Store URL or bundle id' }, 400);
      const snap = await verifyAsc(target);
      await upsertConnection(db, body.appId, 'asc', snap);
      await db
        .from('apps')
        .update({
          store_url: target,
          ...(typeof snap.snapshot.rating === 'number' ? { store_rating: snap.snapshot.rating } : {}),
          ...(typeof snap.snapshot.rating_count === 'number'
            ? { store_rating_count: snap.snapshot.rating_count }
            : {}),
        })
        .eq('id', body.appId);
      return json(snap);
    }

    if (act === 'revenuecat_projects') {
      if (!body.apiKey) return json({ error: 'apiKey is required' }, 400);
      return json({ projects: await rcProjects(body.apiKey) });
    }

    if (act === 'revenuecat_connect') {
      if (!body.apiKey || !body.projectId) return json({ error: 'apiKey and projectId are required' }, 400);
      const snap = await connectRevenueCat(body.apiKey, body.projectId, body.projectName || body.projectId);
      await upsertConnection(db, body.appId, 'revenuecat', snap, {
        api_key: body.apiKey,
        project_id: body.projectId,
      });
      return json(snap);
    }

    if (act === 'stripe_connect') {
      if (!body.apiKey) return json({ error: 'apiKey is required' }, 400);
      const snap = await connectStripe(body.apiKey);
      await upsertConnection(db, body.appId, 'stripe', snap, { api_key: body.apiKey });
      return json(snap);
    }

    if (act === 'stripe_start') return json(await stripeStart(db, user.id, body.appId));

    return json({ error: 'Unknown action' }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Connect failed' }, 400);
  }
});
