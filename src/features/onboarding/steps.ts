export type StepKind =
  | 'welcome'
  | 'story'
  | 'why'
  | 'invite'
  | 'check'
  | 'link'
  | 'media'
  | 'problem'
  | 'pick'
  | 'summary'
  | 'prompts'
  | 'work'
  | 'role'
  | 'username'
  | 'auth';

export type Step = {
  kind: StepKind;
  title?: string;
  /** Selection group key, e.g. `stage`, `ii`, `look`. */
  group?: string;
  single?: boolean;
  /** Shows the "Visible on profile" checkbox in the bottom bar. */
  vis?: boolean;
  /** Offers the dashed "Share more in your own words" expander. */
  own?: boolean;
  skip?: boolean;
  opts?: string[];
  /** Puts a search field above the options, for lists too long to scan. */
  search?: boolean;
  /** Caps a multi-select, so the answer stays a priority rather than a list. */
  max?: number;
};

/**
 * The market someone works in, kept alongside the free-text employer so a
 * listing can be matched to people who know the space, not just the company.
 */
export const INDUSTRIES = [
  'AI & machine learning',
  'Agriculture',
  'Automotive',
  'Beauty & cosmetics',
  'Construction & trades',
  'Consulting',
  'Consumer apps',
  'Crypto & web3',
  'Cybersecurity',
  'Dating & relationships',
  'Developer tools',
  'E-commerce',
  'Education',
  'Energy & utilities',
  'Entertainment & media',
  'Events',
  'Fashion',
  'Finance & banking',
  'Fitness & wellness',
  'Food & drink',
  'Gaming',
  'Government & public sector',
  'Healthcare',
  'Hospitality & travel',
  'HR & recruiting',
  'Insurance',
  'Legal',
  'Logistics & supply chain',
  'Manufacturing',
  'Marketing & advertising',
  'Marketplaces',
  'Music & audio',
  'Nonprofit',
  'Parenting & family',
  'Pets',
  'Photo & video',
  'Productivity software',
  'Real estate',
  'Retail',
  'SaaS & B2B software',
  'Sales & CRM',
  'Science & research',
  'Social networks',
  'Sports',
  'Sustainability & climate',
  'Telecom',
  'Transportation',
  'Student',
  'Between things',
  'Other',
];

/** The side of a company someone sits on, which is coarser than a job title. */
export const DEPARTMENTS = [
  'Engineering',
  'Design',
  'Product',
  'Marketing',
  'Sales',
  'Operations',
  'Executive & founder',
  'Data & analytics',
  'Customer success & support',
  'Finance',
  'People & HR',
  'Legal',
  'Research',
  'Content & creative',
  'IT & security',
  'Student',
  'Other',
];

export const COMPANY_SIZES = ['Just me', '2–10', '11–50', '51–200', '201–1,000', '1,000+'];

export const YEARS_EXPERIENCE = [
  'Under a year',
  '1–2 years',
  '3–5 years',
  '6–10 years',
  '11–15 years',
  '15+ years',
];

/**
 * What someone can actually do, which is how a builder decides who to trade
 * with. Ten at most: a list of everything says nothing about anyone.
 */
export const SKILLS = [
  'Software engineering',
  'Frontend development',
  'Backend development',
  'Mobile development',
  'iOS development',
  'Android development',
  'Web development',
  'DevOps & infrastructure',
  'Databases',
  'Security',
  'QA & testing',
  'AI & machine learning',
  'Prompt engineering',
  'Data science',
  'Data analysis',
  'Data engineering',
  'Automation',
  'No-code',
  'Technical writing',
  'Accessibility',
  'Localization',
  'Product management',
  'Product strategy',
  'User research',
  'UX design',
  'UI design',
  'Visual design',
  'Brand & identity',
  'Design systems',
  'Illustration',
  'Motion design',
  'Prototyping',
  'Marketing',
  'Growth',
  'SEO',
  'Paid ads',
  'Email marketing',
  'Social media',
  'Content marketing',
  'Copywriting',
  'Content creation',
  'Video editing',
  'Photography',
  'Podcasting',
  'Community building',
  'Public relations',
  'Influencer marketing',
  'App Store optimization',
  'Analytics',
  'Pricing',
  'Monetization',
  'Sales',
  'Business development',
  'Partnerships',
  'Fundraising',
  'Pitching',
  'Customer support',
  'Customer success',
  'Account management',
  'Operations',
  'Project management',
  'Hiring & recruiting',
  'People management',
  'Finance & accounting',
  'Legal & contracts',
  'Teaching & mentoring',
  'Public speaking',
];

/**
 * Apps someone would actually try, spanning Apple's categories plus the
 * niches indie builders ship into. Long enough to search rather than scan.
 */
export const APP_INTERESTS = [
  '⚡ Productivity',
  '💰 Finance',
  '💪 Health & fitness',
  '🛠️ Dev tools',
  '🤖 AI tools',
  '🎮 Games',
  '☕ Food & drink',
  '👶 Parenting',
  '📚 Education',
  '🎵 Music',
  '📱 Social networking',
  '📸 Photo & video',
  '🛒 Shopping',
  '✈️ Travel',
  '📰 News',
  '🧭 Navigation',
  '🌤️ Weather',
  '📖 Books & reading',
  '💼 Business',
  '🎨 Design',
  '🧰 Utilities',
  '💬 Messaging',
  '📅 Calendar & planning',
  '📝 Notes & writing',
  '🔁 Habit tracking',
  '🧘 Mental health',
  '🥗 Nutrition',
  '😴 Sleep',
  '🏃 Running & cycling',
  '⚽ Sports',
  '💑 Dating',
  '🏠 Home & family',
  '🐕 Pets',
  '👗 Fashion',
  '💄 Beauty',
  '🏘️ Real estate',
  '🚗 Automotive',
  '🎬 Entertainment',
  '🎧 Podcasts & audio',
  '🎙️ Creator tools',
  '📈 Investing',
  '🪙 Crypto',
  '🔒 Privacy & security',
  '♿ Accessibility',
  '🌱 Sustainability',
  '🏥 Medical',
  '⚖️ Legal',
  '📣 Marketing',
  '🤝 Community',
  '🎓 Language learning',
  '🔬 Science & research',
  '🧑‍💻 No-code',
  '🧩 Browser extensions',
  '⌚ Wearables',
];

/**
 * What a tester is asked to look at. Three at most, because a trade is one
 * person spending an evening with your app: naming everything names nothing.
 */
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
];

/** Platforms, by the name of the thing a builder actually ships to. */
export const DEVICES = ['iPhone (iOS)', 'Android', 'Mac', 'Windows', 'Web'];

/**
 * Ideal-user age bands. Defined here so the pick step cannot render empty if
 * a circular import leaves `mock.ts` mid-initialisation.
 */
export const AGES = ['Any age', '18–24', '25–34', '35–44', '45–54', '55+'];

export const GENDERS = ['Anyone', 'Mostly women', 'Mostly men'];

export const STAGE_OPTIONS = [
  '💡 Idea or prototype',
  '🧪 In beta or TestFlight',
  '🚀 Live',
  '💸 Live with revenue',
] as const;

/**
 * Who a listing is for. Long on purpose: a builder should find their actual
 * audience rather than round it to the nearest of ten, so the step searches
 * instead of scrolling. Professions come first, then who someone is right now,
 * then what they are into.
 */
export const IDEAL_USERS = [
  '🚀 Founders',
  '👩‍💻 Developers',
  '🎨 Designers',
  '📣 Marketers',
  '📋 Product managers',
  '💼 Freelancers',
  '🧑‍💼 Consultants',
  '💵 Sales teams',
  '🎧 Support teams',
  '🤝 Recruiters',
  '🧑‍🏫 Teachers',
  '⚕️ Healthcare workers',
  '⚖️ Lawyers',
  '📊 Accountants',
  '🏘️ Real estate agents',
  '🏗️ Tradespeople',
  '🛍️ Shop owners',
  '🍽️ Restaurant owners',
  '🧑‍🔬 Researchers',
  '✍️ Writers',
  '🎬 Video creators',
  '🎙️ Podcasters',
  '📱 Content creators',
  '📸 Photographers',
  '🎵 Musicians',
  '🎓 Students',
  '🎒 Recent grads',
  '👶 New parents',
  '💑 Couples',
  '🏠 Homeowners',
  '🐕 Pet owners',
  '🏡 Remote workers',
  '🌍 Digital nomads',
  '🧳 Frequent travellers',
  '🧓 Retirees',
  '☕ Coffee lovers',
  '🍳 Home cooks',
  '🍷 Wine and cocktails',
  '🏃 Runners',
  '🏋️ Gym goers',
  '🚴 Cyclists',
  '🥾 Hikers',
  '🧘 Yoga and meditation',
  '🥗 Health trackers',
  '⚽ Sports fans',
  '🎮 Gamers',
  '🎲 Board gamers',
  '📚 Readers',
  '🎨 Artists',
  '🧶 Crafters',
  '🪴 Plant people',
  '🗣️ Language learners',
  '🧠 Lifelong learners',
  '📓 Journalers',
  '⚡ Productivity nerds',
  '🤖 AI tinkerers',
  '💰 Into budgeting',
  '📈 Investors',
  '🪙 Crypto curious',
  '🌱 Sustainability minded',
];

/**
 * One question per step, Hinge-style. The app side of matching is collected
 * first, up to the listing summary, then the person side.
 */
export const STEPS: Step[] = [
  { kind: 'welcome' },
  { kind: 'story' },
  { kind: 'why' },
  { kind: 'invite', title: 'Hey100 is invite-only right now' },
  {
    kind: 'check',
    title:
      "Let's start with your app. You don't need to get it perfect. We'll guide you as you go.",
  },
  { kind: 'link', title: 'Add your app' },
  { kind: 'media', title: 'Add up to 10 screenshots or videos', skip: true },
  {
    kind: 'problem',
    title: 'This solves the problem of… for…',
    skip: true,
  },
  {
    kind: 'pick',
    group: 'stage',
    single: true,
    vis: true,
    title: 'What stage is your app at?',
    opts: [...STAGE_OPTIONS],
  },
  {
    kind: 'pick',
    group: 'f',
    own: true,
    max: 3,
    title: 'What do you want feedback on?',
    opts: FEEDBACK_AREAS,
  },
  {
    kind: 'check',
    title: "Next: who's your app for? We'll match you with builders who'd actually use it.",
  },
  {
    kind: 'pick',
    group: 'ii',
    own: true,
    vis: true,
    search: true,
    title: 'Who are your ideal users?',
    opts: IDEAL_USERS,
  },
  { kind: 'pick', group: 'ia', vis: true, title: 'How old are they?', opts: AGES },
  {
    kind: 'pick',
    group: 'ig',
    single: true,
    vis: true,
    title: 'Any gender focus?',
    opts: ['Anyone', 'Mostly women', 'Mostly men'],
  },
  {
    kind: 'pick',
    group: 'ip',
    vis: true,
    title: 'What devices are they on?',
    opts: DEVICES,
  },
  { kind: 'summary', title: "Here's a summary of your app so far." },
  { kind: 'prompts', title: "Pick prompts to tell your app's story", skip: true },
  { kind: 'check', title: "Now we'll ask about you, and the apps you'd be open to trying." },
  { kind: 'work', title: 'What keeps you busy these days?', skip: true },
  { kind: 'role', title: 'What do you do there?', skip: true },
  {
    kind: 'pick',
    group: 'sk',
    own: true,
    search: true,
    max: 10,
    skip: true,
    title: 'What are you good at?',
    opts: SKILLS,
  },
  {
    kind: 'pick',
    group: 'look',
    own: true,
    vis: true,
    title: 'What are you looking for as a developer?',
    opts: [
      '🧪 Early users for my app',
      '🗣️ Honest feedback',
      '🤝 Builder friends',
      '🏘️ A community of builders',
      '🧑‍💻 A co-founder',
      '🚀 Launch support',
      '💡 Ideas and inspiration',
    ],
  },
  {
    kind: 'pick',
    group: 'cat',
    own: true,
    search: true,
    title: 'What apps would interest you?',
    opts: APP_INTERESTS,
  },
  {
    kind: 'pick',
    group: 'd',
    vis: true,
    title: 'Which devices can you test on?',
    opts: [...DEVICES, 'Apple Watch'],
  },
  { kind: 'username', title: 'Claim your @username to get started' },
  { kind: 'auth', title: 'Launch your app on Hey100' },
];

export const LAST_STEP = STEPS.length - 1;

/** The listing half of the flow, reused by "List another app" in the Apps tab. */
export const ADD_APP_RANGE = {
  first: STEPS.findIndex((step) => step.kind === 'check'),
  last: STEPS.findIndex((step) => step.kind === 'summary'),
} as const;

/** Fallback for a build with no Supabase credentials. Real codes live in the database. */
export const VALID_INVITE_CODES = ['HEY100', 'BUILD100', 'DIFF100'];

export const INVITERS: Record<string, string> = {
  HEY100: 'Jaryd',
  BUILD100: 'Nina Park',
  DIFF100: 'Omar Haddad',
};
