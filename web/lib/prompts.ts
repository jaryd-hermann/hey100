export const PROMPT_LIBRARY = [
  { id: 'honest', tag: 'Feedback', label: 'The honest thing I need feedback on…' },
  { id: 'love', tag: 'Audience', label: "You'll love this app if…" },
  { id: 'how', tag: 'Product', label: "In 30 seconds, here's how it works:" },
  { id: 'proud', tag: 'Product', label: "The feature I'm most proud of…" },
  { id: 'works', tag: 'Feedback', label: "I'll know this app works when…" },
  { id: 'dont', tag: 'Audience', label: "Don't download this if…" },
  { id: 'green', tag: 'Audience', label: 'Green flag in a user:' },
  { id: 'why', tag: 'Story', label: 'Why I built this…' },
  { id: 'first', tag: 'Story', label: 'Our first user said…' },
  { id: 'weird', tag: 'Story', label: 'The weirdest thing I learned building it…' },
  { id: 'next', tag: 'Product', label: "What's coming next…" },
  { id: 'stuck', tag: 'Feedback', label: 'Where people get stuck…' },
  { id: 'magic', tag: 'Product', label: 'The magic moment is…' },
  { id: 'solves', tag: 'Product', label: 'I solve the problem of…' },
  { id: 'different', tag: 'Product', label: 'My app is different because…' },
  { id: 'skipping', tag: 'Product', label: "What I'm deliberately not building…" },
  { id: 'premise', tag: 'Story', label: 'The premise is…' },
  { id: 'strength', tag: 'Story', label: 'My strength as a builder is…' },
  { id: 'hardest', tag: 'Story', label: 'The hardest part to get right…' },
  { id: 'hearing', tag: 'Story', label: 'What I keep hearing from users…' },
  { id: 'who', tag: 'Audience', label: 'Who this is really for…' },
  { id: 'try', tag: 'Feedback', label: 'Try this first:' },
] as const;

export const PRICING_MODELS = ['Free', 'Freemium', 'Subscription', 'One-time', 'In-app purchases'] as const;

export const DEFAULT_LAYOUT = [
  'pitch',
  'shots',
  'problem',
  'p0',
  'builder',
  'p1',
  'looking',
  'p2',
  'p3',
  'p4',
  'stats',
  'pricing',
  'verified',
] as const;

export function promptLabel(id: string) {
  return PROMPT_LIBRARY.find((item) => item.id === id)?.label ?? id;
}

export const MILESTONES = [
  { id: 'first-match', badge: '🎉', title: 'First match', sub: 'You and another builder agreed to trade apps' },
  { id: 'first-trade', badge: '🤝', title: 'First completed trade', sub: 'Both of you sent feedback' },
  { id: 'target-opened', badge: '🎯', title: '68% of your ideal users opened your profile', sub: 'Last 30 days' },
  { id: 'monthly', badge: '📈', title: 'October launch report', sub: '412 views · 3 matches · 2 trades · 23% hey ratio' },
] as const;

export const INTEGRATIONS = [
  { key: 'github', name: 'GitHub', desc: 'Verify commit counts' },
  { key: 'revenuecat', name: 'RevenueCat', desc: 'Verify customers & revenue bands' },
  { key: 'stripe', name: 'Stripe', desc: 'Verify MRR & sales' },
  { key: 'posthog', name: 'PostHog', desc: 'Verify active users' },
] as const;

export const AGES = ['Any age', '18–24', '25–34', '35–44', '45–54', '55+'] as const;
export const GENDERS = ['Anyone', 'Mostly women', 'Mostly men'] as const;
export const DEVICES = ['iPhone (iOS)', 'Android', 'Mac', 'Windows', 'Web'] as const;
export const FEEDBACK_AREAS = [
  'Onboarding',
  'Core value',
  'Pricing',
  'Problem-solution fit',
  'Problem relevance',
  'App experience',
  'Design',
  'Stability',
  'General',
] as const;
export const IDEAL_USERS = [
  '🚀 Founders',
  '🛠️ Indie hackers',
  '✨ Vibe coders',
  '🧍 Solopreneurs',
  '💸 SaaS founders',
  '👩‍💻 Developers',
  '🤖 AI developers',
  '🎨 Designers',
  '📣 Marketers',
  '📈 Growth hackers',
  '📋 Product managers',
  '💼 Freelancers',
  '🧑‍💼 Consultants',
  '🏢 Small business owners',
  '🧰 Agencies',
  '🎓 Students',
  '👶 New parents',
  '💑 Couples',
  '🏡 Remote workers',
  '📱 Content creators',
] as const;

export function listingStrength(app: {
  icon_path?: string | null;
  pitch_path?: string | null;
  problem_of?: string | null;
  problem_for?: string | null;
  pricing_model?: string | null;
  ideal_users?: { interests?: string[] } | null;
}, mediaCount: number, promptCount: number, verified: boolean) {
  const items = [
    { key: 'icon', label: 'Icon', done: !!app.icon_path },
    { key: 'pitch', label: 'Quick pitch', done: !!app.pitch_path },
    { key: 'shots', label: 'Screenshots', done: mediaCount > 0 },
    { key: 'problem', label: 'Problem', done: !!(app.problem_of && app.problem_for) },
    { key: 'pricing', label: 'Pricing', done: !!app.pricing_model },
    { key: 'prompts', label: 'Prompts', done: promptCount > 0 },
    { key: 'ideal', label: 'Audience', done: !!(app.ideal_users?.interests?.length) },
    { key: 'verified', label: 'Verified', done: verified },
  ];
  const done = items.filter((item) => item.done).length;
  return { items, done, total: items.length, ratio: done / items.length };
}
