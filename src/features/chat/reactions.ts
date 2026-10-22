import { getSupabase } from '@/lib/supabase';

import type { MessageReaction } from '@/data/types';

export const QUICK_REACT = ['👍', '❤️', '😂', '😮', '😢', '🙏'] as const;

export type ReactionRow = { emoji: string; user_id: string };

export function groupReactions(rows: ReactionRow[] | null | undefined, me: string | null): MessageReaction[] {
  const counts = new Map<string, { count: number; mine: boolean }>();
  for (const row of rows ?? []) {
    const current = counts.get(row.emoji) ?? { count: 0, mine: false };
    current.count += 1;
    if (row.user_id === me) current.mine = true;
    counts.set(row.emoji, current);
  }
  return [...counts.entries()].map(([emoji, value]) => ({ emoji, ...value }));
}

export type ReactionTarget =
  | { messageId: string }
  | { dmId: string }
  | { broadcastId: string };

export async function toggleReaction(target: ReactionTarget, emoji: string, userId: string): Promise<void> {
  const db = getSupabase();
  if (!db) return;

  const match =
    'messageId' in target
      ? { message_id: target.messageId, user_id: userId, emoji }
      : 'dmId' in target
        ? { dm_id: target.dmId, user_id: userId, emoji }
        : { broadcast_id: target.broadcastId, user_id: userId, emoji };

  const { data } = await db.from('chat_reactions').select('id').match(match).maybeSingle();
  if (data?.id) {
    const { error } = await db.from('chat_reactions').delete().eq('id', data.id);
    if (error) throw error;
    return;
  }

  const { error } = await db.from('chat_reactions').insert(match as { emoji: string; user_id: string });
  if (error) throw error;
}
