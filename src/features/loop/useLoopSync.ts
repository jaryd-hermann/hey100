import { useEffect, useMemo, useRef } from 'react';

import {
  useCounters,
  useDeck,
  useFeedbackInbox,
  useHeys,
  useThreads,
  type ListingCard,
} from '@/data/repo/loop';
import type { AppListing } from '@/data/types';
import { useStore } from '@/store/AppStore';

import {
  cardToListing,
  countersToStore,
  feedbackToInbox,
  heyToIncoming,
  heyToSent,
  threadToMatch,
} from './mapLoop';

/**
 * Pulls the whole loop into the store: the deck, both sides of the Heys queue,
 * the chat list and the feedback inbox.
 *
 * Every screen keeps reading `useStore()`, which is what lets the app still
 * run on the bundled sample data when there is no session. The queries are
 * disabled without one, so this hook does nothing then.
 */
export function useLoopSync(): void {
  const deck = useDeck();
  const heys = useHeys();
  const threads = useThreads();
  const inbox = useFeedbackInbox();
  const counters = useCounters();
  const store = useStore();

  // The store is rebuilt on every state change, so it cannot be a dependency.
  const storeRef = useRef(store);
  storeRef.current = store;

  const data = useMemo(() => {
    // Nothing has arrived yet, so the sample data stays.
    if (!deck.data && !heys.data && !threads.data) return null;

    const listings: Record<string, AppListing> = {};
    const remember = (card: ListingCard | null, preferRealName = false) => {
      if (!card?.app) return;
      listings[card.app.id] = cardToListing(card, preferRealName);
    };

    for (const card of deck.data ?? []) remember(card);
    for (const hey of heys.data?.received ?? []) remember(hey.card);
    for (const hey of heys.data?.sent ?? []) remember(hey.card);
    for (const hey of heys.data?.matched ?? []) remember(hey.card);

    // A match is what makes a real name readable, so those cards are built
    // with it; the same listing in the deck keeps the handle.
    for (const thread of threads.data ?? []) remember(thread.their_app, true);

    return {
      listings,
      deckIds: (deck.data ?? []).map((card) => card.app.id),
      heys: (heys.data?.received ?? []).map(heyToIncoming),
      sentHeys: (heys.data?.sent ?? []).map(heyToSent),
      matchedHeys: (heys.data?.matched ?? []).map(heyToIncoming),
      matches: (threads.data ?? []).filter((thread) => !thread.hidden).map(threadToMatch),
      inbox: inbox.data
        ? feedbackToInbox(
            inbox.data,
            (appId) => storeRef.current.apps[appId]?.name ?? 'your app',
            (appId) => storeRef.current.apps[appId]?.hue ?? 220,
          )
        : {},
      ...(countersToStore(counters.data ?? null) ?? {}),
    };
  }, [counters.data, deck.data, heys.data, inbox.data, threads.data]);

  useEffect(() => {
    if (data) storeRef.current.hydrateLoop(data);
  }, [data]);
}
