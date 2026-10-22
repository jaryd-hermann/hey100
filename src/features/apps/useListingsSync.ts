import { useEffect, useRef } from 'react';

import { listConnections } from '@/data/repo/connections';
import { updateListing, useMyListings } from '@/data/repo/listings';
import { fetchAppMetadata } from '@/data/repo/metadata';
import { usePromptLabel } from '@/data/repo/prompts';
import { connectionsFromBadges } from '@/features/apps/connect/fromBadges';
import { builderFromUser } from '@/features/profile/builderCard';
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

    const card = builderFromUser(storeRef.current.user);
    storeRef.current.replaceApps(
      data.map((row) =>
        toOwnedApp(row, {
          ...card,
          promptLabel,
        }),
      ),
    );

    data.forEach((row) => {
      storeRef.current.hydrateConnections(row.id, connectionsFromBadges(row.badges));
    });

    void Promise.all(data.map((row) => listConnections(row.id)))
      .then((rows) => {
        rows.forEach((connections, index) => {
          storeRef.current.hydrateConnections(data[index].id, connections);
        });
      })
      .catch(() => {});

    void Promise.all(
      data.map(async (row) => {
        const links = (row.links ?? {}) as Record<string, string>;
        const storeUrl = row.store_url || links.appstore;
        if (!storeUrl || row.store_rating != null) return;
        const meta = await fetchAppMetadata(storeUrl);
        if (meta.rating == null) return;
        storeRef.current.updateApp(row.id, {
          storeUrl,
          storeRating: meta.rating,
          storeRatingCount: meta.ratingCount,
        });
        await updateListing(row.id, {
          store_url: storeUrl,
          store_rating: meta.rating,
          store_rating_count: meta.ratingCount ?? null,
        });
      }),
    ).catch(() => {});
  }, [
    data,
    promptLabel,
    store.user.bio,
    store.user.department,
    store.user.job,
    store.user.photo,
    store.user.realName,
    store.user.showAs,
    store.user.tags,
    store.user.username,
    store.user.workplace,
    store.user.socials,
    store.user.githubCommits,
  ]);
}
