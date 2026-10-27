import { useSyncExternalStore } from 'react';

import { LISTINGS, MATCH_APPS, slugify } from '@/data/mock';
import type {
  CommunityGroup,
  CommunityMember,
  CommunityReply,
  CommunityThread,
  GroupPowerStats,
  JoinMode,
} from '@/data/repo/community';

export const REACTION_SET = ['👍', '🔥', '💙', '😂', '🙏', '👀', '🎉', '❤️', '🙌', '💯', '✨', '🚀'] as const;

export const REPORT_REASONS = [
  'Spam or self-promotion',
  'Harassment or hate',
  'Scam or fraud',
  'Off-topic for Hey100',
  'Something else',
] as const;

export function isSeedId(id?: string | null): boolean {
  return !!id && id.startsWith('seed-');
}

type Builder = { id: string; name: string; photo?: string; listingId?: string; hue: number };

const people: Record<string, Builder> = {
  nina: { id: 'nina', name: LISTINGS.brew.builder, listingId: 'brew', hue: LISTINGS.brew.hue },
  omar: { id: 'omar', name: LISTINGS.ship.builder, listingId: 'ship', hue: LISTINGS.ship.hue },
  priya: { id: 'priya', name: LISTINGS.lullo.builder, listingId: 'lullo', hue: LISTINGS.lullo.hue },
  tom: { id: 'tom', name: LISTINGS.fern.builder, listingId: 'fern', hue: LISTINGS.fern.hue },
  hana: { id: 'hana', name: LISTINGS.ink.builder, listingId: 'ink', hue: LISTINGS.ink.hue },
  dev: { id: 'dev', name: LISTINGS.grid.builder, listingId: 'grid', hue: LISTINGS.grid.hue },
  lena: { id: 'lena', name: MATCH_APPS.cad.builder, listingId: 'cad', hue: MATCH_APPS.cad.hue },
  ari: { id: 'ari', name: MATCH_APPS.lum.builder, listingId: 'lum', hue: MATCH_APPS.lum.hue },
  sam: { id: 'sam', name: MATCH_APPS.pt.builder, listingId: 'pt', hue: MATCH_APPS.pt.hue },
};

function ago(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function person(id: string): Builder {
  return people[id] ?? { id, name: 'A builder', hue: 128 };
}

function group(input: {
  id: string;
  name: string;
  bio: string;
  audience: string;
  joinMode: JoinMode;
  owner: string;
  members: number;
  weeklyActive: number;
  hue: number;
  membership: CommunityGroup['membership'];
  unread?: boolean;
  last: { by: string; body: string; hours: number };
  mem?: string[];
  ratingAvg?: number;
  ratingCount?: number;
  pendingCount?: number;
  power?: GroupPowerStats;
}): CommunityGroup {
  const owner = person(input.owner);
  const last = person(input.last.by);
  return {
    id: input.id,
    name: input.name,
    bio: input.bio,
    audience: input.audience,
    joinMode: input.joinMode,
    createdBy: owner.id,
    ownerName: owner.name,
    memberCount: input.members,
    weeklyActive: input.weeklyActive,
    hue: input.hue,
    membership: input.membership,
    role: input.membership === 'active' && input.owner === 'me' ? 'owner' : 'member',
    unread: input.unread,
    lastReadAt: input.unread ? ago(input.last.hours + 8) : ago(input.last.hours),
    lastAuthor: last.name,
    lastAuthorPhoto: last.photo,
    lastPreview: input.last.body,
    lastAt: ago(input.last.hours),
    ownerPhoto: owner.photo,
    memberStack: input.mem?.map((id) => {
      const who = person(id);
      return { name: who.name, photo: who.photo };
    }),
    ratingAvg: input.ratingAvg,
    ratingCount: input.ratingCount,
    pendingCount: input.pendingCount,
    threadCount: input.weeklyActive,
    power: input.power,
  };
}

const SEED_GROUPS: CommunityGroup[] = [
  group({
    id: 'seed-growth',
    name: 'First 100 Users',
    bio: 'Tactics for landing your first users. Launch posts, cold outreach, TikTok, communities: what worked and what flopped.',
    audience: 'Builders pre-launch or under 1k users',
    joinMode: 'request',
    owner: 'tom',
    members: 1280,
    weeklyActive: 38,
    hue: 128,
    membership: 'active',
    unread: true,
    mem: ['tom', 'ari', 'priya', 'omar'],
    ratingAvg: 4.8,
    ratingCount: 42,
    pendingCount: 2,
    power: { revenue: '$42k', customers: '8.4k', commits: '94k' },
    last: { by: 'tom', body: "What's your user count this week, and what moved it?", hours: 20 },
  }),
  group({
    id: 'seed-ship',
    name: 'Ship Weekly',
    bio: 'Post what you shipped this week, no matter how small. Fridays are demo day.',
    audience: 'Anyone with an app live or in beta',
    joinMode: 'open',
    owner: 'omar',
    members: 412,
    weeklyActive: 21,
    hue: 30,
    membership: 'active',
    mem: ['omar', 'nina', 'sam', 'lena'],
    ratingAvg: 4.6,
    ratingCount: 18,
    power: { revenue: '$18k', customers: '2.4k', commits: '28k' },
    last: { by: 'sam', body: 'Shipped dark mode in Pocket Tutor. Took 3 weekends.', hours: 5 },
  }),
  group({
    id: 'seed-ios',
    name: 'SwiftUI Corner',
    bio: 'SwiftUI questions, snippets and App Store review war stories.',
    audience: 'iOS developers',
    joinMode: 'open',
    owner: 'nina',
    members: 640,
    weeklyActive: 17,
    hue: 250,
    membership: 'active',
    unread: true,
    mem: ['nina', 'omar', 'ari'],
    ratingAvg: 4.4,
    ratingCount: 11,
    power: { revenue: '$12k', customers: '1.1k', commits: '41k' },
    last: { by: 'nina', body: 'App Review rejected my build for incomplete information.', hours: 3 },
  }),
  group({
    id: 'seed-ai',
    name: 'AI Builders',
    bio: 'Shipping products on top of LLMs. Costs, evals, prompts and pricing.',
    audience: 'Anyone building with AI APIs',
    joinMode: 'open',
    owner: 'ari',
    members: 2104,
    weeklyActive: 64,
    hue: 300,
    membership: null,
    mem: ['ari', 'sam', 'lena', 'omar'],
    ratingAvg: 4.2,
    ratingCount: 9,
    power: { revenue: '$86k', customers: '14k', commits: '180k' },
    last: { by: 'ari', body: 'We cut token spend 40% by caching system prompts.', hours: 2 },
  }),
  group({
    id: 'seed-pricing',
    name: 'Pricing & Paywalls',
    bio: 'Paywall screenshots, pricing experiments and RevenueCat numbers. Share real data.',
    audience: 'Apps with a paywall or about to add one',
    joinMode: 'request',
    owner: 'lena',
    members: 530,
    weeklyActive: 12,
    hue: 85,
    membership: null,
    mem: ['lena', 'ari', 'priya'],
    ratingAvg: 4.5,
    ratingCount: 14,
    power: { revenue: '$64k', customers: '9.2k', commits: '22k' },
    last: { by: 'lena', body: 'Annual vs monthly: our conversion after the switch.', hours: 26 },
  }),
  group({
    id: 'seed-couples',
    name: 'Couples & Family Apps',
    bio: 'Building for partners, parents and households. Swap users and share what works.',
    audience: 'Builders shipping for two or more people',
    joinMode: 'open',
    owner: 'priya',
    members: 96,
    weeklyActive: 5,
    hue: 350,
    membership: null,
    power: { revenue: '$4.2k', customers: '680', commits: '6.1k' },
    last: { by: 'priya', body: 'What actually gets a second person to open the app?', hours: 48 },
  }),
];

function authorFields(id: string) {
  const who = person(id);
  return {
    authorId: who.id,
    authorName: who.name,
    authorPhoto: who.photo,
    authorListingId: who.listingId,
    owner: false,
  };
}

function thread(input: {
  id: string;
  groupId: string;
  by: string;
  hours: number;
  body: string;
  reacts?: Record<string, number>;
  replies: { by: string; body: string; hours: number }[];
}): CommunityThread {
  const replyRows = input.replies.map((reply, index) => ({
    ...authorFields(reply.by),
    id: `${input.id}-r${index}`,
    threadId: input.id,
    body: reply.body,
    createdAt: ago(reply.hours),
  }));
  const seen = new Set<string>();
  const replyAvatars = replyRows
    .filter((reply) => {
      if (seen.has(reply.authorId)) return false;
      seen.add(reply.authorId);
      return true;
    })
    .slice(0, 6)
    .map((reply) => ({ name: reply.authorName, photo: reply.authorPhoto }));

  return {
    ...authorFields(input.by),
    id: input.id,
    groupId: input.groupId,
    body: input.body,
    createdAt: ago(input.hours),
    replyCount: replyRows.length,
    reactions: Object.entries(input.reacts ?? {}).map(([emoji, count]) => ({
      emoji,
      count,
      mine: false,
    })),
    replyAvatars,
  };
}

const SEED_THREADS: CommunityThread[] = [
  thread({
    id: 'seed-g1',
    groupId: 'seed-growth',
    by: 'tom',
    hours: 200,
    body: "📣 Launch thread is open 📣\n\nDrop your launch link and one line on who it's for. Everyone who posts tries two apps from this thread and leaves a note.",
    reacts: { '👍': 14, '🔥': 6 },
    replies: [
      { by: 'ari', body: "Lumen: AI journaling for people who hate journaling.", hours: 190 },
      { by: 'priya', body: 'Lullo: sleep sounds for parents of newborns. Tried Lumen, the 30-second prompt is great.', hours: 180 },
      { by: 'omar', body: 'Shiftly: shift swaps for hourly teams. Would love a pass from anyone who has worked retail.', hours: 170 },
      { by: 'nina', body: 'Brewlog, for coffee nerds who own a scale. Tried Shiftly, onboarding is quick.', hours: 160 },
      { by: 'sam', body: 'Pocket Tutor: math help that explains each step. Tried Brewlog.', hours: 150 },
      { by: 'lena', body: 'Cadence: habit streaks for two. Tried Lullo, the wind-down timer is lovely.', hours: 140 },
    ],
  }),
  thread({
    id: 'seed-g2',
    groupId: 'seed-growth',
    by: 'priya',
    hours: 80,
    body: 'Has anyone had TikTok work for a utility app? Our sleep app video got 40k views and 12 installs. Is it the hook or the link in bio?',
    reacts: { '👀': 3 },
    replies: [
      { by: 'omar', body: "Same experience. Views came from the hook, but nobody knew what the app was until 20 seconds in.", hours: 70 },
      { by: 'ari', body: 'Put the app name on screen in the first second. Ours doubled installs per 1k views.', hours: 60 },
      { by: 'tom', body: 'Also pin a comment with the App Store link. Bio links lose most people.', hours: 50 },
    ],
  }),
  thread({
    id: 'seed-g3',
    groupId: 'seed-growth',
    by: 'omar',
    hours: 90,
    body: 'Cold DMs on Reddit got me my first 30 users. I only messaged people who posted the exact problem in the last week. Happy to share the template.',
    reacts: { '🙏': 9 },
    replies: [
      { by: 'sam', body: 'Please do. How many did you send to get 30?', hours: 85 },
      { by: 'omar', body: 'About 140. Roughly 1 in 5 replied, 1 in 5 of those installed.', hours: 82 },
    ],
  }),
  thread({
    id: 'seed-g4',
    groupId: 'seed-growth',
    by: 'tom',
    hours: 20,
    body: "== WEEKLY CHECK-IN ==\n\nWhat's your user count this week, and what moved it? Reply in the thread. I'll pull the best tactics into a pinned post on Friday.",
    reacts: { '👍': 8, '💙': 1, '😂': 1 },
    replies: [
      { by: 'lena', body: '312 → 365. A Hey100 trade with Lullo sent us 20 couples.', hours: 18 },
      { by: 'ari', body: '1,940 → 2,210. Product Hunt relaunch, mostly.', hours: 16 },
      { by: 'nina', body: '88 → 104. Posted in two coffee subreddits.', hours: 14 },
    ],
  }),
  thread({
    id: 'seed-s1',
    groupId: 'seed-ship',
    by: 'omar',
    hours: 72,
    body: 'Ship log for the week 🚢 What did you get out the door? Screenshots welcome.',
    reacts: { '🎉': 5 },
    replies: [
      { by: 'nina', body: 'Brewlog 1.4: recipe sharing links.', hours: 60 },
    ],
  }),
  thread({
    id: 'seed-s2',
    groupId: 'seed-ship',
    by: 'sam',
    hours: 5,
    body: 'Shipped dark mode in Pocket Tutor. Took 3 weekends, mostly fighting hard-coded colors.',
    reacts: { '🔥': 7 },
    replies: [],
  }),
  thread({
    id: 'seed-i1',
    groupId: 'seed-ios',
    by: 'nina',
    hours: 3,
    body: 'App Review rejected my build for "incomplete information" because the test account password expired. Has anyone found a way to keep a review account alive?',
    reacts: { '👍': 4 },
    replies: [
      { by: 'tom', body: 'I rotate a dedicated review@ email and put the password in the notes field every submit.', hours: 2 },
    ],
  }),
  thread({
    id: 'seed-a1',
    groupId: 'seed-ai',
    by: 'ari',
    hours: 2,
    body: 'We cut token spend 40% by caching the system prompt and only sending the last 8 turns. Happy to share the snippet.',
    reacts: { '🔥': 11 },
    replies: [{ by: 'hana', body: 'Please do. We are burning $0.18 per journal letter.', hours: 1 }],
  }),
  thread({
    id: 'seed-p1',
    groupId: 'seed-pricing',
    by: 'lena',
    hours: 26,
    body: 'Switched Cadence from monthly-first to annual-first. Trial-to-paid went 4.1% → 6.8%. Happy to show the paywall.',
    reacts: { '👀': 6 },
    replies: [],
  }),
  thread({
    id: 'seed-c1',
    groupId: 'seed-couples',
    by: 'priya',
    hours: 48,
    body: 'What actually gets a second person to open the app? Invites die in iMessage for us.',
    reacts: { '🙏': 2 },
    replies: [{ by: 'lena', body: 'A shared streak they can see without signing up first.', hours: 40 }],
  }),
];

function repliesFor(threadId: string): CommunityReply[] {
  const catalog: Record<string, { by: string; body: string; hours: number }[]> = {
    'seed-g1': [
      { by: 'ari', body: "Lumen: AI journaling for people who hate journaling.", hours: 190 },
      { by: 'priya', body: 'Lullo: sleep sounds for parents of newborns. Tried Lumen, the 30-second prompt is great.', hours: 180 },
      { by: 'omar', body: 'Shiftly: shift swaps for hourly teams. Would love a pass from anyone who has worked retail.', hours: 170 },
      { by: 'nina', body: 'Brewlog, for coffee nerds who own a scale. Tried Shiftly, onboarding is quick.', hours: 160 },
      { by: 'sam', body: 'Pocket Tutor: math help that explains each step. Tried Brewlog.', hours: 150 },
      { by: 'lena', body: 'Cadence: habit streaks for two. Tried Lullo, the wind-down timer is lovely.', hours: 140 },
    ],
    'seed-g2': [
      { by: 'omar', body: "Same experience. Views came from the hook, but nobody knew what the app was until 20 seconds in.", hours: 70 },
      { by: 'ari', body: 'Put the app name on screen in the first second. Ours doubled installs per 1k views.', hours: 60 },
      { by: 'tom', body: 'Also pin a comment with the App Store link. Bio links lose most people.', hours: 50 },
    ],
    'seed-g3': [
      { by: 'sam', body: 'Please do. How many did you send to get 30?', hours: 85 },
      { by: 'omar', body: 'About 140. Roughly 1 in 5 replied, 1 in 5 of those installed.', hours: 82 },
    ],
    'seed-g4': [
      { by: 'lena', body: '312 → 365. A Hey100 trade with Lullo sent us 20 couples.', hours: 18 },
      { by: 'ari', body: '1,940 → 2,210. Product Hunt relaunch, mostly.', hours: 16 },
      { by: 'nina', body: '88 → 104. Posted in two coffee subreddits.', hours: 14 },
    ],
    'seed-s1': [{ by: 'nina', body: 'Brewlog 1.4: recipe sharing links.', hours: 60 }],
    'seed-i1': [
      { by: 'tom', body: 'I rotate a dedicated review@ email and put the password in the notes field every submit.', hours: 2 },
    ],
    'seed-a1': [{ by: 'hana', body: 'Please do. We are burning $0.18 per journal letter.', hours: 1 }],
    'seed-c1': [{ by: 'lena', body: 'A shared streak they can see without signing up first.', hours: 40 }],
  };

  return (catalog[threadId] ?? []).map((reply, index) => ({
    ...authorFields(reply.by),
    id: `${threadId}-r${index}`,
    threadId,
    body: reply.body,
    createdAt: ago(reply.hours),
  }));
}

let version = 0;
const listeners = new Set<() => void>();
const extraThreads: CommunityThread[] = [];
const extraReplies = new Map<string, CommunityReply[]>();
const readIds = new Set<string>();
const joined = new Set<string>(['seed-growth', 'seed-ship', 'seed-ios']);
const pending = new Set<string>();
const muted = new Set<string>();

function emit() {
  version += 1;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSeedTick() {
  return useSyncExternalStore(subscribe, () => version, () => 0);
}

export function seedHome(): { mine: CommunityGroup[]; discover: CommunityGroup[] } {
  const mine: CommunityGroup[] = [];
  const discover: CommunityGroup[] = [];
  for (const item of SEED_GROUPS) {
    const membership: CommunityGroup['membership'] = pending.has(item.id)
      ? 'pending'
      : joined.has(item.id)
        ? 'active'
        : null;
    const unread = membership === 'active' && item.unread && !readIds.has(item.id);
    const row = {
      ...item,
      membership,
      unread,
      muted: muted.has(item.id),
      myRating: seedRatings.get(item.id),
      pendingCount: membership === 'active' ? extraPending.get(item.id)?.length ?? item.pendingCount ?? 0 : 0,
    };
    if (membership) mine.push(row);
    else discover.push(row);
  }
  return { mine, discover };
}

export function seedGroup(id: string): CommunityGroup | null {
  const { mine, discover } = seedHome();
  return [...mine, ...discover].find((group) => group.id === id) ?? null;
}

export function seedThreads(groupId: string): CommunityThread[] {
  return [...SEED_THREADS.filter((item) => item.groupId === groupId), ...extraThreads.filter((item) => item.groupId === groupId)]
    .slice()
    .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
}

export function seedThread(threadId: string): { thread: CommunityThread | null; replies: CommunityReply[] } {
  const thread = [...SEED_THREADS, ...extraThreads].find((item) => item.id === threadId) ?? null;
  if (!thread) return { thread: null, replies: [] };
  return {
    thread,
    replies: [...repliesFor(threadId), ...(extraReplies.get(threadId) ?? [])],
  };
}

export function seedMarkRead(groupId: string) {
  readIds.add(groupId);
  emit();
}

export function seedJoin(groupId: string, skipApproval: boolean) {
  if (skipApproval) joined.add(groupId);
  else pending.add(groupId);
  emit();
}

export function seedBySlug(slug: string): CommunityGroup | null {
  const needle = slug.toLowerCase();
  return (
    SEED_GROUPS.find((item) => item.id === slug || slugify(item.name) === needle) ?? null
  );
}

const extraPending = new Map<string, CommunityMember[]>([
  [
    'seed-growth',
    [
      {
        userId: 'hana',
        name: people.hana.name,
        role: 'member',
        status: 'pending',
        apps: 1,
        commits: 148,
        revenue: 'Revenue',
        appIds: ['ink'],
        bio: LISTINGS.ink.role,
        note: 'Shipping Inkwell. Would love to share our TikTok hook tests.',
      },
      {
        userId: 'dev',
        name: people.dev.name,
        role: 'member',
        status: 'pending',
        apps: 1,
        commits: 90,
        revenue: '—',
        appIds: ['grid'],
        bio: LISTINGS.grid.role,
        note: 'Gridline is live. I can review landing pages for the group.',
      },
    ],
  ],
]);

const seedRatings = new Map<string, number>();

export function seedRequests(groupId: string): CommunityMember[] {
  return extraPending.get(groupId) ?? [];
}

export function seedReview(groupId: string, userId: string, accept: boolean) {
  const list = extraPending.get(groupId) ?? [];
  extraPending.set(
    groupId,
    accept ? list.filter((row) => row.userId !== userId) : list.filter((row) => row.userId !== userId),
  );
  const group = SEED_GROUPS.find((item) => item.id === groupId);
  if (group && group.pendingCount) group.pendingCount = Math.max(0, group.pendingCount - 1);
  emit();
}

export function seedRate(groupId: string, stars: number) {
  seedRatings.set(groupId, stars);
  const group = SEED_GROUPS.find((item) => item.id === groupId);
  if (group) {
    const count = group.ratingCount ?? 0;
    const avg = group.ratingAvg ?? stars;
    group.ratingAvg = count ? (avg * count + stars) / (count + (group.myRating ? 0 : 1)) : stars;
    if (!group.myRating) group.ratingCount = count + 1;
    group.myRating = stars;
  }
  emit();
}

export function seedLeave(groupId: string) {
  joined.delete(groupId);
  pending.delete(groupId);
  emit();
}

export function seedMute(groupId: string, next: boolean) {
  if (next) muted.add(groupId);
  else muted.delete(groupId);
  emit();
}

export function seedStartThread(groupId: string, authorId: string, body: string): string {
  const id = `seed-local-${Date.now()}`;
  extraThreads.unshift({
    id,
    groupId,
    authorId,
    authorName: 'You',
    body,
    createdAt: new Date().toISOString(),
    replyCount: 0,
    reactions: [],
    replyAvatars: [],
    owner: false,
  });
  emit();
  return id;
}

export function seedReply(threadId: string, authorId: string, body: string) {
  const list = extraReplies.get(threadId) ?? [];
  list.push({
    id: `${threadId}-local-${Date.now()}`,
    threadId,
    authorId,
    authorName: 'You',
    body,
    createdAt: new Date().toISOString(),
  });
  extraReplies.set(threadId, list);
  const live = extraThreads.find((item) => item.id === threadId);
  if (live) live.replyCount += 1;
  emit();
}

const SEED_MEMBERS: Record<string, string[]> = {
  'seed-growth': ['tom', 'ari', 'priya', 'omar', 'nina', 'lena', 'sam'],
  'seed-ship': ['omar', 'nina', 'sam', 'lena'],
  'seed-ios': ['nina', 'omar', 'ari'],
  'seed-ai': ['ari', 'sam', 'lena', 'omar'],
  'seed-pricing': ['lena', 'ari', 'priya'],
  'seed-couples': ['priya', 'lena'],
};

export function seedMembers(groupId: string): CommunityMember[] {
  const owner = seedGroup(groupId)?.createdBy;
  return (SEED_MEMBERS[groupId] ?? []).map((id) => {
    const who = person(id);
    return {
      userId: who.id,
      name: who.name,
      photo: who.photo,
      role: who.id === owner ? 'owner' : 'member',
      status: 'active',
      apps: 1,
      commits: null,
      revenue: '—',
      appIds: who.listingId ? [who.listingId] : [],
      bio: who.listingId
        ? (LISTINGS[who.listingId] ?? MATCH_APPS[who.listingId])?.role
        : undefined,
    };
  });
}

export function seedToggleReaction(targetId: string, emoji: string, kind: 'thread' | 'reply') {
  const apply = (reactions: CommunityThread['reactions'] = []) => {
    const current = reactions.find((row) => row.emoji === emoji);
    if (current?.mine) {
      current.count -= 1;
      current.mine = false;
      return current.count <= 0 ? reactions.filter((row) => row.emoji !== emoji) : reactions;
    }
    if (current) {
      current.count += 1;
      current.mine = true;
      return reactions;
    }
    return [...reactions, { emoji, count: 1, mine: true }];
  };

  if (kind === 'thread') {
    const item = [...SEED_THREADS, ...extraThreads].find((row) => row.id === targetId);
    if (item) item.reactions = apply(item.reactions);
  } else {
    for (const list of extraReplies.values()) {
      const item = list.find((row) => row.id === targetId);
      if (item) item.reactions = apply(item.reactions);
    }
  }
  emit();
}
