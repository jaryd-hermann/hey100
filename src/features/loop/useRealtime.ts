import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import {
  broadcastsToMessages,
  dmsToMessages,
  type AdminDm,
  type Broadcast,
} from '@/data/repo/admin';
import { queryKeys } from '@/data/repo/keys';
import type { Message } from '@/data/types';
import { useAuth } from '@/features/auth/AuthProvider';
import { TEAM_ID } from '@/features/chat/chatMeta';
import { getSupabase } from '@/lib/supabase';
import { useStore } from '@/store/AppStore';

/**
 * Chat cannot wait for a pull-to-refresh. Match threads, team broadcasts and
 * admin DMs land over Realtime and are written into the store immediately.
 *
 * There is no per-user filter on the subscription because row level security
 * applies to the stream as well: a change to a row the user cannot read is
 * never delivered.
 */
export function useLoopRealtime(): void {
  const { userId, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const store = useStore();
  const storeRef = useRef(store);
  storeRef.current = store;

  useEffect(() => {
    const db = getSupabase();
    if (!db || !userId) return;

    const invalidate = (keys: readonly (readonly unknown[])[]) => {
      for (const queryKey of keys) queryClient.invalidateQueries({ queryKey: [...queryKey] });
    };

    const appendTeam = (message: Message) => {
      if (!message.id) return;
      const current = storeRef.current.messages[TEAM_ID] ?? [];
      if (current.some((item) => item.id === message.id)) return;
      storeRef.current.setMessages(TEAM_ID, [...current, message]);
    };

    const channel = db
      .channel('loop')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const matchId = (payload.new as { match_id?: string }).match_id;
          invalidate([queryKeys.threads(userId), queryKeys.messages(matchId ?? null)]);
        },
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () =>
        invalidate([queryKeys.threads(userId), queryKeys.counters(userId)]),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'heys' }, () =>
        invalidate([queryKeys.heys(userId), queryKeys.counters(userId)]),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_broadcasts' },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            const [message] = broadcastsToMessages([payload.new as Broadcast], userId, false);
            if (message) appendTeam(message);
          }
          invalidate([['broadcasts'], ['team-chat', userId]]);
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_dms' },
        (payload) => {
          const row = payload.new as AdminDm | undefined;
          if (payload.eventType === 'INSERT' && row?.user_id === userId) {
            const [message] = dmsToMessages([row], userId, false);
            if (message) appendTeam(message);
          }
          invalidate([
            ['team-chat', userId],
            ['admin-threads'],
            ...(row?.user_id ? [['admin-dm', row.user_id] as const] : []),
            ...(isAdmin ? [['broadcasts'] as const] : []),
          ]);
        },
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_reactions' }, (payload) => {
        const row = (payload.new ?? payload.old) as {
          message_id?: string | null;
          dm_id?: string | null;
          broadcast_id?: string | null;
        };
        invalidate([
          ['team-chat', userId],
          ['broadcasts'],
          ['admin-threads'],
          ...(row.message_id ? [queryKeys.messages(null)] : []),
        ]);
        if (row.message_id) {
          queryClient.invalidateQueries({ queryKey: ['messages'] });
        }
        if (row.dm_id) {
          queryClient.invalidateQueries({ queryKey: ['admin-dm'] });
        }
      })
      .subscribe();

    return () => {
      db.removeChannel(channel);
    };
  }, [isAdmin, queryClient, userId]);
}
