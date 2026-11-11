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
  subtitle?: string;
  /** Small caps line under the title, from the onboarding prototype. */
  meta?: string;
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

/**
 * Canonical titles. A pick is stored as this exact string, so people who chose
 * the same role group together. Abbreviations find the canonical title.
 */
export const JOB_TITLES = [
  'Founder',
  'Co-founder',
  'CEO',
  'Indie hacker',
  'Solopreneur',
  'Software Engineer',
  'Senior Software Engineer',
  'Staff Software Engineer',
  'Founding Engineer',
  'Engineering Manager',
  'Director of Engineering',
  'VP of Engineering',
  'Head of Engineering',
  'CTO',
  'Frontend Engineer',
  'Backend Engineer',
  'Full Stack Engineer',
  'Mobile Engineer',
  'iOS Engineer',
  'Android Engineer',
  'Product Manager',
  'Senior Product Manager',
  'Staff Product Manager',
  'Group Product Manager',
  'Principal Product Manager',
  'Associate Product Manager',
  'Technical Product Manager',
  'Product Owner',
  'Director of Product',
  'VP of Product',
  'Head of Product',
  'CPO',
  'Product Designer',
  'Senior Product Designer',
  'UX Designer',
  'UI Designer',
  'Design Manager',
  'Head of Design',
  'Director of Design',
  'Brand Designer',
  'Product Marketing Manager',
  'Marketing Manager',
  'Growth Marketer',
  'Head of Growth',
  'Head of Marketing',
  'Content Marketer',
  'Brand Manager',
  'Account Executive',
  'Sales Manager',
  'Head of Sales',
  'Business Development',
  'Data Analyst',
  'Data Scientist',
  'Data Engineer',
  'Analytics Engineer',
  'Head of Data',
  'Customer Success Manager',
  'Support Lead',
  'Head of Customer Success',
  'Operations Manager',
  'Chief of Staff',
  'Head of Operations',
  'COO',
  'Finance Manager',
  'Head of Finance',
  'CFO',
  'Recruiter',
  'People Partner',
  'Head of People',
  'Researcher',
  'Writer',
  'Student',
];

const JOB_TITLE_ALIASES: Record<string, string[]> = {
  'Product Manager': ['pm'],
  'Software Engineer': ['swe'],
  'Engineering Manager': ['em'],
  'Technical Product Manager': ['tpm'],
  'Product Marketing Manager': ['pmm'],
  'Customer Success Manager': ['csm'],
  'UX Designer': ['ux'],
  'UI Designer': ['ui'],
};

/** The list's own spelling when the query is that title or a known abbreviation. */
export function canonicalJobTitle(query: string): string | null {
  const needle = query.trim().toLowerCase();
  if (!needle) return null;
  return (
    JOB_TITLES.find((title) => title.toLowerCase() === needle) ??
    JOB_TITLES.find((title) => (JOB_TITLE_ALIASES[title] ?? []).some((alias) => alias === needle)) ??
    null
  );
}

/** Titles a typed role could mean, best match first. An empty query returns the full list. */
export function matchJobTitles(options: string[], query: string): string[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return options;

  const ranked = options.flatMap((title) => {
    const hay = title.toLowerCase();
    const aliases = JOB_TITLE_ALIASES[title] ?? [];
    const tokens = hay.split(/[^a-z0-9+]+/).filter(Boolean);
    const hit = (word: string) =>
      tokens.some((token) => token.startsWith(word)) || aliases.some((alias) => alias.startsWith(word));
    const hits = words.filter(hit).length;
    const phrase = hay.includes(words.join(' '));
    if (!hits && !phrase) return [];
    const score = hits * 12 + (hits === words.length ? 24 : 0) + (phrase ? 20 : 0) + (hay.startsWith(words[0]) ? 6 : 0);
    return [{ title, score }];
  });

  ranked.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  return ranked.slice(0, 18).map((row) => row.title);
}

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
  '🔓 Open source maintainers',
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
  {
    kind: 'check',
    title:
      "Let's start with your product's profile. The stronger your profile the better we can match you to users",
  },
  {
    kind: 'link',
    title: 'Add your product',
  },
  {
    kind: 'media',
    title: 'Add up to 10 screenshots or videos',
    subtitle: 'The first is the cover.',
    skip: true,
  },
  {
    kind: 'problem',
    title: 'This solves the problem of',
    skip: true,
  },
  {
    kind: 'pick',
    group: 'stage',
    single: true,
    vis: true,
    title: 'What stage is your app at?',
    meta: 'PICK ONE · SHOWN ON THE PROFILE',
    opts: [...STAGE_OPTIONS],
  },
  {
    kind: 'pick',
    group: 'f',
    own: true,
    max: 3,
    title: 'What do you want feedback on?',
    meta: 'UP TO 3, OR WRITE YOUR OWN',
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
    search: true,
    max: 6,
    title: 'Who are your ideal users?',
    meta: 'UP TO 6 · SEARCH OR WRITE YOUR OWN',
    opts: IDEAL_USERS,
  },
  {
    kind: 'pick',
    group: 'ia',
    vis: true,
    title: 'How old are they?',
    meta: 'ANY COMBINATION · SHOWN ON THE PROFILE',
    opts: AGES,
  },
  {
    kind: 'pick',
    group: 'ig',
    single: true,
    vis: true,
    title: 'Any gender focus?',
    meta: 'PICK ONE · SHOWN ON THE PROFILE',
    opts: ['Anyone', 'Mostly women', 'Mostly men'],
  },
  {
    kind: 'pick',
    group: 'ip',
    vis: true,
    title: 'What devices are they on?',
    meta: 'ANY COMBINATION · SHOWN ON THE PROFILE',
    opts: DEVICES,
  },
  { kind: 'summary', title: "Here's a summary of your product so far." },
  {
    kind: 'prompts',
    title: "Pick prompts to tell your app's story.",
    subtitle: 'Specific answers get more heys than clever ones.',
    skip: true,
  },
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
    subtitle: 'Pick up to 10 skills.',
    opts: SKILLS,
  },
  {
    kind: 'pick',
    group: 'look',
    own: true,
    vis: true,
    title: 'What are you looking for as a developer?',
    meta: 'ANY COMBINATION · SHOWN ON THE PROFILE',
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
    meta: 'ANY COMBINATION · SEARCH OR WRITE YOUR OWN',
    opts: APP_INTERESTS,
  },
  {
    kind: 'pick',
    group: 'd',
    vis: true,
    title: 'Which devices can you test on?',
    meta: 'ANY COMBINATION · SHOWN ON THE PROFILE',
    opts: [...DEVICES, 'Apple Watch'],
  },
  { kind: 'username', title: 'Claim your @username to get started.' },
  {
    kind: 'auth',
    title: 'Get listed on Hey100',
    subtitle: 'Sign in to save your details and get started.',
  },
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
