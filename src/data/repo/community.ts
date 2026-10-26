import { useQuery } from '@tanstack/react-query';

import { slugify } from '@/data/mock';
import { useAuth } from '@/features/auth/AuthProvider';
import type { MediaItem } from '@/data/types';
import { getSupabase, isServerId, publicUrl } from '@/lib/supabase';

import { queryKeys } from './keys';

export type JoinMode = 'open' | 'request' | 'criteria';
export type GroupKind = 'community' | 'official';

/** Seeded official group. Everyone is a member; only admins start threads. */
export const OFFICIAL_GROUP_ID = 'a1000000-1000-4000-8000-000000000001';
export type JoinCriterion = 'revenue' | 'customers' | 'shipping' | 'launched';

export const JOIN_CRITERIA: {
  id: JoinCriterion;
  label: string;
  how: string;
}[] = [
  { id: 'revenue', label: 'Verified revenue', how: 'Connect Stripe or RevenueCat on a listing.' },
  { id: 'customers', label: 'Verified customers', how: 'Connect RevenueCat or Stripe so we can see customers or $1+ in charges.' },
  { id: 'shipping', label: 'Actively shipping', how: 'Connect GitHub so we can see recent commits.' },
  { id: 'launched', label: 'Verified product launched', how: 'Publish a listing with an App Store or website link.' },
];
export type MemberStatus = 'active' | 'pending';
export type MemberRole = 'owner' | 'member';

export type GroupPowerStats = {
  revenue: string;
  customers: string;
  commits: string;
};

export function formatCompact(value: number, money = false): string {
  const n = Number.isFinite(value) ? Math.max(0, value) : 0;
  const prefix = money ? '$' : '';
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`;
  if (n >= 1000) return `${prefix}${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, '')}k`;
  return money ? `${prefix}${Math.round(n)}` : String(Math.round(n));
}

export function formatGroupPower(input: {
  revenue: number;
  customers: number;
  commits: number;
}): GroupPowerStats {
  return {
    revenue: formatCompact(input.revenue, true),
    customers: formatCompact(input.customers),
    commits: formatCompact(input.commits),
  };
}

/** Public path after hey100.com/, same shape as a shared listing. */
export function groupSharePath(group: Pick<CommunityGroup, 'id' | 'name'>): string {
  return `g/${isServerId(group.id) ? group.id : slugify(group.name)}`;
}

export type CommunityReaction = {
  emoji: string;
  count: number;
  mine: boolean;
};

export type CommunityGroup = {
  id: string;
  name: string;
  bio: string;
  audience: string;
  kind?: GroupKind;
  coverUrl?: string;
  joinMode: JoinMode;
  createdBy: string;
  memberCount: number;
  lastPreview?: string;
  lastAuthor?: string;
  lastAt?: string;
  unread?: boolean;
  muted?: boolean;
  membership?: MemberStatus | null;
  role?: MemberRole;
  ownerName?: string;
  ownerPhoto?: string;
  lastAuthorPhoto?: string;
  hue?: number;
  weeklyActive?: number;
  threadCount?: number;
  criteria?: JoinCriterion[];
  ratingAvg?: number;
  ratingCount?: number;
  myRating?: number;
  pendingCount?: number;
  memberStack?: { name: string; photo?: string }[];
  power?: GroupPowerStats;
};

export function isOfficialGroup(group?: Pick<CommunityGroup, 'kind' | 'id'> | null): boolean {
  return group?.kind === 'official' || group?.id === OFFICIAL_GROUP_ID;
}

export type CommunityThread = {
  id: string;
  groupId: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  authorListingId?: string;
  body: string;
  media?: MediaItem[];
  createdAt: string;
  replyCount: number;
  reactions?: CommunityReaction[];
  replyAvatars?: { name: string; photo?: string }[];
  owner?: boolean;
};

export type CommunityReply = {
  id: string;
  threadId: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  authorListingId?: string;
  body: string;
  media?: MediaItem[];
  createdAt: string;
  reactions?: CommunityReaction[];
  owner?: boolean;
};

export type MemberApp = {
  id: string;
  name: string;
  hue: number;
  icon?: string;
};

export type CommunityMember = {
  userId: string;
  name: string;
  photo?: string;
  bio?: string;
  note?: string;
  role: MemberRole;
  status: MemberStatus;
  apps: number;
  commits: number | null;
  revenue: string;
  appIds: string[];
  listings?: MemberApp[];
};

type AnyClient = {
  from: (table: string) => {
    select: (cols: string) => any;
    insert: (row: Record<string, unknown>) => any;
    update: (row: Record<string, unknown>) => any;
    delete: () => any;
    upsert: (row: Record<string, unknown>) => any;
  };
  rpc: (name: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};

function client() {
  const db = getSupabase();
  return db ? (db as unknown as AnyClient) : null;
}

function coverUrl(path?: string | null): string | undefined {
  return path ? publicUrl('listing-media', path) : undefined;
}

function mapGroup(row: {
  id: string;
  name: string;
  bio: string;
  audience: string;
  cover_path?: string | null;
  join_mode: JoinMode;
  kind?: GroupKind;
  created_by: string;
  member_count?: number;
  last_preview?: string | null;
  last_author?: string | null;
  last_at?: string | null;
  unread?: boolean;
  muted?: boolean;
  membership?: MemberStatus | null;
  role?: MemberRole;
  owner_name?: string | null;
  owner_photo?: string | null;
  last_author_photo?: string | null;
  weekly_active?: number;
  thread_count?: number;
  criteria?: JoinCriterion[];
  rating_avg?: number;
  rating_count?: number;
  my_rating?: number;
  pending_count?: number;
  member_stack?: { name: string; photo?: string }[];
  power?: GroupPowerStats;
}): CommunityGroup {
  return {
    id: row.id,
    name: row.name,
    bio: row.bio ?? '',
    audience: row.audience ?? '',
    coverUrl: coverUrl(row.cover_path),
    joinMode: row.join_mode,
    kind: row.kind === 'official' ? 'official' : 'community',
    createdBy: row.created_by,
    memberCount: row.member_count ?? 0,
    lastPreview: row.last_preview ?? undefined,
    lastAuthor: row.last_author ?? undefined,
    lastAuthorPhoto: row.last_author_photo ?? undefined,
    lastAt: row.last_at ?? undefined,
    unread: row.unread,
    muted: row.muted,
    membership: row.membership,
    role: row.role,
    ownerName: row.owner_name ?? undefined,
    ownerPhoto: row.owner_photo ?? undefined,
    hue: hueFromName(row.name),
    weeklyActive: row.weekly_active,
    threadCount: row.thread_count,
    criteria: row.criteria,
    ratingAvg: row.rating_avg,
    ratingCount: row.rating_count,
    myRating: row.my_rating,
    pendingCount: row.pending_count,
    memberStack: row.member_stack,
    power: row.power,
  };
}

export function hueFromName(name: string): number {
  let hue = 0;
  for (let i = 0; i < name.length; i += 1) hue = (hue * 31 + name.charCodeAt(i)) % 360;
  return hue;
}

type StoredMedia = { storage_path?: string; kind?: string; label?: string; uri?: string; video?: boolean };

function mapMedia(raw: unknown): MediaItem[] {
  if (!Array.isArray(raw)) return [];
  const items: MediaItem[] = [];
  for (const item of raw as StoredMedia[]) {
    const uri = item.uri ?? (item.storage_path ? publicUrl('listing-media', item.storage_path) : undefined);
    if (!uri && !item.label) continue;
    items.push({
      label: item.label || (item.kind === 'video' || item.video ? 'Video' : 'Photo'),
      video: item.kind === 'video' || !!item.video,
      uri,
    });
  }
  return items;
}

export async function mediaPayload(userId: string, media: MediaItem[]): Promise<StoredMedia[]> {
  if (!media.length) return [];
  const { uploadAttachments } = await import('@/features/chat/uploadAttachments');
  const uploaded = await uploadAttachments(userId, media);
  return uploaded.map((item) => ({
    storage_path: item.storage_path,
    kind: item.kind,
    label: item.label,
  }));
}

function foldReactions(
  rows: { emoji: string; user_id: string }[],
  userId?: string,
): CommunityReaction[] {
  const counts = new Map<string, { count: number; mine: boolean }>();
  for (const row of rows) {
    const current = counts.get(row.emoji) ?? { count: 0, mine: false };
    current.count += 1;
    if (userId && row.user_id === userId) current.mine = true;
    counts.set(row.emoji, current);
  }
  return [...counts.entries()].map(([emoji, value]) => ({ emoji, ...value }));
}

export async function fetchCommunityHome(userId: string): Promise<{
  mine: CommunityGroup[];
  discover: CommunityGroup[];
}> {
  const db = client();
  if (!db) return { mine: [], discover: [] };

  await (db as unknown as AnyClient).rpc('ensure_official_builders_group');

  const { data: groups, error } = await db
    .from('community_groups')
    .select('id, name, bio, audience, cover_path, join_mode, join_criteria, created_by, created_at, tool_id, kind')
    .order('created_at', { ascending: false });
  if (error) throw error;

  const { data: members } = await db
    .from('community_group_members')
    .select('group_id, user_id, role, status, muted, last_read_at');

  const { data: countRows } = await db.rpc('community_group_counts');

  const memberRows = (members ?? []) as {
    group_id: string;
    user_id: string;
    role: MemberRole;
    status: MemberStatus;
    muted: boolean;
    last_read_at?: string | null;
  }[];

  const counts = new Map<string, number>();
  for (const row of (countRows ?? []) as { group_id: string; member_count: number }[]) {
    counts.set(row.group_id, row.member_count);
  }
  const mineByGroup = new Map<string, (typeof memberRows)[number]>();
  for (const row of memberRows) {
    if (row.user_id === userId) mineByGroup.set(row.group_id, row);
  }

  const { data: threads } = await db
    .from('community_threads')
    .select('group_id, author_id, body, created_at')
    .order('created_at', { ascending: false });

  const lastByGroup = new Map<string, { author_id: string; body: string; created_at: string }>();
  for (const thread of (threads ?? []) as {
    group_id: string;
    author_id: string;
    body: string;
    created_at: string;
  }[]) {
    if (!lastByGroup.has(thread.group_id)) lastByGroup.set(thread.group_id, thread);
  }

  const people = await loadBuilders([
    ...((groups ?? []) as { created_by?: string }[]).map((row) => row.created_by ?? ''),
    ...[...lastByGroup.values()].map((row) => row.author_id),
    ...memberRows.map((row) => row.user_id),
  ]);

  const { data: powerRows } = await db.rpc('community_groups_power');
  const powerByGroup = new Map<string, GroupPowerStats>();
  for (const row of (powerRows ?? []) as {
    group_id: string;
    revenue?: number | string;
    customers?: number | string;
    commits?: number | string;
  }[]) {
    powerByGroup.set(
      row.group_id,
      formatGroupPower({
        revenue: Number(row.revenue) || 0,
        customers: Number(row.customers) || 0,
        commits: Number(row.commits) || 0,
      }),
    );
  }

  const { data: ratingRows } = await db.from('community_group_ratings').select('group_id, user_id, stars');
  const ratingSum = new Map<string, { sum: number; count: number; mine?: number }>();
  for (const row of (ratingRows ?? []) as { group_id: string; user_id: string; stars: number }[]) {
    const current = ratingSum.get(row.group_id) ?? { sum: 0, count: 0 };
    current.sum += row.stars;
    current.count += 1;
    if (row.user_id === userId) current.mine = row.stars;
    ratingSum.set(row.group_id, current);
  }

  const pendingByGroup = new Map<string, number>();
  const stackByGroup = new Map<string, { name: string; photo?: string }[]>();
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekly = new Map<string, number>();
  const threadCounts = new Map<string, number>();
  for (const thread of (threads ?? []) as { group_id: string; created_at: string }[]) {
    threadCounts.set(thread.group_id, (threadCounts.get(thread.group_id) ?? 0) + 1);
    if (new Date(thread.created_at).getTime() >= weekAgo) {
      weekly.set(thread.group_id, (weekly.get(thread.group_id) ?? 0) + 1);
    }
  }
  for (const row of memberRows) {
    if (row.status === 'pending') {
      pendingByGroup.set(row.group_id, (pendingByGroup.get(row.group_id) ?? 0) + 1);
    }
    if (row.status !== 'active') continue;
    const person = people.get(row.user_id);
    if (!person) continue;
    const stack = stackByGroup.get(row.group_id) ?? [];
    if (stack.length < 4) stack.push({ name: person.name, photo: person.photo });
    stackByGroup.set(row.group_id, stack);
  }

  const mapped = ((groups ?? []) as Record<string, unknown>[])
    .filter((row) => !row.tool_id)
    .map((row) => {
    const membership = mineByGroup.get(row.id as string);
    const last = lastByGroup.get(row.id as string);
    const rating = ratingSum.get(row.id as string);
    const unread = !!(
      membership?.status === 'active' &&
      last &&
      (!membership.last_read_at || last.created_at > membership.last_read_at)
    );
    return mapGroup({
      ...(row as {
        id: string;
        name: string;
        bio: string;
        audience: string;
        cover_path?: string | null;
        join_mode: JoinMode;
        kind?: GroupKind;
        created_by: string;
      }),
      member_count: counts.get(row.id as string) ?? 0,
      last_preview: last?.body,
      last_author: last ? people.get(last.author_id)?.name : undefined,
      last_author_photo: last ? people.get(last.author_id)?.photo : undefined,
      last_at: last?.created_at,
      unread,
      muted: membership?.muted,
      membership: membership?.status ?? null,
      role: membership?.role,
      owner_name: people.get(row.created_by as string)?.name,
      owner_photo: people.get(row.created_by as string)?.photo,
      weekly_active: weekly.get(row.id as string) ?? 0,
      thread_count: threadCounts.get(row.id as string) ?? 0,
      criteria: ((row.join_criteria as JoinCriterion[]) ?? []).filter(Boolean),
      rating_avg: rating ? rating.sum / rating.count : undefined,
      rating_count: rating?.count,
      my_rating: rating?.mine,
      pending_count: membership?.status === 'active' ? pendingByGroup.get(row.id as string) ?? 0 : 0,
      member_stack: stackByGroup.get(row.id as string),
      power: powerByGroup.get(row.id as string),
    });
  });

  return {
    mine: mapped
      .filter((group) => group.membership)
      .sort((a, b) => Number(isOfficialGroup(b)) - Number(isOfficialGroup(a))),
    discover: mapped.filter((group) => !group.membership && !isOfficialGroup(group)),
  };
}

export function useCommunityHome() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: queryKeys.communityHome(userId),
    enabled: !!userId,
    queryFn: () => fetchCommunityHome(userId!),
  });
}

export async function createCommunityGroup(input: {
  name: string;
  bio: string;
  audience: string;
  coverPath?: string;
  joinMode: JoinMode;
  criteria?: JoinCriterion[];
}): Promise<string> {
  const db = getSupabase();
  if (!db) throw new Error('Not signed in');
  const { data, error } = await (db as unknown as AnyClient).rpc('create_community_group', {
    p_name: input.name,
    p_bio: input.bio,
    p_audience: input.audience,
    p_cover_path: input.coverPath ?? null,
    p_join_mode: input.joinMode,
    p_join_criteria: input.joinMode === 'criteria' ? (input.criteria ?? []) : [],
  });
  if (error || typeof data !== 'string') throw new Error(error?.message ?? 'Could not create the group');
  return data;
}

export async function checkCommunityJoin(groupId: string): Promise<{
  ok: boolean;
  items: { id: JoinCriterion; label: string; met: boolean; how: string }[];
}> {
  const db = client();
  if (!db) return { ok: true, items: [] };
  const { data, error } = await db.rpc('community_join_check', { p_group_id: groupId });
  if (error || !data || typeof data !== 'object') return { ok: true, items: [] };
  const payload = data as { ok?: boolean; items?: { id: JoinCriterion; label: string; met: boolean; how: string }[] };
  return { ok: !!payload.ok, items: payload.items ?? [] };
}

export async function joinCommunityGroup(
  group: CommunityGroup,
  userId: string,
  note?: string,
): Promise<MemberStatus> {
  const db = client();
  if (!db) throw new Error('Not signed in');
  let status: MemberStatus = 'active';
  if (group.joinMode === 'request') {
    status = 'pending';
  } else if (group.joinMode === 'criteria') {
    const check = await checkCommunityJoin(group.id);
    status = check.ok ? 'active' : 'pending';
  }
  const { error } = await db.from('community_group_members').insert({
    group_id: group.id,
    user_id: userId,
    role: 'member',
    status,
    request_note: note?.trim() || null,
  });
  if (error) throw new Error(error.message);
  return status;
}

export async function leaveCommunityGroup(groupId: string, userId: string): Promise<void> {
  if (groupId === OFFICIAL_GROUP_ID) throw new Error('You stay in Hey100 builders');
  const db = client();
  if (!db) return;
  const { error } = await db
    .from('community_group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function muteCommunityGroup(groupId: string, userId: string, muted: boolean): Promise<void> {
  const db = client();
  if (!db) return;
  const { error } = await db
    .from('community_group_members')
    .update({ muted })
    .eq('group_id', groupId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function reportCommunityGroup(groupId: string, userId: string, reason?: string): Promise<void> {
  const db = client();
  if (!db) return;
  const { error } = await db.from('community_reports').insert({
    group_id: groupId,
    reporter_id: userId,
    reason: reason ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function fetchGroup(groupId: string, userId: string): Promise<CommunityGroup | null> {
  const home = await fetchCommunityHome(userId);
  return [...home.mine, ...home.discover].find((group) => group.id === groupId) ?? null;
}

export function useCommunityGroup(groupId: string | null) {
  const { userId } = useAuth();
  return useQuery({
    queryKey: queryKeys.communityGroup(groupId),
    enabled: !!userId && !!groupId,
    queryFn: () => fetchGroup(groupId!, userId!),
  });
}

export async function fetchThreads(groupId: string, userId?: string): Promise<CommunityThread[]> {
  const db = client();
  if (!db) return [];

  const { data, error } = await db
    .from('community_threads')
    .select('id, group_id, author_id, body, media, created_at')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const threads = (data ?? []) as {
    id: string;
    group_id: string;
    author_id: string;
    body: string;
    media?: unknown;
    created_at: string;
  }[];

  const threadIds = threads.map((thread) => thread.id);
  const { data: replies } = threadIds.length
    ? await db.from('community_replies').select('thread_id, author_id').in('thread_id', threadIds)
    : { data: [] };
  const { data: reacts } = threadIds.length
    ? await db
        .from('community_reactions')
        .select('thread_id, user_id, emoji')
        .in('thread_id', threadIds)
    : { data: [] };

  const counts = new Map<string, number>();
  const replyAuthors = new Map<string, string[]>();
  for (const reply of (replies ?? []) as { thread_id: string; author_id: string }[]) {
    counts.set(reply.thread_id, (counts.get(reply.thread_id) ?? 0) + 1);
    const ids = replyAuthors.get(reply.thread_id) ?? [];
    if (!ids.includes(reply.author_id)) ids.push(reply.author_id);
    replyAuthors.set(reply.thread_id, ids);
  }

  const reactByThread = new Map<string, { emoji: string; user_id: string }[]>();
  for (const row of (reacts ?? []) as { thread_id: string; user_id: string; emoji: string }[]) {
    const list = reactByThread.get(row.thread_id) ?? [];
    list.push(row);
    reactByThread.set(row.thread_id, list);
  }

  const people = await loadPeople([
    ...threads.map((thread) => thread.author_id),
    ...[...replyAuthors.values()].flat(),
  ]);

  return threads.map((thread) => ({
    id: thread.id,
    groupId: thread.group_id,
    authorId: thread.author_id,
    authorName: people.get(thread.author_id)?.name ?? 'A builder',
    authorPhoto: people.get(thread.author_id)?.photo,
    authorListingId: people.get(thread.author_id)?.listingId,
    body: thread.body,
    media: mapMedia(thread.media),
    createdAt: thread.created_at,
    replyCount: counts.get(thread.id) ?? 0,
    reactions: foldReactions(reactByThread.get(thread.id) ?? [], userId),
    replyAvatars: (replyAuthors.get(thread.id) ?? [])
      .slice(0, 6)
      .map((id) => ({ name: people.get(id)?.name ?? 'A builder', photo: people.get(id)?.photo })),
  }));
}

export function useCommunityThreads(groupId: string | null) {
  const { userId } = useAuth();
  return useQuery({
    queryKey: [...queryKeys.communityGroup(groupId), 'threads', userId],
    enabled: !!groupId,
    queryFn: () => fetchThreads(groupId!, userId ?? undefined),
  });
}

export async function startThread(
  groupId: string,
  authorId: string,
  body: string,
  media: MediaItem[] = [],
): Promise<string> {
  const db = client();
  if (!db) throw new Error('Not signed in');
  const { data, error } = await db
    .from('community_threads')
    .insert({
      group_id: groupId,
      author_id: authorId,
      body: body.trim() || ' ',
      media: await mediaPayload(authorId, media),
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return (data as { id: string }).id;
}

export async function fetchThread(
  threadId: string,
  userId?: string,
): Promise<{
  thread: CommunityThread | null;
  replies: CommunityReply[];
}> {
  const db = client();
  if (!db) return { thread: null, replies: [] };

  const { data: threadRow, error } = await db
    .from('community_threads')
    .select('id, group_id, author_id, body, media, created_at')
    .eq('id', threadId)
    .maybeSingle();
  if (error) throw error;
  if (!threadRow) return { thread: null, replies: [] };

  const { data: replyRows } = await db
    .from('community_replies')
    .select('id, thread_id, author_id, body, media, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  const replies = (replyRows ?? []) as {
    id: string;
    thread_id: string;
    author_id: string;
    body: string;
    media?: unknown;
    created_at: string;
  }[];
  const thread = threadRow as {
    id: string;
    group_id: string;
    author_id: string;
    body: string;
    media?: unknown;
    created_at: string;
  };

  const replyIds = replies.map((reply) => reply.id);
  const { data: reacts } = await db
    .from('community_reactions')
    .select('thread_id, reply_id, user_id, emoji')
    .or(
      replyIds.length
        ? `thread_id.eq.${threadId},reply_id.in.(${replyIds.join(',')})`
        : `thread_id.eq.${threadId}`,
    );

  const people = await loadPeople([thread.author_id, ...replies.map((reply) => reply.author_id)]);
  const threadReacts = ((reacts ?? []) as { thread_id?: string; reply_id?: string; user_id: string; emoji: string }[])
    .filter((row) => row.thread_id === threadId)
    .map((row) => ({ emoji: row.emoji, user_id: row.user_id }));
  const replyReacts = new Map<string, { emoji: string; user_id: string }[]>();
  for (const row of (reacts ?? []) as { reply_id?: string; user_id: string; emoji: string }[]) {
    if (!row.reply_id) continue;
    const list = replyReacts.get(row.reply_id) ?? [];
    list.push({ emoji: row.emoji, user_id: row.user_id });
    replyReacts.set(row.reply_id, list);
  }

  return {
    thread: {
      id: thread.id,
      groupId: thread.group_id,
      authorId: thread.author_id,
      authorName: people.get(thread.author_id)?.name ?? 'A builder',
      authorPhoto: people.get(thread.author_id)?.photo,
      authorListingId: people.get(thread.author_id)?.listingId,
      body: thread.body,
      media: mapMedia(thread.media),
      createdAt: thread.created_at,
      replyCount: replies.length,
      reactions: foldReactions(threadReacts, userId),
      replyAvatars: replies
        .map((reply) => people.get(reply.author_id))
        .filter((person): person is { name: string; photo?: string } => !!person)
        .filter((person, index, all) => all.findIndex((other) => other.name === person.name) === index)
        .slice(0, 6)
        .map((person) => ({ name: person.name, photo: person.photo })),
    },
    replies: replies.map((reply) => ({
      id: reply.id,
      threadId: reply.thread_id,
      authorId: reply.author_id,
      authorName: people.get(reply.author_id)?.name ?? 'A builder',
      authorPhoto: people.get(reply.author_id)?.photo,
      authorListingId: people.get(reply.author_id)?.listingId,
      body: reply.body,
      media: mapMedia(reply.media),
      createdAt: reply.created_at,
      reactions: foldReactions(replyReacts.get(reply.id) ?? [], userId),
    })),
  };
}

export function useCommunityThread(threadId: string | null) {
  const { userId } = useAuth();
  return useQuery({
    queryKey: [...queryKeys.communityThread(threadId), userId],
    enabled: !!threadId,
    queryFn: () => fetchThread(threadId!, userId ?? undefined),
  });
}

export async function replyToThread(
  threadId: string,
  authorId: string,
  body: string,
  media: MediaItem[] = [],
): Promise<void> {
  const db = client();
  if (!db) throw new Error('Not signed in');
  const { error } = await db.from('community_replies').insert({
    thread_id: threadId,
    author_id: authorId,
    body: body.trim() || ' ',
    media: await mediaPayload(authorId, media),
  });
  if (error) throw new Error(error.message);
}

export async function markCommunityGroupRead(groupId: string): Promise<void> {
  const db = client();
  if (!db) return;
  await db.rpc('mark_community_group_read', { p_group_id: groupId });
}

export async function toggleCommunityReaction(input: {
  threadId?: string;
  replyId?: string;
  userId: string;
  emoji: string;
  mine: boolean;
}): Promise<void> {
  const db = client();
  if (!db) return;
  if (input.mine) {
    let query = db.from('community_reactions').delete().eq('user_id', input.userId).eq('emoji', input.emoji);
    query = input.replyId ? query.eq('reply_id', input.replyId) : query.eq('thread_id', input.threadId);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await db.from('community_reactions').insert({
    thread_id: input.replyId ? null : input.threadId,
    reply_id: input.replyId ?? null,
    user_id: input.userId,
    emoji: input.emoji,
  });
  if (error) throw new Error(error.message);
}

export async function reportCommunityMessage(input: {
  threadId?: string;
  replyId?: string;
  userId: string;
  reason: string;
}): Promise<void> {
  const db = client();
  if (!db) return;
  const { error } = await db.from('community_message_reports').insert({
    thread_id: input.replyId ? null : input.threadId,
    reply_id: input.replyId ?? null,
    reporter_id: input.userId,
    reason: input.reason,
  });
  if (error) throw new Error(error.message);
}

export function useCommunityMembers(groupId: string | null) {
  return useQuery({
    queryKey: queryKeys.communityMembers(groupId),
    enabled: !!groupId,
    queryFn: async (): Promise<CommunityMember[]> => {
      const db = getSupabase();
      if (!db || !groupId) return [];
      const { data, error } = await (db as unknown as AnyClient).rpc('community_member_directory', {
        p_group_id: groupId,
      });
      if (error) throw error;
      return ((data ?? []) as Record<string, unknown>[]).map(mapMember);
    },
  });
}

function mapMember(row: Record<string, unknown>): CommunityMember {
  const listings = Array.isArray(row.listings)
    ? (row.listings as Record<string, unknown>[]).map((item) => ({
        id: String(item.id),
        name: String(item.name ?? 'App'),
        hue: Number(item.hue ?? 128),
        icon: item.icon ? coverUrl(String(item.icon)) : undefined,
      }))
    : undefined;
  return {
    userId: String(row.user_id),
    name: String(row.name ?? 'A builder'),
    photo: (row.photo as string | null) ?? undefined,
    bio: (row.bio as string | null) ?? undefined,
    note: (row.note as string | null) ?? undefined,
    role: (row.role as MemberRole) ?? 'member',
    status: (row.status as MemberStatus) ?? 'active',
    apps: Number(row.apps ?? 0),
    commits: typeof row.commits === 'number' ? row.commits : null,
    revenue: String(row.revenue ?? '—'),
    appIds: Array.isArray(row.app_ids) ? row.app_ids.map(String) : [],
    listings,
  };
}

export function useCommunityRequests(groupId: string | null) {
  return useQuery({
    queryKey: queryKeys.communityRequests(groupId),
    enabled: !!groupId,
    queryFn: async (): Promise<CommunityMember[]> => {
      const db = getSupabase();
      if (!db || !groupId) return [];
      const { data, error } = await (db as unknown as AnyClient).rpc('community_join_requests', {
        p_group_id: groupId,
      });
      if (error) throw error;
      return ((data ?? []) as Record<string, unknown>[]).map(mapMember);
    },
  });
}

export async function reviewCommunityRequest(
  groupId: string,
  userId: string,
  accept: boolean,
): Promise<void> {
  const db = client();
  if (!db) return;
  const { error } = await db.rpc('review_community_request', {
    p_group_id: groupId,
    p_user_id: userId,
    p_accept: accept,
  });
  if (error) throw new Error(error.message);
}

export async function rateCommunityGroup(groupId: string, userId: string, stars: number): Promise<void> {
  if (groupId === OFFICIAL_GROUP_ID) return;
  const db = client();
  if (!db) return;
  const { error } = await db.from('community_group_ratings').upsert({
    group_id: groupId,
    user_id: userId,
    stars,
  });
  if (error) throw new Error(error.message);
}

export async function uploadGroupCover(userId: string, uri: string): Promise<string | null> {
  const { uploadAsset } = await import('@/features/apps/uploadShots');
  return uploadAsset(userId, uri, 'image', 'group-cover');
}

type Person = { name: string; photo?: string; listingId?: string };

async function loadBuilders(ids: string[]): Promise<Map<string, Person>> {
  return loadPeople(ids);
}

async function loadPeople(ids: string[]): Promise<Map<string, Person>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, Person>();
  if (!unique.length) return map;

  const db = getSupabase();
  if (!db) return map;

  const { data } = await db
    .from('builders')
    .select('id, real_name, username, photo_url')
    .in('id', unique);

  for (const row of data ?? []) {
    map.set(row.id ?? '', {
      name: row.real_name || row.username || 'A builder',
      photo: row.photo_url ?? undefined,
    });
  }

  const { data: apps } = await db.from('apps').select('id, owner_id').in('owner_id', unique);

  for (const row of apps ?? []) {
    const person = map.get(row.owner_id ?? '');
    if (person && !person.listingId) person.listingId = row.id;
  }

  return map;
}
