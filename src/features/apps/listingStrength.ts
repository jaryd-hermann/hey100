import type { AppConnection, IntegrationKey, OwnedApp } from '@/data/types';

export type StrengthItem = {
  key: string;
  label: string;
  done: boolean;
};

export function isVerifiedComplete(
  connections: Partial<Record<IntegrationKey, AppConnection | null | undefined>>,
): boolean {
  return !!connections.github && !!(connections.stripe || connections.revenuecat);
}

/** How complete a listing is, used on the My apps card. */
export function listingStrength(
  app: OwnedApp,
  connections: Partial<Record<IntegrationKey, AppConnection | null | undefined>>,
): { items: StrengthItem[]; done: number; total: number; ratio: number } {
  const items: StrengthItem[] = [
    { key: 'icon', label: 'Icon', done: !!app.icon },
    { key: 'banner', label: 'Banner', done: !!app.cover },
    { key: 'shots', label: 'Screenshots', done: (app.media?.length ?? 0) > 0 },
    { key: 'problem', label: 'Problem', done: !!(app.problemOf && app.problemFor) },
    { key: 'pricing', label: 'Pricing', done: !!app.pricingModel },
    { key: 'prompts', label: 'Prompts', done: (app.prompts?.length ?? 0) > 0 },
    {
      key: 'ideal',
      label: 'Audience',
      done: !!(app.ideal?.interests && app.ideal.interests !== 'Anyone'),
    },
    { key: 'pitch', label: 'Quick pitch', done: !!app.pitchUri },
    { key: 'verified', label: 'Verified', done: isVerifiedComplete(connections) },
  ];

  const done = items.filter((item) => item.done).length;
  return { items, done, total: items.length, ratio: done / items.length };
}

function connectionLines(row?: AppConnection | null): string[] {
  if (!row) return [];
  return [row.badge, row.on, row.detail, ...(row.badges ?? [])].filter(
    (line): line is string => !!line,
  );
}

function phraseFrom(lines: string[], pattern: RegExp): string | null {
  for (const line of lines) {
    const match = line.match(pattern);
    if (match?.[0]) return match[0].replace(/\s+/g, ' ').trim();
  }
  return null;
}

const MONEY = /\$[\d.,]+(?:\s*[–-]\s*\$?[\d.,]+)?[kKmM]?/i;
const COUNT = /[\d.,]+(?:\s*[–-]\s*[\d.,]+)?[kKmM]?/i;

/** Public verified money and customer bands for the My apps preview card. */
export function verifiedListingStats(
  app: OwnedApp,
  connections: Partial<Record<IntegrationKey, AppConnection | null | undefined>>,
): { revenue?: string; customers?: string } {
  const moneyLines = [
    ...connectionLines(connections.stripe),
    ...connectionLines(connections.revenuecat),
    ...(app.badges ?? []),
  ];
  const customerLines = [
    ...connectionLines(connections.revenuecat),
    ...connectionLines(connections.stripe),
    ...(app.badges ?? []),
  ];
  const revenue =
    phraseFrom(moneyLines, new RegExp(`${MONEY.source}\\s+MRR`, 'i')) ??
    phraseFrom(moneyLines, new RegExp(`${MONEY.source}\\s+revenue(?:\\s*\\(\\d+d\\))?`, 'i'));
  const customers =
    phraseFrom(customerLines, new RegExp(`${COUNT.source}\\s+customers`, 'i')) ??
    phraseFrom(customerLines, new RegExp(`${COUNT.source}\\s+(?:subscribers|subscriptions)`, 'i'));
  return {
    revenue: revenue ?? undefined,
    customers: customers ?? undefined,
  };
}
