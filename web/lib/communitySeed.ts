export const REACTION_SET = ['👍', '🔥', '💙', '😂', '🙏', '👀', '🎉', '❤️', '🙌', '💯', '✨', '🚀'];

export const JOINED_SEED = new Set(['seed-growth', 'seed-ship', 'seed-ios']);

export type SeedMember = {
  name: string;
  hue: number;
  role?: 'owner' | 'member';
  photo?: string | null;
  bio?: string;
  app?: string;
  appHue?: number;
  appIcon?: string | null;
  listings?: { name: string; hue: number; icon?: string | null }[];
  karma?: number;
  apps?: number;
  commits?: number | null;
  revenue?: string;
};

export type SeedGroup = {
  id: string;
  name: string;
  bio: string;
  cover_path?: string | null;
  member_count: number;
  join_mode: string;
  audience?: string;
  rating_avg?: number;
  rating_count?: number;
  weekly_active?: number;
  power?: { revenue: string; customers: string; commits: string };
  members?: SeedMember[];
  last_preview?: string | null;
  last_author?: string | null;
};

export type SeedReply = { id: string; author: string; hue: number; body: string; created_at: string };

export type SeedThread = {
  id: string;
  group_id: string;
  author_id: string;
  author: string;
  hue: number;
  body: string;
  created_at: string;
  reactions: { emoji: string; count: number }[];
  replies: number;
  replyRows?: SeedReply[];
};

const ago = (hours: number) => new Date(Date.now() - hours * 3600_000).toISOString();

export const SEED_GROUPS: SeedGroup[] = [
  {
    id: 'seed-growth',
    name: 'First 100 Users',
    bio: 'Tactics for landing your first users. Launch posts, cold outreach, TikTok, communities: what worked and what flopped.',
    audience: 'Builders pre-launch or under 1k users',
    member_count: 1280,
    weekly_active: 38,
    join_mode: 'request',
    rating_avg: 4.8,
    rating_count: 42,
    power: { revenue: '$42k', customers: '8.4k', commits: '94k' },
    members: [
      { name: 'Tom Ellis', hue: 128, role: 'owner', bio: 'iOS, growth, and launch posts', app: 'Fern', appHue: 128 },
      { name: 'Ari Cohen', hue: 95, bio: 'AI journaling that people actually open', app: 'Lumen', appHue: 95 },
      { name: 'Priya Shah', hue: 350, bio: 'Sleep sounds for parents of newborns', app: 'Lullo', appHue: 350 },
      { name: 'Omar Reyes', hue: 30, bio: 'Shift swaps for hourly teams', app: 'Shiftly', appHue: 30 },
    ],
  },
  {
    id: 'seed-ship',
    name: 'Ship Weekly',
    bio: 'Post what you shipped this week, no matter how small. Fridays are demo day.',
    audience: 'Anyone with an app live or in beta',
    member_count: 412,
    weekly_active: 21,
    join_mode: 'open',
    rating_avg: 4.6,
    rating_count: 18,
    power: { revenue: '$18k', customers: '2.4k', commits: '28k' },
    members: [
      { name: 'Omar Reyes', hue: 30, role: 'owner', bio: 'Ships every Friday', app: 'Shiftly', appHue: 30 },
      { name: 'Nina Park', hue: 250, bio: 'iOS dev and designer', app: 'Brewlog', appHue: 55 },
      { name: 'Sam Ortiz', hue: 30, bio: 'Tutors in your pocket', app: 'Pocket Tutor', appHue: 30 },
      { name: 'Lena Vogel', hue: 85, bio: 'Shared calendars for couples', app: 'Cadence', appHue: 85 },
    ],
  },
  {
    id: 'seed-ios',
    name: 'SwiftUI Corner',
    bio: 'SwiftUI questions, snippets and App Store review war stories.',
    audience: 'iOS developers',
    member_count: 640,
    weekly_active: 17,
    join_mode: 'open',
    rating_avg: 4.4,
    rating_count: 11,
    power: { revenue: '$12k', customers: '1.1k', commits: '41k' },
    members: [
      { name: 'Nina Park', hue: 250, role: 'owner', bio: 'SwiftUI and App Review war stories', app: 'Brewlog', appHue: 55 },
      { name: 'Omar Reyes', hue: 30, bio: 'UIKit refugee', app: 'Shiftly', appHue: 30 },
      { name: 'Ari Cohen', hue: 95, bio: 'Shipping LLM products', app: 'Lumen', appHue: 95 },
    ],
  },
  {
    id: 'seed-ai',
    name: 'AI Builders',
    bio: 'Shipping products on top of LLMs. Costs, evals, prompts and pricing.',
    audience: 'Anyone building with AI APIs',
    member_count: 2104,
    weekly_active: 64,
    join_mode: 'open',
    rating_avg: 4.2,
    rating_count: 9,
    power: { revenue: '$86k', customers: '14k', commits: '180k' },
    members: [
      { name: 'Ari Cohen', hue: 300, role: 'owner' },
      { name: 'Sam Ortiz', hue: 30 },
      { name: 'Lena Vogel', hue: 85 },
      { name: 'Omar Reyes', hue: 30 },
    ],
  },
  {
    id: 'seed-pricing',
    name: 'Pricing & Paywalls',
    bio: 'Paywall screenshots, pricing experiments and RevenueCat numbers.',
    audience: 'Apps with a paywall or about to add one',
    member_count: 530,
    weekly_active: 12,
    join_mode: 'request',
    rating_avg: 4.5,
    rating_count: 14,
    power: { revenue: '$64k', customers: '9.2k', commits: '22k' },
    members: [
      { name: 'Lena Vogel', hue: 85, role: 'owner' },
      { name: 'Ari Cohen', hue: 95 },
      { name: 'Priya Shah', hue: 350 },
    ],
  },
  {
    id: 'seed-couples',
    name: 'Couples & Family Apps',
    bio: 'Building for partners, parents and households.',
    audience: 'Builders shipping for two or more people',
    member_count: 96,
    weekly_active: 5,
    join_mode: 'open',
    rating_avg: 4.1,
    rating_count: 6,
    power: { revenue: '$4.2k', customers: '680', commits: '6.1k' },
    members: [
      { name: 'Priya Shah', hue: 350, role: 'owner' },
      { name: 'Lena Vogel', hue: 85 },
    ],
  },
];

export const SEED_THREADS: SeedThread[] = [
  {
    id: 'seed-g1',
    group_id: 'seed-growth',
    author_id: 'seed-tom',
    author: 'Tom Ellis',
    hue: 128,
    body: "📣 Launch thread is open 📣\n\nDrop your launch link and one line on who it's for. Everyone who posts tries two apps from this thread and leaves a note.",
    created_at: ago(200),
    reactions: [
      { emoji: '👍', count: 14 },
      { emoji: '🔥', count: 6 },
    ],
    replies: 6,
    replyRows: [
      { id: 'seed-g1-r0', author: 'Ari Cohen', hue: 95, body: 'Lumen: AI journaling for people who hate journaling.', created_at: ago(190) },
      { id: 'seed-g1-r1', author: 'Priya Shah', hue: 350, body: 'Lullo: sleep sounds for parents of newborns. Tried Lumen, the 30-second prompt is great.', created_at: ago(180) },
      { id: 'seed-g1-r2', author: 'Omar Reyes', hue: 30, body: 'Shiftly: shift swaps for hourly teams. Would love a pass from anyone who has worked retail.', created_at: ago(170) },
    ],
  },
  {
    id: 'seed-g2',
    group_id: 'seed-growth',
    author_id: 'seed-priya',
    author: 'Priya Shah',
    hue: 350,
    body: 'Has anyone had TikTok work for a utility app? Our sleep app video got 40k views and 12 installs. Is it the hook or the link in bio?',
    created_at: ago(80),
    reactions: [{ emoji: '👀', count: 3 }],
    replies: 3,
    replyRows: [
      { id: 'seed-g2-r0', author: 'Omar Reyes', hue: 30, body: 'Same experience. Views came from the hook, but nobody knew what the app was until 20 seconds in.', created_at: ago(70) },
      { id: 'seed-g2-r1', author: 'Ari Cohen', hue: 95, body: 'Put the app name on screen in the first second. Ours doubled installs per 1k views.', created_at: ago(60) },
    ],
  },
  {
    id: 'seed-g4',
    group_id: 'seed-growth',
    author_id: 'seed-tom',
    author: 'Tom Ellis',
    hue: 128,
    body: "== WEEKLY CHECK-IN ==\n\nWhat's your user count this week, and what moved it?",
    created_at: ago(20),
    reactions: [
      { emoji: '🔥', count: 12 },
      { emoji: '👍', count: 8 },
    ],
    replies: 3,
    replyRows: [
      { id: 'seed-g4-r0', author: 'Lena Vogel', hue: 85, body: '312 → 365. A Hey100 trade with Lullo sent us 20 couples.', created_at: ago(18) },
    ],
  },
  {
    id: 'seed-s2',
    group_id: 'seed-ship',
    author_id: 'seed-sam',
    author: 'Sam Ortiz',
    hue: 30,
    body: 'Shipped dark mode in Pocket Tutor. Took 3 weekends, mostly fighting hard-coded colors.',
    created_at: ago(5),
    reactions: [{ emoji: '🎉', count: 9 }],
    replies: 1,
    replyRows: [{ id: 'seed-s2-r0', author: 'Nina Park', hue: 250, body: 'Brewlog 1.4: recipe sharing links.', created_at: ago(4) }],
  },
  {
    id: 'seed-i1',
    group_id: 'seed-ios',
    author_id: 'seed-nina',
    author: 'Nina Park',
    hue: 250,
    body: 'App Review rejected my build for "incomplete information" because the test account password expired. Has anyone found a way to keep a review account alive?',
    created_at: ago(3),
    reactions: [
      { emoji: '🙏', count: 14 },
      { emoji: '👀', count: 5 },
    ],
    replies: 1,
    replyRows: [
      { id: 'seed-i1-r0', author: 'Tom Ellis', hue: 128, body: 'I rotate a dedicated review@ email and put the password in the notes field every submit.', created_at: ago(2) },
    ],
  },
  {
    id: 'seed-a1',
    group_id: 'seed-ai',
    author_id: 'seed-ari',
    author: 'Ari Cohen',
    hue: 300,
    body: 'We cut token spend 40% by caching the system prompt and only sending the last 8 turns. Happy to share the snippet.',
    created_at: ago(2),
    reactions: [{ emoji: '🔥', count: 11 }],
    replies: 1,
    replyRows: [{ id: 'seed-a1-r0', author: 'Hana Kim', hue: 200, body: 'Please do. We are burning $0.18 per journal letter.', created_at: ago(1) }],
  },
  {
    id: 'seed-p1',
    group_id: 'seed-pricing',
    author_id: 'seed-lena',
    author: 'Lena Vogel',
    hue: 85,
    body: 'Switched Cadence from monthly-first to annual-first. Trial-to-paid went 4.1% → 6.8%. Happy to show the paywall.',
    created_at: ago(26),
    reactions: [{ emoji: '👀', count: 6 }],
    replies: 0,
  },
  {
    id: 'seed-c1',
    group_id: 'seed-couples',
    author_id: 'seed-priya',
    author: 'Priya Shah',
    hue: 350,
    body: 'What actually gets a second person to open the app? Invites die in iMessage for us.',
    created_at: ago(48),
    reactions: [{ emoji: '🙏', count: 2 }],
    replies: 1,
    replyRows: [{ id: 'seed-c1-r0', author: 'Lena Vogel', hue: 85, body: 'A shared streak they can see without signing up first.', created_at: ago(40) }],
  },
];

export function isSeedId(id?: string | null) {
  return !!id && id.startsWith('seed-');
}
