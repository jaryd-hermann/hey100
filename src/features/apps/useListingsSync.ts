import { useEffect, useRef } from 'react';

import { useMyListings } from '@/data/repo/listings';
import { usePromptLabel } from '@/data/repo/prompts';
import { useStore } from '@/store/AppStore';

import { toOwnedApp } from './mapListing';

/**
 * Replaces the bundled sample apps with the user's real listings, so the Apps
 * tab, the owner preview and attribution all read from the server while every
 * screen keeps calling `useStore()`.
 *
 * An empty result is left alone on purpose: a signed-in user part-way through
 * onboarding has no listing yet, and blanking the store would leave screens
 * that assume a primary app with nothing to render.
 */
export function useListingsSync(): void {
  const { data } = useMyListings();
  const promptLabel = usePromptLabel();
  const store = useStore();

  // The store is rebuilt on every state change, so depending on it here would
  // re-run this effect forever.
  const storeRef = useRef(store);
  storeRef.current = store;

  useEffect(() => {
    if (!data?.length) return;

    const builder = storeRef.current.user.realName;
    storeRef.current.replaceApps(data.map((row) => toOwnedApp(row, { builder, promptLabel })));
  }, [data, promptLabel]);
}
