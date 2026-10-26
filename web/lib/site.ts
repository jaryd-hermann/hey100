export const SITE = 'https://hey100.com';
export const BUNDLE_ID = 'com.hey100.app';

export const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL ?? '';
export const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID ?? '38NFF5BY78';

export const RESERVED = new Set([
  'i',
  'g',
  'l',
  'u',
  'w',
  'badge',
  'api',
  'app',
  'invite',
  'group',
  'listing',
  'onboarding',
  'settings',
  'apple-app-site-association',
]);

export function appLink(path: string): string {
  return `hey100://${path.replace(/^\//, '')}`;
}

export function publicMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  if (!base) return null;
  return `${base}/storage/v1/object/public/listing-media/${path}`;
}
