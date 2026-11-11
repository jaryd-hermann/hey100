import type { IntegrationKey } from '@/data/types';

export type FlowId = Exclude<IntegrationKey, 'asc'>;

export type FlowWhy = { icon: string; text: string; color: string };
export type FlowRow = { title: string; body?: string; code?: string };

export type IntegrationFlowCopy = {
  id: FlowId;
  name: string;
  tagline: string;
  kicker: string;
  title: string;
  what: string;
  whys: FlowWhy[];
  shows: string[];
  step1Bg: string;
  step1Dark: boolean;
  step2Bg: string;
  step2Dark: boolean;
  kicker2: string;
  title2: string;
  sub2: string;
  keyLabel?: string;
  keyPlaceholder?: string;
  prefix?: string;
  whereLabel: string;
  whereTitle: string;
  where: FlowRow[];
  whereLink?: string;
  whereHref?: string;
  safe: FlowRow[];
  period: string;
  sync: string;
  group: string;
  groupMeta: string;
  groupInitial: string;
  groupColor: string;
  /** Partner tile behind the glyph on the first step. */
  brand: string;
  glyph: string;
};

const LIME = '#C6F24E';
const YELLOW = '#FFFF00';
const CYAN = '#00FFFF';
const MAGENTA = '#FF00FF';

export const FLOWS: Record<FlowId, IntegrationFlowCopy> = {
  stripe: {
    id: 'stripe',
    name: 'Stripe',
    tagline: 'For web apps · MRR and sales',
    kicker: 'VERIFY REVENUE · WEB APPS',
    title: 'Show your web app is earning.',
    what: 'Stripe handles payments for your web app. Connecting it puts a verified MRR range on your profile, pulled straight from Stripe.',
    whys: [
      { icon: '$', text: 'Builders trust apps that are actually earning.', color: YELLOW },
      { icon: '✓', text: 'Adds a Verified revenue badge to your profile.', color: LIME },
      { icon: '⇧', text: 'Unlocks revenue groups like Revenue Builders.', color: CYAN },
    ],
    shows: ['MRR range', 'Customers', 'Sales · 30 days'],
    step1Bg: '#0020A1',
    step1Dark: true,
    step2Bg: MAGENTA,
    step2Dark: false,
    kicker2: 'READ-ONLY RESTRICTED KEY',
    title2: 'Paste your Stripe key',
    sub2: 'Use a restricted key with read access. It starts with rk_live_.',
    keyLabel: 'STRIPE RESTRICTED KEY',
    keyPlaceholder: 'rk_live_…',
    prefix: 'rk_',
    whereLabel: 'Where do I get this?',
    whereTitle: 'Where do I get this?',
    where: [
      { title: 'Open your Stripe Dashboard', body: 'Go to Developers, then API keys.' },
      { title: 'Create a restricted key', body: 'Click "Create restricted key" and name it Hey100.' },
      {
        title: 'Give it read access only',
        body: 'Set Charges, Customers, Subscriptions and Invoices to Read. Leave everything else as None.',
      },
      { title: 'Copy and paste it here', body: 'Use the live key, not the test key.', code: 'rk_live_…' },
    ],
    whereLink: 'Open Stripe Dashboard',
    whereHref: 'https://dashboard.stripe.com/apikeys',
    safe: [
      {
        title: 'Read-only',
        body: 'The key can only read. It can never charge, refund, edit or delete anything in Stripe.',
      },
      {
        title: "We don't keep your data",
        body: "We ask Stripe's API for a few totals and display them. Customer details and payment records never reach Hey100.",
      },
      {
        title: 'Only what you see',
        body: 'Your profile shows the numbers on the next screen, as ranges unless you choose exact.',
      },
      {
        title: 'Revoke anytime',
        body: 'Delete the key in Stripe, or disconnect in Settings → Integrations. The badge goes away.',
      },
    ],
    period: 'LAST 30 DAYS',
    sync: 'Last synced just now · updates daily',
    group: 'Revenue Builders',
    groupMeta: 'Verified revenue only · 530 members',
    groupInitial: 'R',
    groupColor: LIME,
    brand: '#635BFF',
    glyph: 'S',
  },
  revenuecat: {
    id: 'revenuecat',
    name: 'RevenueCat',
    tagline: 'For mobile apps · subscriptions and customers',
    kicker: 'VERIFY REVENUE · MOBILE APPS',
    title: 'Show real subscribers.',
    what: 'RevenueCat runs in-app subscriptions for iOS and Android. Connecting it shows verified revenue, active subscriptions and customers.',
    whys: [
      { icon: '$', text: 'Proves people pay for your app, not just download it.', color: YELLOW },
      { icon: '✓', text: 'Adds a Verified subscriptions badge to your profile.', color: LIME },
      { icon: '⇧', text: 'Unlocks groups like Subscription Apps.', color: MAGENTA },
    ],
    shows: ['Revenue range', 'Active subscriptions', 'Customers'],
    step1Bg: '#FF5900',
    step1Dark: false,
    step2Bg: YELLOW,
    step2Dark: false,
    kicker2: 'READ-ONLY SECRET KEY',
    title2: 'Paste your RevenueCat key',
    sub2: 'Use a V2 secret key with read-only access. It starts with sk_.',
    keyLabel: 'REVENUECAT SECRET KEY',
    keyPlaceholder: 'sk_…',
    prefix: 'sk_',
    whereLabel: 'Where do I get this?',
    whereTitle: 'Where do I get this?',
    where: [
      {
        title: 'Open your RevenueCat dashboard',
        body: 'Pick your project, then Project settings and API keys.',
      },
      { title: 'Create a new secret key', body: 'Under Secret API keys, tap + New and choose V2.' },
      {
        title: 'Set every permission to read-only',
        body: 'Charts & metrics and Customer information need Read. Nothing needs Write.',
      },
      {
        title: 'Copy and paste it here',
        body: 'You only see the full key once, so copy it straight away.',
        code: 'sk_…',
      },
    ],
    whereLink: 'Open RevenueCat',
    whereHref: 'https://app.revenuecat.com',
    safe: [
      {
        title: 'Read-only',
        body: 'The key can only read. It can never charge, refund, edit or delete anything in RevenueCat.',
      },
      {
        title: "We don't keep your data",
        body: "We ask RevenueCat's API for a few totals and display them. Customer details and payment records never reach Hey100.",
      },
      {
        title: 'Only what you see',
        body: 'Your profile shows the numbers on the next screen, as ranges unless you choose exact.',
      },
      {
        title: 'Revoke anytime',
        body: 'Delete the key in RevenueCat, or disconnect in Settings → Integrations. The badge goes away.',
      },
    ],
    period: 'LAST 28 DAYS',
    sync: 'Last synced just now · updates daily',
    group: 'Subscription Apps',
    groupMeta: 'Verified subscriptions only · 410 members',
    groupInitial: 'S',
    groupColor: MAGENTA,
    brand: '#F2545B',
    glyph: 'RC',
  },
  github: {
    id: 'github',
    name: 'GitHub',
    tagline: 'Verified commits · shows you actively build',
    kicker: 'VERIFY YOU SHIP',
    title: 'Show you actually build.',
    what: 'Connect GitHub to show verified commit activity. Builders can see you ship, not just talk about it.',
    whys: [
      { icon: '↑', text: 'Active builders get more heys and replies.', color: CYAN },
      { icon: '✓', text: 'Adds a Verified builder badge with your commits.', color: LIME },
      { icon: '⇧', text: 'Unlocks groups like Daily Shippers.', color: YELLOW },
    ],
    shows: ['Commits · 30 days', 'Active days', 'Top repos'],
    step1Bg: '#7B00FF',
    step1Dark: true,
    step2Bg: CYAN,
    step2Dark: false,
    kicker2: 'READ-ONLY SIGN IN',
    title2: 'Sign in with GitHub',
    sub2: "You'll approve read-only access on GitHub, then come straight back here.",
    whereLabel: 'How does it work?',
    whereTitle: 'How does this work?',
    where: [
      { title: 'Tap Sign in with GitHub', body: 'GitHub opens and asks you to approve Hey100.' },
      {
        title: 'Approve read-only access',
        body: 'You can choose which repos count. Change it anytime in GitHub settings.',
      },
      { title: "You're sent back here", body: 'We count your commits and show the result.' },
      { title: 'No GitHub account?', body: 'Skip this for now. Stripe or RevenueCat also verify you.' },
    ],
    whereLink: 'Open GitHub',
    whereHref: 'https://github.com/login',
    safe: [
      {
        title: 'Read-only',
        body: 'Hey100 can read commit activity. It can never push code, open issues or change settings.',
      },
      {
        title: "We don't keep your data",
        body: "We ask GitHub's API for a few totals and display them. Customer details and your code never reach Hey100.",
      },
      {
        title: 'Only what you see',
        body: 'Your profile shows the numbers on the next screen, as ranges unless you choose exact.',
      },
      {
        title: 'Revoke anytime',
        body: 'Remove Hey100 in GitHub settings, or disconnect in Settings → Integrations. The badge goes away.',
      },
    ],
    period: 'LAST 30 DAYS',
    sync: 'Last synced just now · updates hourly',
    group: 'Daily Shippers',
    groupMeta: 'Verified commits · 1,020 members',
    groupInitial: 'D',
    groupColor: CYAN,
    brand: '#111111',
    glyph: '',
  },
  posthog: {
    id: 'posthog',
    name: 'PostHog',
    tagline: 'Product analytics · active users and retention',
    kicker: 'VERIFY REAL USAGE',
    title: 'Show people actually use it.',
    what: 'PostHog tracks how people use your product. Connecting it shows verified active users and retention, so builders know your app has real usage.',
    whys: [
      { icon: '↑', text: 'Usage proves traction, even before revenue.', color: CYAN },
      { icon: '✓', text: 'Adds a Verified usage badge to your profile.', color: LIME },
      { icon: '⇧', text: 'Unlocks groups like Growing Apps.', color: YELLOW },
    ],
    shows: ['Monthly active users', 'Weekly active users', 'D7 retention'],
    step1Bg: '#0000EB',
    step1Dark: true,
    step2Bg: '#00FF00',
    step2Dark: false,
    kicker2: 'READ-ONLY SIGN IN',
    title2: 'Sign in with PostHog',
    sub2: "You'll approve read-only access on PostHog, then pick the project to count.",
    whereLabel: 'How does it work?',
    whereTitle: 'How does this work?',
    where: [
      { title: 'Tap Sign in with PostHog', body: 'PostHog opens and asks you to approve Hey100.' },
      {
        title: 'Approve read-only access',
        body: 'Hey100 can list projects and run a usage query. It cannot capture events or change anything.',
      },
      { title: 'Pick the project', body: 'We count unique people who sent any event in that project.' },
      { title: "You're sent back here", body: 'The next screen shows the ranges, and exact numbers if you want them.' },
    ],
    whereLink: 'Open PostHog',
    whereHref: 'https://us.posthog.com',
    safe: [
      {
        title: 'Read-only',
        body: 'The grant is project read and query read. It can never capture events, edit insights, change flags, or delete anything.',
      },
      {
        title: "We don't keep your data",
        body: "We ask PostHog's API for a few totals and display them. Events, people, and session recordings never reach Hey100.",
      },
      {
        title: 'Only what you see',
        body: 'Your profile shows the numbers on the next screen, as ranges unless you choose exact.',
      },
      {
        title: 'Revoke anytime',
        body: 'Remove Hey100 in PostHog settings, or disconnect in Settings → Integrations. The badge goes away.',
      },
    ],
    period: 'LAST 30 DAYS',
    sync: 'Last synced just now · updates daily',
    group: 'Growing Apps',
    groupMeta: 'Verified active users · 760 members',
    groupInitial: 'G',
    groupColor: YELLOW,
    brand: '#1D4AFF',
    glyph: 'PH',
  },
};

export const GITHUB_SCOPES = [
  { icon: '✓', text: 'Read your public profile and repos', strong: true },
  { icon: '✓', text: 'Count your commits and active days', strong: true },
  { icon: '✕', text: 'Never read code, push, or change anything', strong: false },
];

export function isFlowId(key: IntegrationKey): key is FlowId {
  return key === 'stripe' || key === 'revenuecat' || key === 'github' || key === 'posthog';
}

export const POSTHOG_SCOPES = [
  { icon: '✓', text: 'Count unique people who sent any event', strong: true },
  { icon: '✓', text: 'Read weekly actives, retention, and sessions', strong: true },
  { icon: '✕', text: 'Never capture events, edit insights, or change flags', strong: false },
];
