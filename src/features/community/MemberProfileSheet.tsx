import { useRouter } from 'expo-router';
import React from 'react';

import { Sheet } from '@/components/ui/Sheet';
import { LISTINGS, MATCH_APPS } from '@/data/mock';
import type { AppListing, OwnedApp } from '@/data/types';
import type { CommunityMember } from '@/data/repo/community';
import { BuilderSheet } from '@/features/app-page/BuilderSheet';
import { useAuth } from '@/features/auth/AuthProvider';
import { useStore } from '@/store/AppStore';

const LISTING_FALLBACK = {
  cat: '',
  plat: '',
  stage: '',
  role: 'Builder',
  style: '',
  likes: '—',
  reply: '—',
  trades: 0,
  media: [],
  shotLayout: 'vertical' as const,
  prompts: [],
  badges: [],
  links: [],
  ideal: { age: '', gender: '', interests: '', plat: '', wants: '' },
};

function asListing(raw: AppListing | OwnedApp): AppListing {
  return { ...LISTING_FALLBACK, ...raw, style: raw.style || raw.sub || '' };
}

function listingForMember(
  member: CommunityMember,
  store: ReturnType<typeof useStore>,
  userId?: string | null,
): AppListing | OwnedApp | null {
  const mine =
    member.name === 'You' ||
    (!!userId && member.userId === userId) ||
    member.name === store.displayName ||
    member.name === store.user.realName ||
    (!!store.user.username && member.name === `@${store.user.username}`);

  if (mine) return store.primaryApp ?? store.ownedApps[0] ?? null;

  for (const id of [...member.appIds, ...(member.listings ?? []).map((app) => app.id)]) {
    const found = store.listing(id);
    if (found) return asListing(found);
  }

  const byName = [
    ...Object.values(store.listings),
    ...Object.values(LISTINGS),
    ...Object.values(MATCH_APPS),
  ].find((row) => row.builder === member.name);
  if (byName) return asListing(byName as AppListing);

  return {
    ...LISTING_FALLBACK,
    id: member.appIds[0] ?? member.userId,
    name: member.name,
    sub: member.bio ?? '',
    hue: 128,
    builder: member.name,
    builderPhoto: member.photo,
    role: member.bio ?? 'Builder',
    style: member.bio ?? '',
    githubCommits: member.commits ?? undefined,
  };
}

export function MemberProfileSheet({
  member,
  onClose,
}: {
  member: CommunityMember | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const store = useStore();
  const { userId } = useAuth();
  if (!member) return <Sheet visible={false} onClose={onClose} children={null} />;

  const listing = listingForMember(member, store, userId);

  return (
    <BuilderSheet
      visible
      listing={listing}
      onClose={onClose}
      onOpenLink={(kind, value) => {
        onClose();
        router.push({ pathname: '/browser', params: { kind, value } });
      }}
    />
  );
}
