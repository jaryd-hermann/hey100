/**
 * Query keys and the staleness each family of data can tolerate.
 *
 * Keeping both here rather than on the call sites means a family's caching
 * policy is one decision in one place: reference data can sit for a day, the
 * Discover deck has to be fresh, and chat is driven by Realtime instead.
 */
export const queryKeys = {
  prompts: ['prompts'] as const,
  myListings: (userId: string | null) => ['listings', 'mine', userId] as const,
  deck: (userId: string | null) => ['deck', userId] as const,
  heys: (userId: string | null) => ['heys', userId] as const,
  threads: (userId: string | null) => ['threads', userId] as const,
  messages: (matchId: string | null) => ['messages', matchId] as const,
  feedback: (userId: string | null) => ['feedback', userId] as const,
  counters: (userId: string | null) => ['counters', userId] as const,
  sponsoredTools: ['sponsored-tools'] as const,
};

export const staleTimes = {
  /** Reference data. Only a migration changes it. */
  prompts: 24 * 60 * 60 * 1000,
  /** The owner's own listings, which only they can change. */
  myListings: 5 * 60 * 1000,
  /** The deck is refetched on focus; a stale card can have been heyed already. */
  deck: 60 * 1000,
  heys: 30 * 1000,
  threads: 30 * 1000,
  /** Chat is driven by Realtime, so the cache only covers the first paint. */
  messages: 5 * 60 * 1000,
  feedback: 60 * 1000,
  counters: 30 * 1000,
};
