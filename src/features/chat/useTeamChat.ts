import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import {
  broadcastsToMessages,
  dmsToMessages,
  fetchBroadcastsWithReactions,
  fetchMyDmsWithReactions,
} from '@/data/repo/admin';
import { useAuth } from '@/features/auth/AuthProvider';
import { TEAM_ID } from '@/features/chat/chatMeta';
import { useStore } from '@/store/AppStore';

/**
 * Fills the Hey100 team thread from broadcasts plus this user's DMs with the
 * team, so a reply is a private line to the admin rather than a group chat.
 */
export function useTeamChat(): void {
  const { userId } = useAuth();
  const store = useStore();

  const { data } = useQuery({
    queryKey: ['team-chat', userId],
    enabled: !!userId,
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async () => {
      const [broadcasts, dms] = await Promise.all([
        fetchBroadcastsWithReactions(),
        fetchMyDmsWithReactions(),
      ]);
      const rows = [
        ...broadcastsToMessages(broadcasts, userId, false).map((message, index) => ({
          at: broadcasts[index].created_at,
          message,
        })),
        ...dmsToMessages(dms, userId).map((message, index) => ({
          at: dms[index].created_at,
          message,
        })),
      ];
      rows.sort((a, b) => a.at.localeCompare(b.at));
      return rows.map((row) => row.message);
    },
  });

  useEffect(() => {
    if (data) store.setMessages(TEAM_ID, data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);
}
