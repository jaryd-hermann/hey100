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
