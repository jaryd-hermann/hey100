import type { MediaItem, Message, MessageReply } from '@/data/types';
import { mediaFromJson } from '@/features/loop/mapLoop';
import { groupReactions, type ReactionRow } from '@/features/chat/reactions';
import type { Attachment } from '@/features/chat/uploadAttachments';
import { getSupabase, publicUrl } from '@/lib/supabase';

export const ADMIN_EMAIL = 'hermannjaryd@gmail.com';

export type Broadcast = {
  id: string;
  body: string;
  created_at: string;
  media: unknown;
  reply_to: string | null;
};

export type AdminDm = {
  id: string;
  user_id: string;
  from_admin: boolean;
  body: string;
  created_at: string;
  media: unknown;
  reply_to: string | null;
};

type ReactionEmbed = { chat_reactions?: ReactionRow[] | null };

function ago(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
}

function replyOf(
  id: string | null,
  rows: { id: string; body: string | null }[],
): MessageReply | undefined {
  if (!id) return undefined;
  const found = rows.find((row) => row.id === id);
  if (!found) return undefined;
  return { id: found.id, body: found.body?.trim() || 'Attachment' };
}

export async function fetchBroadcasts(): Promise<Broadcast[]> {
  const db = getSupabase();
  if (!db) return [];
  const { data, error } = await db
    .from('team_broadcasts')
    .select('id, body, created_at, media, reply_to')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Broadcast[];
}

export async function sendBroadcast(
  body: string,
  media: Attachment[] = [],
  replyTo?: string,
): Promise<void> {
  const db = getSupabase();
  if (!db) return;
  const { error } = await db.from('team_broadcasts').insert({
    body: body || '',
    media,
    reply_to: replyTo ?? null,
  });
  if (error) throw error;
}

export async function fetchMyDms(): Promise<AdminDm[]> {
  const db = getSupabase();
  if (!db) return [];
  const { data, error } = await db
    .from('admin_dms')
    .select('id, user_id, from_admin, body, created_at, media, reply_to')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as AdminDm[];
}

export async function fetchDmsFor(userId: string): Promise<AdminDm[]> {
  const db = getSupabase();
  if (!db) return [];
  const { data, error } = await db
    .from('admin_dms')
    .select('id, user_id, from_admin, body, created_at, media, reply_to')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as AdminDm[];
}

export async function sendAdminDm(
  userId: string,
  body: string,
  fromAdmin: boolean,
  media: Attachment[] = [],
  replyTo?: string,
): Promise<void> {
  const db = getSupabase();
  if (!db) return;
  const { error } = await db.from('admin_dms').insert({
    user_id: userId,
    from_admin: fromAdmin,
    body: body || '',
    media,
    reply_to: replyTo ?? null,
  });
  if (error) throw error;
}

export type AdminThread = {
  userId: string;
  name: string;
  photo?: string;
  last: string;
  at: string;
};

export async function fetchAdminThreads(): Promise<AdminThread[]> {
  const db = getSupabase();
  if (!db) return [];

  const { data, error } = await db
    .from('admin_dms')
    .select('user_id, body, created_at, media')
    .order('created_at', { ascending: false });
  if (error) throw error;

  const seen = new Map<string, { last: string; at: string }>();
  for (const row of data ?? []) {
    if (seen.has(row.user_id)) continue;
    const media = Array.isArray(row.media) ? row.media.length : 0;
    seen.set(row.user_id, {
      last: row.body?.trim() || (media ? 'Attachment' : ''),
      at: row.created_at,
    });
  }

  const ids = [...seen.keys()];
  if (!ids.length) return [];

  const { data: people } = await db.from('builders').select('id, username, real_name, photo_url').in('id', ids);
  const byId = new Map((people ?? []).map((row) => [row.id, row]));

  return ids.map((userId) => {
    const person = byId.get(userId);
    const preview = seen.get(userId)!;
    return {
      userId,
      name: person?.real_name || (person?.username ? `@${person.username}` : 'A builder'),
      photo: person?.photo_url ?? undefined,
      last: preview.last,
      at: preview.at,
    };
  });
}

export type BuilderPreview = {
  userId: string;
  name: string;
  photo?: string;
  username?: string;
  job?: string;
  bio?: string;
  apps: { id: string; name: string; slug?: string; hue: number; icon?: string; sub: string }[];
};

export async function fetchBuilderPreview(userId: string): Promise<BuilderPreview | null> {
  const db = getSupabase();
  if (!db) return null;

  const [{ data: person }, { data: apps }] = await Promise.all([
    db.from('builders').select('id, username, real_name, photo_url, job, own_words').eq('id', userId).maybeSingle(),
    db.from('apps').select('id, name, slug, hue, icon_path, subtitle').eq('owner_id', userId),
  ]);

  if (!person) return null;
  const words = (person.own_words ?? {}) as Record<string, string>;

  return {
    userId,
    name: person.real_name || (person.username ? `@${person.username}` : 'A builder'),
    photo: person.photo_url ?? undefined,
    username: person.username ?? undefined,
    job: person.job ?? undefined,
    bio: typeof words.bio === 'string' ? words.bio : undefined,
    apps: (apps ?? []).map((app) => ({
      id: app.id,
      name: app.name,
      slug: app.slug ?? undefined,
      hue: app.hue,
      icon: app.icon_path ? publicUrl('listing-media', app.icon_path) : undefined,
      sub: app.subtitle ?? '',
    })),
  };
}

export function broadcastsToMessages(
  rows: (Broadcast & ReactionEmbed)[],
  me: string | null,
  asMine: boolean,
): Message[] {
  return rows.map((row) => {
    const media = mediaFromJson(row.media);
    const reply = replyOf(row.reply_to, rows);
    const reactions = groupReactions(row.chat_reactions, me);
    return asMine
      ? {
          kind: 'me' as const,
          id: row.id,
          ...(row.body ? { body: row.body } : {}),
          ...(media.length ? { media } : {}),
          ...(reply ? { reply } : {}),
          ...(reactions.length ? { reactions } : {}),
        }
      : {
          kind: 'announcement' as const,
          id: row.id,
          body: row.body || (media.length ? 'Attachment' : ''),
          when: ago(row.created_at),
          ...(media.length ? { media } : {}),
          ...(reply ? { reply } : {}),
          ...(reactions.length ? { reactions } : {}),
        };
  });
}

export function dmsToMessages(
  rows: (AdminDm & ReactionEmbed)[],
  me: string | null,
  adminView = false,
): Message[] {
  return rows.map((row) => {
    const media = mediaFromJson(row.media);
    const reply = replyOf(row.reply_to, rows);
    const reactions = groupReactions(row.chat_reactions, me);
    const mine = adminView ? row.from_admin : !row.from_admin;
    return {
      kind: (mine ? 'me' : 'them') as 'them' | 'me',
      id: row.id,
      ...(row.body ? { body: row.body } : {}),
      ...(media.length ? { media } : {}),
      ...(reply ? { reply } : {}),
      ...(reactions.length ? { reactions } : {}),
    };
  });
}

export async function fetchBroadcastsWithReactions(): Promise<(Broadcast & ReactionEmbed)[]> {
  const db = getSupabase();
  if (!db) return [];
  const { data, error } = await db
    .from('team_broadcasts')
    .select('id, body, created_at, media, reply_to, chat_reactions!broadcast_id(emoji, user_id)')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as (Broadcast & ReactionEmbed)[];
}

export async function fetchDmsForWithReactions(userId: string): Promise<(AdminDm & ReactionEmbed)[]> {
  const db = getSupabase();
  if (!db) return [];
  const { data, error } = await db
    .from('admin_dms')
    .select('id, user_id, from_admin, body, created_at, media, reply_to, chat_reactions!dm_id(emoji, user_id)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as (AdminDm & ReactionEmbed)[];
}

export async function fetchMyDmsWithReactions(): Promise<(AdminDm & ReactionEmbed)[]> {
  const db = getSupabase();
  if (!db) return [];
  const { data, error } = await db
    .from('admin_dms')
    .select('id, user_id, from_admin, body, created_at, media, reply_to, chat_reactions!dm_id(emoji, user_id)')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as (AdminDm & ReactionEmbed)[];
}
