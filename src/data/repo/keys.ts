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
};

export const staleTimes = {
  /** Reference data. Only a migration changes it. */
  prompts: 24 * 60 * 60 * 1000,
  /** The owner's own listings, which only they can change. */
  myListings: 5 * 60 * 1000,
};
