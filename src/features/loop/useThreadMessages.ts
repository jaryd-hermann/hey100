import { useEffect, useMemo, useRef } from 'react';

import { useMessages } from '@/data/repo/loop';
import { useAuth } from '@/features/auth/AuthProvider';
import { useStore } from '@/store/AppStore';

import { messageToMessage } from './mapLoop';

/**
 * Loads one thread's messages into the store, so the thread screen keeps
 * reading `store.messages[id]` whether they came from the server or the
 * bundled sample conversation.
 */
export function useThreadMessages(matchId: string | null): void {
  const { userId } = useAuth();
  const { data } = useMessages(matchId);
  const store = useStore();

  const storeRef = useRef(store);
  storeRef.current = store;

  const messages = useMemo(
    () => (data && userId ? data.map((row) => messageToMessage(row, userId)) : null),
    [data, userId],
  );

  useEffect(() => {
    if (messages && matchId) storeRef.current.setMessages(matchId, messages);
  }, [matchId, messages]);
}
