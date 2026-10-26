import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { dmsToMessages, fetchMyDmsWithReactions } from '@/data/repo/admin';
import { useAuth } from '@/features/auth/AuthProvider';
import { TEAM_ID } from '@/features/chat/chatMeta';
import { useStore } from '@/store/AppStore';

/**
 * Fills the 1:1 with Jaryd from this user's admin DMs. Team posts live in
 * the official Hey100 builders group, not here.
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
      const dms = await fetchMyDmsWithReactions();
      return dmsToMessages(dms, userId);
    },
  });

  useEffect(() => {
    if (data) store.setMessages(TEAM_ID, data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);
}
