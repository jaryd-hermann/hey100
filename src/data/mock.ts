import type {
  AppListing,
  IncomingHey,
  InboxData,
  Integration,
  Match,
  Message,
  OwnedApp,
  SectionKey,
  SentHey,
} from './types';

const HOUR = 60 * 60 * 1000;

const P = {
  honest: 'The honest thing I need feedback on…',
  love: "You'll love this app if…",
  dont: "Don't download this if…",
  first: 'Our first user said…',
  proud: "The feature I'm most proud of…",
  works: "I'll know this app works when…",
  how: "In 30 seconds, here's how it works:",
  weird: 'The weirdest thing I learned building it…',
  green: 'Green flag in a user:',
} as const;

const media = (...labels: string[]) =>
  labels.map((label) => ({ label, video: /demo video/i.test(label) }));

/** The default section order on an app page. */
export const DEFAULT_LAYOUT: SectionKey[] = [
  'shots',
  'p0',
  'builder',
  'p1',
  'looking',
  'p2',
  'p3',
  'stats',
  'verified',
  'p4',
];

export const LISTINGS: Record<string, AppListing> = {
  brew: {
    id: 'brew',
    name: 'Brewlog: Coffee Brew Journal',
    sub: 'Dial in every pour-over',
    cat: 'Food & Drink',
    plat: 'iOS',
    stage: 'Live',
    hue: 55,
    builder: 'Nina Park',
    role: 'iOS dev and designer',
    style: 'Balanced feedback · replies within a day',
    likes: '10–50',
    trades: 12,
    reply: '92%',
    fit: 'You fit their ideal users · coffee, 25–34, iPhone',
    code: 'BREW-HEY100',
    asked: 'onboarding and UI',
    media: media('Demo video · 0:34', 'Recipe timer', 'Bean library', 'Brew history'),
    shotLayout: 'vertical',
    prompts: [
      [P.honest, 'Whether logging a brew takes too many taps. I count six. It should be two.'],
      [P.love, "You own a scale you bought for coffee and pretend it's for baking."],
      [P.first, '"I finally know why Tuesday\'s cup was good."'],
      [P.proud, 'Ratios that adjust when you change the dose. No maths at 7am.'],
      [P.green, "You'll brew with it for a full week, not just open it once."],
    ],
    ideal: {
      age: '25–44',
      gender: 'Anyone',
      interests: 'Coffee, cooking',
      plat: 'iPhone',
      wants: 'onboarding, UI',
    },
    badges: [
      'Live on the App Store · 1k–5k downloads',
      'RevenueCat · 100–500 subscribers',
      'GitHub · last commit 2 days ago',
    ],
    links: [
      ['Web', 'brewlog.app'],
      ['TikTok', '@brewlog'],
      ['Instagram', '@brewlog.app'],
    ],
  },
  ship: {
    id: 'ship',
    name: 'Shipnote: Changelog Widget',
    sub: 'Release notes users open',
    cat: 'Developer Tools',
    plat: 'Web · SaaS',
    stage: 'Revenue',
    hue: 250,
    builder: 'Omar Haddad',
    role: 'Full-stack, Supabase',
    style: 'Blunt feedback · replies within hours',
    likes: '50–100',
    trades: 31,
    reply: '88%',
    fit: 'You fit their ideal users · founder, ships weekly',
    code: 'SHIPNOTE-100',
    asked: 'pricing',
    media: media('Widget on a pricing page', 'Install in 40 seconds', 'Analytics'),
    shotLayout: 'horizontal',
    prompts: [
      [P.honest, 'Is $12/mo the right price, or am I leaving money on the table?'],
      [
        P.how,
        'Paste one script tag. Write an entry. A small dot appears in your app until users read it.',
      ],
      [P.dont, "You ship once a quarter. You'd be paying for a widget with nothing to say."],
      [P.works, 'A customer replies to a changelog entry.'],
    ],
    ideal: {
      age: '25–54',
      gender: 'Anyone',
      interests: 'Startups, productivity',
      plat: 'Web, Mac',
      wants: 'pricing, onboarding',
    },
    badges: ['Stripe · $1k–5k MRR', 'GitHub · last commit today'],
    links: [
      ['Web', 'shipnote.dev'],
      ['X', '@shipnote'],
    ],
  },
  lullo: {
    id: 'lullo',
    name: 'Lullo: Baby Sleep Tracker',
    sub: 'One-handed logging at 3am',
    cat: 'Parenting',
    plat: 'iOS',
    stage: 'TestFlight',
    hue: 340,
    builder: 'Priya Nair',
    role: 'React Native',
    style: 'Gentle feedback · replies within a day',
    likes: '1–10',
    trades: 4,
    reply: '97%',
    fit: 'You fit their ideal users · new parent, iPhone',
    code: 'LULLO-TF',
    asked: 'retention and bugs',
    media: media('Night mode log', 'Demo video · 0:21', 'Weekly chart'),
    shotLayout: 'vertical',
    prompts: [
      [
        P.proud,
        'The whole screen is one button. Tap to start, tap to stop. Works with your thumb in the dark.',
      ],
      [P.green, "You'll use it for a full week, including the bad nights."],
      [P.weird, 'Parents log more at 4am than at any other hour.'],
    ],
    ideal: {
      age: '25–44',
      gender: 'Anyone',
      interests: 'New parents',
      plat: 'iPhone',
      wants: 'retention, bugs',
    },
    badges: ['GitHub · last commit today'],
    links: [
      ['Web', 'lullo.baby'],
      ['Instagram', '@lullo.sleep'],
    ],
  },
  fern: {
    id: 'fern',
    name: 'Fernly: Plant Care Reminders',
    sub: 'Never drown a monstera again',
    cat: 'Lifestyle',
    plat: 'iOS',
    stage: 'Live',
    hue: 150,
    builder: 'Tomás Reyes',
    role: 'SwiftUI',
    style: 'Balanced feedback · replies within a day',
    likes: '10–50',
    trades: 9,
    reply: '90%',
    fit: 'Matched on Tidepool · you both want couples, 25–34',
    code: 'FERNLY-YEAR',
    asked: 'UI and retention',
    media: media('Watering schedule', 'Plant ID', 'Care tips'),
    shotLayout: 'vertical',
    prompts: [
      [P.love, 'You have more plants than chairs.'],
      [P.honest, 'Does the plant ID feel trustworthy, or like a guess?'],
      [P.first, '"My fiddle leaf is alive for the first time in two years."'],
    ],
    ideal: {
      age: '25–44',
      gender: 'Anyone',
      interests: 'Homeowners, couples',
      plat: 'iPhone',
      wants: 'UI, retention',
    },
    badges: ['Live on the App Store · 1k–5k downloads'],
    links: [
      ['Web', 'fernly.app'],
      ['TikTok', '@fernly'],
    ],
  },
  ink: {
    id: 'ink',
    name: 'Inkwell: AI Journal & Diary',
    sub: 'Write less, reflect more',
    cat: 'Health & Fitness',
    plat: 'iOS · Web',
    stage: 'Revenue',
    hue: 20,
    builder: 'Hana Ito',
    role: 'Full-stack, OpenAI',
    style: 'Blunt feedback · replies within a day',
    likes: '50–100',
    trades: 22,
    reply: '85%',
    fit: 'Matched on Tidepool · you both target couples',
    code: 'INKWELL-90',
    asked: 'pricing',
    media: media('Weekly reflection', 'Demo video · 0:40'),
    shotLayout: 'vertical',
    prompts: [
      [P.how, 'Write three lines a night. Sunday you get a letter about your week.'],
      [P.dont, 'You want an AI to write for you. It only asks questions.'],
      [P.works, 'Someone keeps writing after the free month ends.'],
    ],
    ideal: {
      age: '25–44',
      gender: 'Mostly women',
      interests: 'Reading, wellness',
      plat: 'iPhone, Web',
      wants: 'pricing',
    },
    badges: ['Stripe · $1k–5k MRR'],
    links: [
      ['Web', 'inkwell.so'],
      ['Instagram', '@inkwell.journal'],
    ],
  },
  grid: {
    id: 'grid',
    name: 'Gridline: Design Grid Overlay',
    sub: 'Pixel-check any website',
    cat: 'Chrome extension',
    plat: 'Web',
    stage: 'Live',
    hue: 200,
    builder: 'Dev Patel',
    role: 'Designer who codes',
    style: 'Detailed feedback · replies within a day',
    likes: '10–50',
    trades: 15,
    reply: '95%',
    fit: 'Matched on Tally · you both like productivity tools',
    code: 'GRIDLINE-PRO',
    asked: 'pricing and UI',
    media: media('Grid on a landing page', 'Toggle with ⌥G'),
    shotLayout: 'horizontal',
    prompts: [
      [P.love, "You've ever zoomed to 400% to check a margin."],
      [P.proud, 'It reads your CSS grid and draws it. No setup.'],
      [P.honest, 'Is the free tier too generous?'],
    ],
    ideal: {
      age: '18–44',
      gender: 'Anyone',
      interests: 'Design, productivity',
      plat: 'Web, Mac',
      wants: 'pricing, UI',
    },
    badges: ['Chrome Web Store · 1k–5k users'],
    links: [['Web', 'gridline.design']],
  },
};

/** Lighter records for builders the user is already matched with. */
export type MatchAppStub = Pick<
  AppListing,
  'id' | 'name' | 'sub' | 'hue' | 'icon' | 'builder' | 'code' | 'asked'
> & { links?: AppListing['links'] };

export const MATCH_APPS: Record<string, MatchAppStub> =
  {
    tl: {
      id: 'tl',
      name: 'Tiny Ledger: Expense Splitter',
      sub: 'Split costs without the maths',
      hue: 40,
      builder: 'Marco Bellini',
      code: 'LEDGER-100',
      asked: 'onboarding',
    },
    team: {
      id: 'team',
      name: 'Hey100 Team',
      sub: 'From Jaryd',
      hue: 128,
      builder: 'Jaryd · founder of Hey100',
      code: '',
      asked: '',
    },
    cad: {
      id: 'cad',
      name: 'Cadence: Habit Streaks',
      sub: 'Small habits, long streaks',
      hue: 290,
      builder: 'Lena Vogel',
      code: 'CADENCE-1YR',
      asked: 'retention',
    },
    lum: {
      id: 'lum',
      name: 'Lumen: Read It Later',
      sub: 'Articles, minus the noise',
      hue: 95,
      builder: 'Ari Cohen',
      code: 'LUMEN-HEY',
      asked: 'UI',
    },
    pt: {
      id: 'pt',
      name: 'Pocket Tutor: AI Math Help',
      sub: 'Homework help that explains',
      hue: 180,
      builder: 'Sam Osei',
      code: 'TUTOR-FREE',
      asked: 'bugs',
    },
  };

/** Media stand-ins for the user's own listings. */
export const MY_MEDIA = [
  'Demo video · onboarding 0:28',
  'Sunday summary',
  'Shared goals',
  'Partner invite',
  'Monthly recap',
  'Settings',
];

export const OWNED_APPS: Record<string, OwnedApp> = {
  tide: {
    id: 'tide',
    name: 'Tidepool: Couples Budget',
    sub: 'Money dates for two',
    cat: 'Finance',
    plat: 'iOS',
    stage: 'Live',
    hue: 220,
    builder: 'Jaryd',
    role: 'iOS · Supabase',
    style: 'Balanced feedback · replies within a day',
    likes: '10–50',
    trades: 3,
    reply: '94%',
    views: 412,
    matches: 3,
    primary: true,
    media: media(...MY_MEDIA.slice(0, 4)),
    shotLayout: 'vertical',
    prompts: [],
    ideal: {
      age: '25–34, 35–44',
      gender: 'Anyone',
      interests: 'In a couple, Into budgeting',
      plat: 'iPhone',
      wants: 'onboarding, pricing',
    },
    badges: [],
    links: [
      ['Web', 'tidepool.app'],
      ['TikTok', '@tidepoolapp'],
      ['Instagram', '@tidepool.app'],
    ],
    layout: [...DEFAULT_LAYOUT],
  },
  tally: {
    id: 'tally',
    name: 'Tally: Shared Grocery List',
    sub: 'One list for the household',
    cat: 'Food & Drink',
    plat: 'iOS',
    stage: 'TestFlight',
    hue: 160,
    builder: 'Jaryd',
    role: 'iOS · Supabase',
    style: 'Balanced feedback · replies within a day',
    likes: '1–10',
    trades: 1,
    reply: '100%',
    views: 58,
    matches: 1,
    listedUntilDays: 84,
    media: media('Shared list', 'Aisle sort'),
    shotLayout: 'vertical',
    prompts: [
      [P.love, 'You and your housemates buy three bottles of ketchup a month by accident.'],
      [P.honest, 'Is aisle sorting useful or a gimmick?'],
      [P.weird, 'People add "milk" twice more than any other item.'],
    ],
    ideal: {
      age: '25–34',
      gender: 'Anyone',
      interests: 'Homeowner, cooking',
      plat: 'iPhone',
      wants: 'UI, retention',
    },
    badges: [],
    links: [['Instagram', '@tally.list']],
    layout: [...DEFAULT_LAYOUT],
  },
};

export const INTEGRATIONS: Integration[] = [
  {
    key: 'github',
    name: 'GitHub',
    letter: 'G',
    desc: 'Show commit activity',
    on: '148 commits in 30 days',
    detail: 'last 2h ago · fix: partner invite deep link',
    badge: 'GitHub · 148 commits in 30 days · last 2h ago',
  },
  {
    key: 'asc',
    name: 'App Store Connect',
    letter: 'A',
    desc: 'Show live status and downloads',
    on: 'Live · 1k–5k downloads',
    badge: 'Live on the App Store · 1k–5k downloads',
  },
  {
    key: 'revenuecat',
    name: 'RevenueCat',
    letter: 'R',
    desc: 'Show subscriber count',
    on: '100–500 active subscribers',
    badge: 'RevenueCat · 100–500 subscribers',
  },
  {
    key: 'stripe',
    name: 'Stripe',
    letter: 'S',
    desc: 'Show revenue band',
    on: '$100–1k MRR',
    badge: 'Stripe · $100–1k MRR',
  },
];

export const DECK_IDS = ['brew', 'ship', 'lullo'];

export const INCOMING_HEYS: IncomingHey[] = [
  {
    id: 'hey-fern',
    appId: 'fern',
    viaAppId: 'tide',
    target: 'onboarding video',
    note: "The couples invite flow looks smooth. I'd try it with my partner this weekend.",
  },
  {
    id: 'hey-ink',
    appId: 'ink',
    viaAppId: 'tide',
    target: '"honest thing" prompt',
    note: 'I can tell you if the pricing feels fair. I pay for three budgeting apps.',
    followUp: {
      note: "Still keen. I set aside Saturday to run a full money date in Tidepool if you're in.",
      when: 'yesterday',
    },
  },
  {
    id: 'hey-grid',
    appId: 'grid',
    viaAppId: 'tally',
    target: 'aisle sort screenshot',
    note: "Clean. I'm a designer and do the shopping, happy to do a UI pass.",
  },
];

/** One entry per `SentHeyStatus`, plus both sides of the 24h follow-up window. */
export const SENT_HEYS: SentHey[] = [
  {
    id: 'sent-brew',
    appId: 'brew',
    viaAppId: 'tide',
    target: 'demo video',
    note: "Six taps to log a brew is the bit I'd poke at. I weigh my beans, so I'm your user.",
    sentAt: Date.now() - 5 * HOUR,
    status: 'Pending',
  },
  {
    id: 'sent-ship',
    appId: 'ship',
    viaAppId: 'tide',
    target: '"honest thing" prompt',
    note: "I ship weekly and pay for a changelog tool already. Happy to say whether $12 lands.",
    sentAt: Date.now() - 30 * HOUR,
    status: 'Pending',
  },
  {
    id: 'sent-lullo',
    appId: 'lullo',
    viaAppId: 'tally',
    target: 'night mode log screenshot',
    note: 'One-button logging is the right call. I can test the bad nights for a week.',
    sentAt: Date.now() - 52 * HOUR,
    status: 'Pending',
    followUp: {
      note: "Still up for this if you want a tester. TestFlight link whenever you're ready.",
      sentAt: Date.now() - 28 * HOUR,
    },
  },
  {
    id: 'sent-fern',
    appId: 'fern',
    viaAppId: 'tally',
    target: 'plant ID screenshot',
    note: 'I kill a plant a season. Happy to stress-test whether the ID feels trustworthy.',
    sentAt: Date.now() - 72 * HOUR,
    status: 'Passed',
    passReason: 'Not my audience',
  },
  {
    // Points at a matched app that has a real thread, so Matched can open it.
    id: 'sent-cad',
    appId: 'cad',
    viaAppId: 'tide',
    target: 'streak recovery screenshot',
    note: 'I break every streak by day nine. I can tell you if the recovery flow saves me.',
    sentAt: Date.now() - 96 * HOUR,
    status: 'Matched',
  },
];

export const INITIAL_MATCHES: Match[] = [
  {
    id: 'cad',
    appId: 'cad',
    viaAppId: 'tide',
    last: 'Sent my feedback. The Sunday summary is great.',
    time: '2h',
    mine: 'Using',
    theirs: 'Feedback sent',
    turn: true,
    unread: 2,
  },
  {
    id: 'lum',
    appId: 'lum',
    viaAppId: 'tally',
    last: 'You: Downloading now, will report back tonight.',
    time: '1d',
    mine: 'Using',
    theirs: 'Using',
    expiresInDays: 5,
  },
  {
    id: 'pt',
    appId: 'pt',
    viaAppId: 'tide',
    last: 'Thanks! Fixed the crash you found.',
    time: '3d',
    mine: 'Feedback sent',
    theirs: 'Feedback sent',
    unread: 1,
  },
];

export const INITIAL_MESSAGES: Record<string, Message[]> = {
  cad: [
    { kind: 'system', body: 'matched oct 12 · lena said hey to your onboarding video' },
    { kind: 'them', body: 'Hey! Your onboarding video sold me. Downloading Tidepool now.' },
    {
      kind: 'me',
      body: 'Thanks Lena. TestFlight link is up top, and the code gets you a free year.',
    },
    {
      kind: 'feedback',
      from: 'them',
      stars: '4/5',
      body: 'Calm and clear. I wanted to invite my partner sooner.',
      meta: 'Keep using: Yes · Fair price: $3–5/mo',
    },
    {
      kind: 'them',
      body: 'One confusing bit on the partner invite. Your turn on Cadence whenever you have a week 🙌',
    },
  ],
  lum: [
    { kind: 'system', body: 'matched oct 14 · you said hey to their demo video' },
    { kind: 'them', body: 'Hi! Happy to swap. Code is in the trade card.' },
    { kind: 'me', body: 'Downloading now, will report back tonight.' },
  ],
  pt: [
    { kind: 'system', body: 'matched oct 9' },
    {
      kind: 'me',
      body: 'Found a crash when switching subjects mid-lesson. Screenshot in my feedback.',
      media: media('Crash on subject switch', 'Demo video · repro 0:11'),
    },
    { kind: 'them', body: 'Thanks! Fixed the crash you found.' },
  ],
  tl: [
    { kind: 'system', body: 'matched oct 2' },
    {
      kind: 'them',
      body: 'Sent my notes on Tidepool. Bank sync empty state confused me a bit.',
    },
    { kind: 'me', body: 'Super helpful, thanks Marco. Fixing that this week.' },
  ],
  team: [
    {
      kind: 'announcement',
      when: 'Oct 1',
      body: "Welcome to Hey100 👋\nEvery builder here has a real product. Say hey to apps you'd actually use, and trade honest feedback.",
    },
    {
      kind: 'announcement',
      when: 'Oct 12',
      body: 'New: badges for your site. Show off your Hey100 listing and verified stats. Find them on your app page.',
    },
    {
      kind: 'them',
      body: "Hey, Jaryd here. This thread comes straight to me. Bugs, ideas, or anything that's annoying you, send it here.",
    },
  ],
};

export const INBOX: Record<string, InboxData> = {
  tide: {
    funnel: { views: '412', skips: '318', heys: '94', ratio: '23%' },
    responses: 12,
    impression: '4.1',
    price: '$3–5',
    yes: 58,
    maybe: 25,
    no: 17,
    list: [
      {
        id: 'tide-0',
        who: 'Lena Vogel',
        app: 'Cadence',
        hue: 290,
        when: '2h ago',
        stars: '4/5',
        text: 'Calm and clear. I wanted to invite my partner sooner.',
        confusion: 'Partner invite is buried in settings',
        keep: 'Yes',
        optIn: true,
        helpful: 'yes',
      },
      {
        id: 'tide-1',
        who: 'Sam Osei',
        app: 'Pocket Tutor',
        hue: 180,
        when: 'Oct 11',
        stars: '5/5',
        text: 'The Sunday "money date" summary is the best part. I read it out loud.',
        confusion: 'None, honestly',
        keep: 'Yes',
        optIn: true,
      },
      {
        id: 'tide-2',
        who: 'Marco Bellini',
        app: 'Tiny Ledger',
        hue: 40,
        when: 'Oct 8',
        stars: '3/5',
        text: "Pretty, but I wasn't sure what to do after connecting my bank.",
        confusion: 'Empty state after bank sync',
        keep: 'Maybe',
        optIn: false,
      },
    ],
  },
  tally: {
    funnel: { views: '58', skips: '44', heys: '11', ratio: '19%' },
    responses: 2,
    impression: '3.5',
    price: '$1–3',
    yes: 50,
    maybe: 50,
    no: 0,
    list: [
      {
        id: 'tally-0',
        who: 'Ari Cohen',
        app: 'Lumen',
        hue: 95,
        when: 'Oct 13',
        stars: '4/5',
        text: 'Sorting by aisle is the feature. Lead with it.',
        confusion: 'Inviting housemates took two tries',
        keep: 'Maybe',
        optIn: true,
      },
    ],
  },
};

export const MILESTONES = [
  {
    id: 'first-match',
    badge: '🎉',
    title: 'First match',
    sub: 'You and Lena agreed to trade apps',
  },
  {
    id: 'first-trade',
    badge: '🤝',
    title: 'First completed trade',
    sub: 'Both of you sent feedback',
  },
  {
    id: 'target-opened',
    badge: '🎯',
    title: '68% of your ideal users opened your profile',
    sub: 'Last 30 days on Tidepool',
  },
  {
    id: 'monthly',
    badge: '📈',
    title: 'October launch report',
    sub: '412 views · 3 matches · 2 trades · 23% hey ratio',
  },
];

export const FILTER_GROUPS = {
  sort: { title: 'Sort by', single: true, opts: ['Best fit', 'Newest', 'Most liked'] },
  cat: {
    title: 'Category',
    opts: [
      'Productivity',
      'Finance',
      'Health & fitness',
      'Dev tools',
      'AI tools',
      'Food & drink',
      'Parenting',
      'Games',
    ],
  },
  plat: { title: 'Platform', opts: ['iPhone', 'Android', 'Mac', 'Web', 'Chrome extension'] },
  stage: { title: 'Stage', opts: ['Beta / TestFlight', 'Live', 'Has revenue'] },
} as const;

export const QUICK_CHIPS = ['For you', 'New this week', 'Verified', 'Has revenue'];

export const EMOJI_TRAY = ['😀', '😂', '🙌', '🔥', '👀', '🎉', '💯', '🙏', '👍', '❤️'];

export const AGES = ['18–24', '25–34', '35–44', '45–54', '55+'];

/** Drops a leading emoji from an option label for display on profiles. */
export function stripEmoji(label: string): string {
  return label.replace(/^[^A-Za-z0-9$]+\s/, '');
}

/** "Brewlog: Coffee Brew Journal" → "Brewlog". */
export function shortName(name: string): string {
  return name.split(':')[0];
}

/** The public listing path, as in hey100.com/{slug}. */
export function slugify(name: string): string {
  return shortName(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
