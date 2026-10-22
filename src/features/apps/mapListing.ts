import type { AppInsert, AppPatch, AppRow, MediaRow, PromptRow } from '@/data/repo/listings';
import type { IdealUsers, MediaItem, OwnedApp, SectionKey, ShotLayout } from '@/data/types';
import { publicUrl } from '@/lib/supabase';

/**
 * Both directions in one file so they cannot drift.
 *
 * The notable difference between the two shapes is `ideal`: the database keeps
 * the spec's arrays because filtering and ranking need them, while the client
 * carries the comma-joined strings it renders. Joining on the way out and
 * splitting on the way in is the whole translation.
 */

type IdealRow = {
  ages?: string[];
  gender?: string;
  interests?: string[];
  devices?: string[];
};

function joined(values: string[] | undefined, fallback: string): string {
  const list = (values ?? []).filter(Boolean);
  return list.length ? list.join(', ') : fallback;
}

function split(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * What a listing needs to render, rather than the exact row shape. The owner's
 * own listings arrive as a PostgREST embed and other builders' arrive from
 * `app.listing_card`, and both satisfy this.
 */
export type ListingLike = AppRow & {
  app_media: Pick<MediaRow, 'position' | 'label' | 'kind' | 'storage_path'>[];
  app_prompts: Pick<PromptRow, 'slot' | 'prompt_id' | 'answer'>[];
};

export type ListingContext = {
  /** The owner's display name, which lives on the profile, not the listing. */
  builder: string;
  builderPhoto?: string;
  role?: string;
  style?: string;
  skills?: string[];
  builderSocials?: [string, string][];
  githubCommits?: number;
  /** Resolves a prompt id to its question text. */
  promptLabel: (promptId: string) => string;
};

export function toOwnedApp(row: ListingLike, ctx: ListingContext): OwnedApp {
  const ideal = (row.ideal_users ?? {}) as IdealRow;
  const links = (row.links ?? {}) as Record<string, string>;

  const media: MediaItem[] = [...row.app_media]
    .sort((a, b) => a.position - b.position)
    .map((item) => ({
      label: item.label ?? '',
      video: item.kind === 'video',
      uri: publicUrl('listing-media', item.storage_path),
    }));

  const prompts = [...row.app_prompts]
    .sort((a, b) => a.slot - b.slot)
    .map((item) => [ctx.promptLabel(item.prompt_id), item.answer] as [string, string]);

  const idealUsers: IdealUsers = {
    age: joined(ideal.ages, 'Any'),
    gender: ideal.gender || 'Anyone',
    interests: joined(ideal.interests, 'Anyone'),
    plat: joined(ideal.devices, 'iPhone'),
    wants: joined(row.feedback_wanted, 'anything').toLowerCase(),
  };

  return {
    id: row.id,
    ...(row.slug ? { slug: row.slug } : {}),
    name: row.name,
    sub: row.subtitle,
    cat: row.category,
    plat: row.platform,
    stage: row.stage,
    hue: row.hue,
    ...(row.icon_path ? { icon: publicUrl('listing-media', row.icon_path) } : {}),
    ...(row.cover_path ? { cover: publicUrl('listing-media', row.cover_path) } : {}),
    builder: ctx.builder,
    ...(ctx.builderPhoto ? { builderPhoto: ctx.builderPhoto } : {}),
    role: ctx.role || row.builder_role || '',
    style: ctx.style || row.builder_style || '',
    ...(ctx.skills?.length ? { skills: ctx.skills } : {}),
    ...(ctx.builderSocials?.length ? { builderSocials: ctx.builderSocials } : {}),
    ...(ctx.githubCommits != null ? { githubCommits: ctx.githubCommits } : {}),
    // Stats land with phase 6; an em dash is what the design shows for "no
    // data yet" and is honest until the counts are real.
    likes: '—',
    trades: 0,
    reply: '—',
    media,
    shotLayout: (row.shot_layout as ShotLayout) ?? 'vertical',
    prompts,
    ideal: idealUsers,
    badges: Array.isArray((row as { badges?: string[] }).badges)
      ? ((row as { badges?: string[] }).badges ?? [])
      : [],
    links: Object.entries(links)
      .filter(([, value]) => value)
      .map(([kind, value]) => [LINK_LABELS[kind] ?? kind, value] as [string, string]),
    code: row.test_code ?? undefined,
    asked: joined(row.feedback_wanted, '').toLowerCase() || undefined,
    problemOf: row.problem_of || undefined,
    problemFor: row.problem_for || undefined,
    pricingModel: row.pricing_model || undefined,
    priceFrom: row.price_from || undefined,
    onboarding: row.onboarding || undefined,
    ...(row.store_rating != null ? { storeRating: Number(row.store_rating) } : {}),
    ...(row.store_rating_count != null ? { storeRatingCount: Number(row.store_rating_count) } : {}),
    ...(row.store_url ? { storeUrl: row.store_url } : {}),
    ...(row.pitch_path
      ? { pitchUri: publicUrl('listing-media', row.pitch_path), pitchSeconds: row.pitch_seconds ?? 0 }
      : {}),
    views: 0,
    matches: 0,
    primary: row.is_primary,
    ...(row.listed_until ? { listedUntilDays: daysUntil(row.listed_until) } : {}),
    layout: (row.layout ?? []) as SectionKey[],
  };
}

const LINK_LABELS: Record<string, string> = {
  web: 'Web',
  appstore: 'App Store',
  x: 'X',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  testflight: 'TestFlight',
};

const LINK_KEYS = new Map(Object.entries(LINK_LABELS).map(([key, label]) => [label, key]));

function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

/**
 * Only the columns the client is granted. `likes`, `trades`, `reply`, `views`
 * and `matches` are server-owned stats, so they are deliberately dropped.
 */
export function toListingPatch(app: Partial<OwnedApp>): AppPatch {
  const patch: AppPatch = {};

  if (app.name !== undefined) patch.name = app.name;
  if (app.sub !== undefined) patch.subtitle = app.sub;
  if (app.cat !== undefined) patch.category = app.cat;
  if (app.plat !== undefined) patch.platform = app.plat;
  if (app.stage !== undefined) patch.stage = app.stage;
  if (app.hue !== undefined) patch.hue = app.hue;
  if (app.role !== undefined) patch.builder_role = app.role || null;
  if (app.style !== undefined) patch.builder_style = app.style || null;
  if (app.shotLayout !== undefined) patch.shot_layout = app.shotLayout;
  if (app.code !== undefined) patch.test_code = app.code || null;
  if (app.primary !== undefined) patch.is_primary = app.primary;
  if (app.layout !== undefined) patch.layout = app.layout;
  if (app.cover === '') patch.cover_path = null;
  if (app.problemOf !== undefined) patch.problem_of = app.problemOf;
  if (app.problemFor !== undefined) patch.problem_for = app.problemFor;
  if (app.pricingModel !== undefined) patch.pricing_model = app.pricingModel;
  if (app.priceFrom !== undefined) patch.price_from = app.priceFrom;
  if (app.onboarding !== undefined) patch.onboarding = app.onboarding;
  if (app.storeRating !== undefined) patch.store_rating = app.storeRating;
  if (app.storeRatingCount !== undefined) patch.store_rating_count = app.storeRatingCount;
  if (app.storeUrl !== undefined) patch.store_url = app.storeUrl || null;
  if (app.pitchSeconds !== undefined) patch.pitch_seconds = app.pitchSeconds;
  if (app.pitchUri === '') patch.pitch_path = null;

  if (app.ideal !== undefined) {
    patch.ideal_users = {
      ages: split(app.ideal.age),
      gender: app.ideal.gender,
      interests: split(app.ideal.interests),
      devices: split(app.ideal.plat),
    };
    patch.feedback_wanted = split(app.ideal.wants);
  }

  if (app.links !== undefined) {
    patch.links = Object.fromEntries(
      app.links
        .map(([label, value]) => [LINK_KEYS.get(label) ?? label.toLowerCase(), value])
        .filter(([, value]) => value),
    );
  }

  return patch;
}

/** The insert shape, minus `owner_id`, which the repository supplies. */
export function toListingInsert(app: Partial<OwnedApp>): Omit<AppInsert, 'owner_id'> {
  const patch = toListingPatch(app);

  return {
    ...patch,
    name: app.name || 'Your app',
    subtitle: app.sub ?? '',
    category: app.cat || 'Productivity',
    stage: app.stage || 'Idea',
    // Listing is a deliberate act, and it is what earns the referral bonus.
    published_at: new Date().toISOString(),
  };
}
