import type { AppConnection, IntegrationKey } from '@/data/types';

/** Rebuild the verifications dropdown from public listing badges when the
 *  live `app_connections` rows are missing or have not loaded yet. */
export function connectionsFromBadges(
  badges: string[] | null | undefined,
): Partial<Record<IntegrationKey, AppConnection>> {
  const next: Partial<Record<IntegrationKey, AppConnection>> = {};

  for (const badge of badges ?? []) {
    const key = providerFromBadge(badge);
    if (!key) continue;
    const current = next[key];
    if (current) {
      current.badges = [...(current.badges ?? [current.badge]), badge];
      current.detail = [current.detail, badge].filter(Boolean).join(' · ');
      continue;
    }
    next[key] = {
      provider: key,
      badge,
      badges: [badge],
      on: badge,
    };
  }

  return next;
}

function providerFromBadge(badge: string): IntegrationKey | null {
  const lower = badge.toLowerCase();
  if (lower.includes('github')) return 'github';
  if (lower.includes('revenuecat') || lower.includes('rev cat')) return 'revenuecat';
  if (lower.includes('stripe')) return 'stripe';
  if (lower.includes('app store') || lower.includes('download')) return 'asc';
  return null;
}
