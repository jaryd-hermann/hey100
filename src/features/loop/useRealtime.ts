import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { queryKeys } from '@/data/repo/keys';
import { useAuth } from '@/features/auth/AuthProvider';
import { getSupabase } from '@/lib/supabase';

/**
 * Chat is the one surface that cannot wait for a refetch, so messages, matches
 * and heys arrive over Realtime and invalidate what they touch.
 *
 * There is no per-user filter on the subscription because row level security
 * applies to the stream as well: a change to a row the user cannot read is
 * never delivered.
 */
export function useLoopRealtime(): void {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    const db = getSupabase();
    if (!db || !userId) return;

    const invalidate = (keys: readonly (readonly unknown[])[]) => {
      for (const queryKey of keys) queryClient.invalidateQueries({ queryKey: [...queryKey] });
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
      .subscribe();

    return () => {
      db.removeChannel(channel);
    };
  }, [queryClient, userId]);
}
