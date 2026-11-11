import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

import type { Message } from '@/data/types';

const listeners = new Set<() => void>();
const readAtByUser = new Map<string, string | null>();
const loading = new Set<string>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readAtFor(userId: string | null): string | null {
  if (!userId || !readAtByUser.has(userId)) return null;
  return readAtByUser.get(userId) ?? null;
}

/** When this user last opened the 1:1 with Jaryd. Null until they open it. */
export function useTeamReadAt(userId: string | null): string | null {
  const readAt = useSyncExternalStore(
    subscribe,
    () => readAtFor(userId),
    () => null,
  );

  useEffect(() => {
    if (!userId || readAtByUser.has(userId) || loading.has(userId)) return;
    loading.add(userId);
    AsyncStorage.getItem(`hey100.team-read.${userId}`)
      .then((value) => {
        if (!readAtByUser.has(userId)) readAtByUser.set(userId, value);
      })
      .catch(() => {
        if (!readAtByUser.has(userId)) readAtByUser.set(userId, null);
      })
      .finally(() => {
        loading.delete(userId);
        emit();
      });
  }, [userId]);

  return readAt;
}

/** Remember the newest message the user has seen in Jaryd's thread. */
export function markTeamRead(userId: string | null, at: string) {
  if (!userId || !at) return;
  const current = readAtByUser.get(userId);
  if (current && current >= at) return;
  readAtByUser.set(userId, at);
  emit();
  AsyncStorage.setItem(`hey100.team-read.${userId}`, at).catch(() => {});
}

/**
 * Admin messages still waiting. A reply from the user counts as reading
 * everything before it, so a welcome DM they already answered stays quiet.
 */
export function teamUnreadCount(messages: Message[], readAt: string | null): number {
  let floor = readAt ?? '';
  for (const message of messages) {
    if (message.kind === 'me' && message.at && message.at > floor) floor = message.at;
  }
  return messages.filter((message) => message.kind === 'them' && !!message.at && message.at > floor)
    .length;
}
