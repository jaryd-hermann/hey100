import { useMemo } from 'react';

import { useCommunityHome } from '@/data/repo/community';
import type { OwnedApp } from '@/data/types';
import { useAuth } from '@/features/auth/AuthProvider';
import { useStore } from '@/store/AppStore';

export const VERIFIED_KARMA = 100;

export const FEEDBACK_FIELD_POINTS = 2;

/** Soft peach used on karma chips and the feedback earn line. */
export const KARMA_PEACH = '#F4C9B0';
export const KARMA_PEACH_TEXT = '#C45C2A';

export type FeedbackKarmaInput = {
  impression: number;
  sentence: string;
  keep: string | null;
  keepWhy: string;
  confusion: string;
  bestMoment: string;
  bug: string;
  screenshots: number;
  video: boolean;
  price: string;
};

export function feedbackKarmaEarned(input: FeedbackKarmaInput): number {
  const filled = [
    input.impression > 0 && !!input.sentence.trim(),
    !!input.keep,
    !!input.confusion.trim(),
    !!input.bestMoment.trim(),
    !!input.bug.trim() || input.screenshots > 0 || input.video,
    !!input.price.trim(),
  ].filter(Boolean).length;
  return filled * FEEDBACK_FIELD_POINTS;
}

export type KarmaInput = {
  user: { githubCommits?: number };
  matches: number;
  replies: number;
  feedbackGiven: number;
  groupCount: number;
  posts: number;
  listings: OwnedApp[];
};

export function computeKarma(input: KarmaInput): number {
  const listingScore = input.listings.reduce((sum, app) => {
    const media = (app.media?.length ?? 0) >= 3 ? 8 : 0;
    const pitch = app.pitchUri ? 10 : 0;
    const asked = app.asked ? 4 : 0;
    const audiences = Math.min(app.ideal.interests.split(',').filter(Boolean).length, 2) * 3;
    return sum + media + pitch + asked + audiences;
  }, 0);

  const verifiedBoost = input.user.githubCommits && input.user.githubCommits >= 20 ? 20 : 0;

  return (
    input.matches * 8 +
    input.replies * 2 +
    input.feedbackGiven * 12 +
    input.groupCount * 5 +
    input.posts * 3 +
    listingScore +
    verifiedBoost
  );
}

export function karmaUnlocked(karma: number): boolean {
  return karma >= VERIFIED_KARMA;
}

export function isVerified(karma: number, admin?: boolean): boolean {
  return !!admin || karmaUnlocked(karma);
}

export function useMyKarma() {
  const store = useStore();
  const { isAdmin } = useAuth();
  const { data } = useCommunityHome();
  const replies = Object.values(store.messages).reduce(
    (sum, thread) => sum + thread.filter((message) => message.kind === 'me').length,
    0,
  );
  const feedbackGiven = Object.values(store.messages).reduce(
    (sum, thread) =>
      sum + thread.filter((message) => message.kind === 'feedback' && message.from === 'me').length,
    0,
  );
  const karma = useMemo(
    () =>
      computeKarma({
        user: store.user,
        matches: store.matches.length,
        replies,
        feedbackGiven: Math.max(feedbackGiven, store.user.feedbackGiven),
        groupCount: data?.mine.filter((group) => group.membership === 'active').length ?? 0,
        posts: 0,
        listings: store.ownedApps,
      }),
    [data?.mine, feedbackGiven, replies, store.matches.length, store.ownedApps, store.user],
  );

  return { karma, verified: isVerified(karma, isAdmin) };
}
