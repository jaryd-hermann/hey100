import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { queryKeys } from '@/data/repo/keys';
import * as loop from '@/data/repo/loop';
import { connectionsFromBadges } from '@/features/apps/connect/fromBadges';
import { useAuth } from '@/features/auth/AuthProvider';
import { uploadAttachments } from '@/features/chat/uploadAttachments';
import { ONBOARDED_KEY } from '@/lib/authStorage';
import { getSupabase } from '@/lib/supabase';

import {
  DEFAULT_LAYOUT,
  INBOX,
  INCOMING_HEYS,
  INITIAL_MATCHES,
  INITIAL_MESSAGES,
  LISTINGS,
  MATCH_APPS,
  OWNED_APPS,
  SENT_HEYS,
  shortName,
} from '@/data/mock';
import type {
  AppListing,
  HeyTargetType,
  IncomingHey,
  InboxData,
  AppConnection,
  IntegrationKey,
  Match,
  MediaItem,
  Message,
  OwnedApp,
  SectionKey,
  SentHey,
  TradeStatus,
} from '@/data/types';

export const FREE_MATCH_LIMIT = 3;
export const FREE_DAILY_HEYS = 8;
/** One Pro plan: a month, no season pass. */
export const PRO_PRICE = '$18';
export const PRO_PRICE_NOTE = 'a month';

/** A follow-up on a sent hey only unlocks a day after the original. */
export const FOLLOW_UP_DELAY_MS = 24 * 60 * 60 * 1000;

/** The chat list needs a line to show when a message is attachments only. */
function attachmentPreview(media: MediaItem[]): string {
  if (media.length > 1) return `sent ${media.length} attachments`;
  return media[0]?.video ? 'sent a video' : 'sent a photo';
}

const STOCK_LAYOUTS = new Set([
  'pitch,shots,problem,p0,builder,p1,looking,p2,p3,p4,stats,pricing,verified',
  'shots,problem,p0,pitch,builder,p1,looking,p2,p3,p4,stats,pricing,verified',
  'shots,problem,p0,builder,p1,looking,p2,p3,p4,stats,pricing,verified',
  'shots,problem,pricing,p0,builder,p1,looking,p2,p3,p4,stats,verified',
  'shots,problem,pricing,p0,pitch,builder,p1,looking,p2,p3,p4,stats,verified',
  'shots,problem,pricing,builder,looking,stats,verified',
]);

function insertMissingAtDefault(saved: SectionKey[]): SectionKey[] {
  const ordered = [...saved];
  for (const key of DEFAULT_LAYOUT) {
    if (ordered.includes(key)) continue;
    const defaultIndex = DEFAULT_LAYOUT.indexOf(key);
    let insertAt = ordered.length;
    for (let i = defaultIndex - 1; i >= 0; i -= 1) {
      const at = ordered.indexOf(DEFAULT_LAYOUT[i]);
      if (at !== -1) {
        insertAt = at + 1;
        break;
      }
    }
    if (insertAt === ordered.length) {
      for (let i = defaultIndex + 1; i < DEFAULT_LAYOUT.length; i += 1) {
        const at = ordered.indexOf(DEFAULT_LAYOUT[i]);
        if (at !== -1) {
          insertAt = at;
          break;
        }
      }
    }
    ordered.splice(insertAt, 0, key);
  }
  return ordered;
}

function isLegacyStock(saved: SectionKey[]): boolean {
  if (!saved.length || STOCK_LAYOUTS.has(saved.join(','))) return true;
  if (!saved.includes('pitch')) return true;
  const problem = saved.indexOf('problem');
  const pricing = saved.indexOf('pricing');
  const stats = saved.indexOf('stats');
  const pitch = saved.indexOf('pitch');
  const looking = saved.indexOf('looking');
  if (problem !== -1 && pricing === problem + 1) return true;
  if (pricing !== -1 && looking !== -1 && pricing < looking && (pitch === -1 || pitch > looking)) {
    return true;
  }
  if (pricing !== -1 && stats !== -1 && pricing < stats && pitch > stats) return true;
  return false;
}

/** Owner order plus any new slots the saved layout has not seen yet. */
export function withDefaultSections(layout: SectionKey[] | undefined): SectionKey[] {
  const seen = new Set<SectionKey>();
  const saved: SectionKey[] = [];
  for (const key of layout ?? []) {
    if (key === 'onboarding' || seen.has(key)) continue;
    seen.add(key);
    saved.push(key);
  }
  if (isLegacyStock(saved)) return [...DEFAULT_LAYOUT];
  return insertMissingAtDefault(saved);
}

/** Swaps a section with its neighbour, or returns the order unchanged. */
export function moveSectionIn(
  layout: SectionKey[],
  index: number,
  direction: -1 | 1,
): SectionKey[] {
  const next = withDefaultSections(layout);
  const target = index + direction;
  if (target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** One follow-up per sent hey, and only once the 24h window has elapsed. */
export function canFollowUp(sentHey: SentHey): boolean {
  return (
    sentHey.status === 'Pending' &&
    !sentHey.followUp &&
    Date.now() - sentHey.sentAt >= FOLLOW_UP_DELAY_MS
  );
}

export type Plan = 'free' | 'pro';

export type UserProfile = {
  realName: string;
  username: string;
  /** Profile photo, either uploaded or taken from the sign-in provider. */
  photo?: string;
  /** What Discover shows. Chat always shows the real name. */
  showAs: 'username' | 'realName';
  job: string;
  workplace: string;
  industry: string;
  companySize: string;
  department: string;
  yearsExperience: string;
  /** Free-text intro shown at the top of the profile. */
  bio: string;
  /** Same `[kind, value]` shape as `AppListing.links`. */
  socials: [kind: string, value: string][];
  /** Multi-select answers keyed by onboarding group, e.g. `look`, `cat`, `l`, `d`. */
  tags: Record<string, string[]>;
  /** Free-text "in your own words" additions, keyed by the same groups. */
  ownWords: Record<string, string>;
  /** Fields hidden from the public page but still used for matching. */
  hidden: Record<string, boolean>;
  referralCode: string;
  bonusMatches: number;
  invitedBy?: string;
  feedbackGiven: number;
  replyRate: string;
  rating: string;
  githubLogin?: string;
  githubCommits?: number;
};

/** Everything the feedback form collects, which is one review. */
export type FeedbackDraft = {
  stars: number;
  summary: string;
  keep?: string;
  confusion?: string;
  bestMoment?: string;
  bug?: string;
  /** Storage path of the bug screenshot, already uploaded. */
  bugShot?: string;
  price?: string;
};

/** What Discover hands to `sayHey`; the stored `SentHey` is built from it. */
export type SayHeyInput = {
  appId: string;
  targetType: HeyTargetType;
  target: string;
  note: string;
  viaAppId?: string;
};

type State = {
  onboarded: boolean;
  plan: Plan;
  user: UserProfile;
  apps: Record<string, OwnedApp>;
  appOrder: string[];
  /** Other builders' listings, as the server returned them. */
  listings: Record<string, AppListing>;
  /** Deck order from the server. Null means the bundled deck is still in use. */
  deckIds: string[] | null;
  heysLeftToday: number;
  /** Incoming heys awaiting a pass or a hey back. */
  heys: IncomingHey[];
  /** Received heys that already became a match, newest first. */
  matchedHeys: IncomingHey[];
  /** Heys the user sent, newest first. */
  sentHeys: SentHey[];
  passed: string[];
  /** Why the user passed, keyed by the app they passed on. */
  passReasons: Record<string, string>;
  /** The user turned off the "why did you pass?" prompt. */
  passFeedbackDismissed: boolean;
  matches: Match[];
  messages: Record<string, Message[]>;
  /** Threads the user deleted; the match itself is kept. */
  deletedChats: string[];
  inbox: Record<string, InboxData>;
  /** Integrations connected per owned app. */
  connections: Record<string, Partial<Record<IntegrationKey, AppConnection>>>;
  seenMatchPaywall: boolean;
  /** When set, Discover shows this owned listing as the public preview. */
  previewAppId: string | null;
};

const initialUser: UserProfile = {
  realName: 'Jaryd',
  username: 'shipshape2308',
  showAs: 'username',
  job: '',
  workplace: '',
  industry: '',
  companySize: '',
  department: '',
  yearsExperience: '',
  bio: '',
  socials: [],
  tags: {},
  ownWords: {},
  hidden: {},
  referralCode: 'jaryd',
  bonusMatches: 0,
  feedbackGiven: 0,
  replyRate: '—',
  rating: '—',
};

/** Drops the bundled Cadence / Lumen / Tidepool loop so a signed-in account never inherits it. */
function stripBundledLoop(prev: State): Partial<State> | null {
  const demoMatches = prev.matches.some((match) => match.id === 'cad' || match.id === 'lum');
  const demoMessages = !!prev.messages.cad || !!prev.messages.lum;
  const demoTeam = (prev.messages.team ?? []).some(
    (message) => message.kind === 'announcement' && message.body.includes('Welcome to Hey100'),
  );
  const demoInbox = !!prev.inbox.tide || !!prev.inbox.tally;
  const demoHeys = prev.heys.some((hey) => hey.id.startsWith('hey-'));
  const demoSent = prev.sentHeys.some((hey) => hey.id.startsWith('sent-'));
  if (!demoMatches && !demoMessages && !demoTeam && !demoInbox && !demoHeys && !demoSent) {
    return null;
  }

  const messages = Object.fromEntries(
    Object.entries(prev.messages).filter(([id]) => id !== 'cad' && id !== 'lum'),
  );
  if (demoTeam) messages.team = [];

  return {
    matches: demoMatches ? [] : prev.matches,
    messages,
    inbox: demoInbox ? {} : prev.inbox,
    heys: demoHeys ? [] : prev.heys,
    sentHeys: demoSent ? [] : prev.sentHeys,
  };
}

function initialState(): State {
  return {
    onboarded: false,
    plan: 'free',
    user: initialUser,
    apps: {
      tide: { ...OWNED_APPS.tide, layout: [...DEFAULT_LAYOUT] },
      tally: { ...OWNED_APPS.tally, layout: [...DEFAULT_LAYOUT] },
    },
    appOrder: ['tide', 'tally'],
    listings: {},
    deckIds: null,
    heysLeftToday: 6,
    heys: [...INCOMING_HEYS],
    matchedHeys: [],
    sentHeys: [...SENT_HEYS],
    passed: [],
    passReasons: {},
    passFeedbackDismissed: false,
    matches: [...INITIAL_MATCHES],
    messages: { ...INITIAL_MESSAGES },
    deletedChats: [],
    inbox: { ...INBOX },
    connections: {
      tide: {
        github: {
          provider: 'github',
          badge: 'GitHub · 100–500 commits in 30 days',
          on: '148 commits in 30 days',
        },
      },
      tally: {
        github: {
          provider: 'github',
          badge: 'GitHub · 100–500 commits in 30 days',
          on: '148 commits in 30 days',
        },
        asc: { provider: 'asc', badge: 'Live on the App Store', on: 'Live on the App Store' },
      },
    },
    seenMatchPaywall: false,
    previewAppId: null,
  };
}

export type MatchResult = {
  matched: boolean;
  /** The thread to open, which is a match id once there is a backend. */
  matchId?: string;
  hitPaywall?: boolean;
  /** Set when the server refused: `daily_limit`, `match_limit`, and so on. */
  blocked?: string;
};

/** What the server replaced, so the screens know whether to await a refetch. */
export type LoopData = {
  listings: Record<string, AppListing>;
  deckIds: string[];
  heys: IncomingHey[];
  matchedHeys?: IncomingHey[];
  sentHeys: SentHey[];
  matches: Match[];
  inbox: Record<string, InboxData>;
  plan?: Plan;
  heysLeftToday?: number;
};

type Store = State & {
  /** True once there is a signed-in session to read and write through. */
  remote: boolean;
  isPro: boolean;
  matchesLeft: number;
  primaryApp: OwnedApp;
  ownedApps: OwnedApp[];
  displayName: string;
  /** Profile stat: matches made on Hey100. */
  matchesMade: number;
  /** Profile stat: people who tried the user's apps through a completed trade. */
  usersFound: number;

  /** Looks up any app by id, owned or not. */
  listing: (id: string) => AppListing | undefined;
  /** Section 9: a hey is attributed to the owner's best-fitting app. */
  attributedApp: (targetAppId: string) => OwnedApp;

  sayHey: (input: SayHeyInput) => Promise<MatchResult>;
  passApp: (appId: string, reason?: string) => Promise<void>;
  heyBack: (heyId: string) => Promise<MatchResult>;
  dismissHey: (heyId: string) => void;
  /** Passes an incoming hey and records why, for the Heys queue. */
  passHey: (heyId: string, reason?: string) => Promise<void>;
  sendFollowUp: (sentHeyId: string, note: string) => Promise<void>;
  dismissPassFeedback: () => void;
  /** Settings can turn the pass-reason prompt back on after it was dismissed. */
  setPassFeedback: (enabled: boolean) => void;

  sendMessage: (
    matchId: string,
    body: string,
    media?: MediaItem[],
    replyTo?: string,
  ) => Promise<void>;
  markChatRead: (matchId: string) => void;
  /** Hides the thread but keeps the match, which is the only record of a trade. */
  deleteChat: (matchId: string) => Promise<void>;
  setTradeStatus: (matchId: string, side: 'mine' | 'theirs', status: TradeStatus) => Promise<void>;
  /** Per-match URL and code the other person sees. */
  setMatchShare: (matchId: string, url: string, code: string) => Promise<void>;
  submitFeedback: (matchId: string, feedback: FeedbackDraft) => Promise<void>;
  rateFeedback: (appId: string, feedbackId: string, helpful: 'yes' | 'no') => Promise<void>;
  /** Replaces the loop with what the server returned. */
  hydrateLoop: (data: LoopData) => void;
  /** Replaces one thread's messages, from the server or Realtime. */
  setMessages: (matchId: string, messages: Message[]) => void;

  setAppConnection: (appId: string, key: IntegrationKey, value: AppConnection | null) => void;
  hydrateConnections: (appId: string, next: Partial<Record<IntegrationKey, AppConnection>>) => void;
  moveSection: (appId: string, index: number, direction: -1 | 1) => void;

  setPlan: (plan: Plan) => void;
  markMatchPaywallSeen: () => void;
  completeOnboarding: (patch: { user?: Partial<UserProfile>; app?: Partial<OwnedApp> }) => void;
  addApp: (app: OwnedApp) => void;
  /** Swaps the bundled sample apps for the listings the server returned. */
  replaceApps: (apps: OwnedApp[]) => void;
  /** Section edits on the owner's own listing. */
  updateApp: (appId: string, patch: Partial<OwnedApp>) => void;
  updateUser: (patch: Partial<UserProfile>) => void;
  setPreviewApp: (appId: string | null) => void;
};

const AppStoreContext = createContext<Store | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(initialState);
  const { userId, restoring } = useAuth();
  const queryClient = useQueryClient();

  /**
   * With a session, every action goes through the server and the screens
   * re-read what it says. Without one, the bundled sample data is edited in
   * place so the whole app is still walkable.
   */
  const remote = !!userId && !!getSupabase();

  const patch = useCallback((next: Partial<State> | ((prev: State) => Partial<State>)) => {
    setState((prev) => ({
      ...prev,
      ...(typeof next === 'function' ? next(prev) : next),
    }));
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDED_KEY)
      .then((value) => {
        if (value === '1') patch({ onboarded: true });
      })
      .catch(() => {});
  }, [patch]);

  useEffect(() => {
    if (restoring) return;
    if (userId) {
      patch((prev) => stripBundledLoop(prev) ?? {});
      return;
    }
    patch({ onboarded: false });
  }, [patch, restoring, userId]);

  /** Refetches the families an action touched, in parallel. */
  const refresh = useCallback(
    (families: readonly (readonly unknown[])[]) =>
      Promise.all(
        families.map((queryKey) => queryClient.invalidateQueries({ queryKey: [...queryKey] })),
      ).then(() => undefined),
    [queryClient],
  );

  const listing = useCallback(
    (id: string): AppListing | undefined =>
      state.apps[id] ??
      state.listings[id] ??
      LISTINGS[id] ??
      (MATCH_APPS[id] as AppListing | undefined) ??
      // Bundled heys and matches still point at the sample owned apps, so they
      // stay resolvable as listings after real ones replace them in `apps`.
      (OWNED_APPS[id] as AppListing | undefined),
    [state.apps, state.listings],
  );

  const attributedApp = useCallback(
    (targetAppId: string): OwnedApp => {
      const target = state.listings[targetAppId] ?? LISTINGS[targetAppId];
      const owned = state.appOrder.map((id) => state.apps[id]).filter(Boolean);
      if (!target) return owned.find((a) => a.primary) ?? owned[0];

      // Fit = interest overlap with what they want, then device compatibility.
      const score = (app: OwnedApp) => {
        const theirInterests = target.ideal.interests.toLowerCase();
        const mine = `${app.cat} ${app.ideal.interests}`.toLowerCase();
        const overlap = mine
          .split(/[,\s]+/)
          .filter((word) => word.length > 3 && theirInterests.includes(word)).length;
        const device = target.ideal.plat
          .toLowerCase()
          .includes(app.plat.toLowerCase().replace('ios', 'iphone'))
          ? 1
          : 0;
        return overlap * 2 + device + (app.primary ? 0.5 : 0);
      };

      return [...owned].sort((a, b) => score(b) - score(a))[0];
    },
    [state.appOrder, state.apps, state.listings],
  );

  const isPro = state.plan === 'pro';
  const matchesLeft = Math.max(
    0,
    FREE_MATCH_LIMIT + state.user.bonusMatches - state.matches.length,
  );

  /** Creates the match, its opening system line, and reports a paywall hit. */
  const createMatch = useCallback((appId: string, viaAppId: string, why: string): MatchResult => {
    let result: MatchResult = { matched: true, matchId: appId };

    setState((prev) => {
      const limit = FREE_MATCH_LIMIT + prev.user.bonusMatches;
      const hitPaywall = prev.plan === 'free' && prev.matches.length + 1 >= limit;
      result = { matched: true, matchId: appId, hitPaywall };

      const match: Match = {
        id: appId,
        appId,
        viaAppId,
        last: 'Say hi and swap test links.',
        time: 'now',
        mine: 'Not started',
        theirs: 'Not started',
        turn: true,
        expiresInDays: 7,
        why,
      };

      return {
        ...prev,
        matches: [match, ...prev.matches],
        sentHeys: prev.sentHeys.map((hey) =>
          hey.appId === appId && hey.status === 'Pending' ? { ...hey, status: 'Matched' } : hey,
        ),
        messages: {
          ...prev.messages,
          [appId]: [{ kind: 'system', body: `matched just now · ${why}` }],
        },
      };
    });

    return result;
  }, []);

  const sayHey = useCallback<Store['sayHey']>(
    async (input) => {
      const via = input.viaAppId ?? attributedApp(input.appId).id;

      if (remote) {
        const optimistic: SentHey = {
          id: `pending-${input.appId}-${Date.now()}`,
          appId: input.appId,
          viaAppId: via,
          target: input.target,
          targetType: input.targetType,
          note: input.note,
          sentAt: Date.now(),
          status: 'Pending',
        };
        patch((prev) => ({ sentHeys: [optimistic, ...prev.sentHeys] }));

        const result = await loop.sayHey({
          toAppId: input.appId,
          fromAppId: via,
          targetType: input.targetType,
          target: input.target,
          note: input.note,
        });

        await refresh([
          queryKeys.deck(userId),
          queryKeys.heys(userId),
          queryKeys.threads(userId),
          queryKeys.counters(userId),
        ]);

        if (!result || result.status === 'blocked') {
          patch((prev) => ({
            sentHeys: prev.sentHeys.filter((hey) => hey.id !== optimistic.id),
          }));
          return { matched: false, blocked: result?.reason ?? 'failed' };
        }

        return {
          matched: result.status === 'matched',
          ...(result.match_id ? { matchId: result.match_id } : {}),
          hitPaywall: result.hit_paywall,
        };
      }

      const theyAlreadySaidHey = state.heys.some((hey) => hey.appId === input.appId);

      const sent: SentHey = {
        id: `sent-${input.appId}-${Date.now()}`,
        appId: input.appId,
        viaAppId: via,
        target: input.target,
        targetType: input.targetType,
        note: input.note,
        sentAt: Date.now(),
        status: 'Pending',
      };

      patch((prev) => ({
        sentHeys: [sent, ...prev.sentHeys],
        heysLeftToday:
          prev.plan === 'pro' ? prev.heysLeftToday : Math.max(0, prev.heysLeftToday - 1),
        heys: theyAlreadySaidHey ? prev.heys.filter((hey) => hey.appId !== input.appId) : prev.heys,
      }));

      if (theyAlreadySaidHey) {
        return createMatch(input.appId, via, `you both said hey`);
      }
      return { matched: false };
    },
    [attributedApp, createMatch, patch, refresh, remote, state.heys, userId],
  );

  const passApp = useCallback<Store['passApp']>(
    async (appId, reason) => {
      // Hidden locally either way, so the card leaves the deck immediately.
      patch((prev) => ({
        passed: prev.passed.includes(appId) ? prev.passed : [...prev.passed, appId],
        passReasons: reason ? { ...prev.passReasons, [appId]: reason } : prev.passReasons,
      }));

      if (!remote || !userId) return;

      try {
        await loop.passApp(userId, appId, reason);
        await refresh([queryKeys.deck(userId)]);
      } catch {
        // The card already left the deck. A grant miss must not crash the screen.
      }
    },
    [patch, refresh, remote, userId],
  );

  const heyBack = useCallback<Store['heyBack']>(
    async (heyId) => {
      if (remote) {
        const hey = state.heys.find((h) => h.id === heyId);
        const result = await loop.heyBack(heyId, hey?.viaAppId);

        await refresh([
          queryKeys.heys(userId),
          queryKeys.threads(userId),
          queryKeys.deck(userId),
          queryKeys.counters(userId),
        ]);

        if (!result || result.status === 'blocked') {
          return { matched: false, blocked: result?.reason ?? 'failed' };
        }

        return {
          matched: result.status === 'matched',
          ...(result.match_id ? { matchId: result.match_id } : {}),
          hitPaywall: result.hit_paywall,
        };
      }

      const hey = state.heys.find((h) => h.id === heyId);
      if (!hey) return { matched: false };

      patch((prev) => ({ heys: prev.heys.filter((h) => h.id !== heyId) }));
      return createMatch(hey.appId, hey.viaAppId, `they said hey to your ${hey.target}`);
    },
    [createMatch, patch, refresh, remote, state.heys, userId],
  );

  const dismissHey = useCallback<Store['dismissHey']>(
    (heyId) => patch((prev) => ({ heys: prev.heys.filter((h) => h.id !== heyId) })),
    [patch],
  );

  const passHey = useCallback<Store['passHey']>(
    async (heyId, reason) => {
      patch((prev) => {
        const hey = prev.heys.find((h) => h.id === heyId);
        if (!hey) return {};
        return {
          heys: prev.heys.filter((h) => h.id !== heyId),
          passed: prev.passed.includes(hey.appId) ? prev.passed : [...prev.passed, hey.appId],
          passReasons: reason ? { ...prev.passReasons, [hey.appId]: reason } : prev.passReasons,
        };
      });

      if (!remote) return;

      await loop.passHey(heyId, reason);
      await refresh([queryKeys.heys(userId), queryKeys.deck(userId)]);
    },
    [patch, refresh, remote, userId],
  );

  const sendFollowUp = useCallback<Store['sendFollowUp']>(
    async (sentHeyId, note) => {
      const trimmed = note.trim();
      if (!trimmed) return;

      if (remote) {
        await loop.followUpHey(sentHeyId, trimmed);
        await refresh([queryKeys.heys(userId)]);
        return;
      }

      patch((prev) => {
        const hey = prev.sentHeys.find((h) => h.id === sentHeyId);
        if (!hey || !canFollowUp(hey)) return {};
        return {
          sentHeys: prev.sentHeys.map((h) =>
            h.id === sentHeyId ? { ...h, followUp: { note: trimmed, sentAt: Date.now() } } : h,
          ),
        };
      });
    },
    [patch, refresh, remote, userId],
  );

  const sendMessage = useCallback<Store['sendMessage']>(
    async (matchId, body, media, replyTo) => {
      const trimmed = body.trim();
      if (!trimmed && !media?.length) return;

      if (remote) {
        // Attachments are uploaded before the message, so a half-sent bubble
        // is never written.
        const attachments = userId ? await uploadAttachments(userId, media ?? []) : [];
        await loop.sendMessage(matchId, trimmed, attachments, replyTo);
        await refresh([queryKeys.messages(matchId), queryKeys.threads(userId)]);
        return;
      }

      const preview = trimmed || attachmentPreview(media ?? []);

      patch((prev) => ({
        messages: {
          ...prev.messages,
          [matchId]: [
            ...(prev.messages[matchId] ?? []),
            {
              kind: 'me',
              body: trimmed || undefined,
              media: media?.length ? media : undefined,
              at: new Date().toISOString(),
              ...(replyTo ? { reply: { id: replyTo, body: 'Reply' } } : {}),
            },
          ],
        },
        // Sending is also reading, so the thread can't stay unread for the sender.
        matches: prev.matches.map((m) =>
          m.id === matchId
            ? {
                ...m,
                last: `You: ${preview}`,
                time: 'now',
                turn: false,
                unread: 0,
              }
            : m,
        ),
      }));
    },
    [patch, refresh, remote, userId],
  );

  const deleteChat = useCallback<Store['deleteChat']>(
    async (matchId) => {
      patch((prev) =>
        prev.deletedChats.includes(matchId)
          ? {}
          : { deletedChats: [...prev.deletedChats, matchId] },
      );

      if (!remote) return;

      await loop.hideThread(matchId);
      await refresh([queryKeys.threads(userId)]);
    },
    [patch, refresh, remote, userId],
  );

  const markChatRead = useCallback<Store['markChatRead']>(
    (matchId) => {
      patch((prev) => ({
        matches: prev.matches.map((m) => (m.id === matchId ? { ...m, unread: 0 } : m)),
      }));

      if (!remote) return;

      // Opening a thread should not block on the network, so this is sent and
      // the badge is already cleared locally.
      loop
        .markThreadRead(matchId)
        .then(() => refresh([queryKeys.threads(userId)]))
        .catch(() => {});
    },
    [patch, refresh, remote, userId],
  );

  const setTradeStatus = useCallback<Store['setTradeStatus']>(
    async (matchId, side, status) => {
      patch((prev) => ({
        matches: prev.matches.map((m) => {
          if (m.id !== matchId || m[side] === status) return m;
          if (m[side] === 'Feedback sent') return m;
          return { ...m, [side]: status };
        }),
      }));

      // Only my own side is mine to move; theirs arrives from the server.
      if (!remote || side !== 'mine') return;

      await loop.setTradeStatus(matchId, status);
      await refresh([queryKeys.threads(userId), queryKeys.messages(matchId)]);
    },
    [patch, refresh, remote, userId],
  );

  const setMatchShare = useCallback<Store['setMatchShare']>(
    async (matchId, url, code) => {
      const nextUrl = url.trim();
      const nextCode = code.trim();
      patch((prev) => ({
        matches: prev.matches.map((m) =>
          m.id === matchId
            ? {
                ...m,
                myShareUrl: nextUrl || undefined,
                myShareCode: nextCode || undefined,
              }
            : m,
        ),
      }));

      if (!remote) return;

      await loop.setMatchShare(matchId, nextUrl, nextCode);
      await refresh([queryKeys.threads(userId), queryKeys.messages(matchId)]);
    },
    [patch, refresh, remote, userId],
  );

  const submitFeedback = useCallback<Store['submitFeedback']>(
    async (matchId, feedback) => {
      if (remote) {
        await loop.leaveFeedback({ matchId, ...feedback });
        await refresh([
          queryKeys.threads(userId),
          queryKeys.messages(matchId),
          queryKeys.feedback(userId),
        ]);
        return;
      }

      const meta = [
        feedback.keep ? `Keep using: ${feedback.keep}` : null,
        feedback.price ? `Fair price: ${feedback.price}` : null,
      ]
        .filter(Boolean)
        .join(' · ');

      patch((prev) => ({
        messages: {
          ...prev.messages,
          [matchId]: [
            ...(prev.messages[matchId] ?? []),
            {
              kind: 'feedback',
              from: 'me',
              stars: `${feedback.stars}/5`,
              body: feedback.summary,
              meta,
            },
          ],
        },
        matches: prev.matches.map((m) => (m.id === matchId ? { ...m, mine: 'Feedback sent' } : m)),
      }));
    },
    [patch, refresh, remote, userId],
  );

  const rateFeedback = useCallback<Store['rateFeedback']>(
    async (appId, feedbackId, helpful) => {
      patch((prev) => {
        const data = prev.inbox[appId];
        if (!data) return {};
        return {
          inbox: {
            ...prev.inbox,
            [appId]: {
              ...data,
              list: data.list.map((entry) =>
                entry.id === feedbackId ? { ...entry, helpful } : entry,
              ),
            },
          },
        };
      });

      if (!remote) return;

      await loop.rateFeedbackHelpful(feedbackId, helpful);
      await refresh([queryKeys.feedback(userId)]);
    },
    [patch, refresh, remote, userId],
  );

  const hydrateLoop = useCallback<Store['hydrateLoop']>(
    (data) =>
      patch((prev) => {
        const pending = prev.sentHeys.filter(
          (hey) =>
            hey.id.startsWith('pending-') &&
            !data.sentHeys.some((row) => row.appId === hey.appId && row.note === hey.note),
        );
        return {
          listings: data.listings,
          deckIds: data.deckIds,
          heys: data.heys,
          matchedHeys: data.matchedHeys ?? [],
          sentHeys: pending.length ? [...pending, ...data.sentHeys] : data.sentHeys,
          matches: data.matches,
          inbox: data.inbox,
          ...(data.plan ? { plan: data.plan } : {}),
          ...(data.heysLeftToday !== undefined ? { heysLeftToday: data.heysLeftToday } : {}),
        };
      }),
    [patch],
  );

  const setMessages = useCallback<Store['setMessages']>(
    (matchId, messages) =>
      patch((prev) => ({
        messages: { ...prev.messages, [matchId]: messages },
      })),
    [patch],
  );

  const badgesFrom = (row: Partial<Record<IntegrationKey, AppConnection>>) =>
    Object.values(row)
      .filter((item): item is AppConnection => !!item)
      .flatMap((item) => (item.badges?.length ? item.badges : [item.badge]));

  const setAppConnection = useCallback<Store['setAppConnection']>(
    (appId, key, value) =>
      patch((prev) => {
        const current = { ...(prev.connections[appId] ?? {}) };
        if (value) current[key] = value;
        else delete current[key];
        const app = prev.apps[appId];
        return {
          connections: { ...prev.connections, [appId]: current },
          ...(app
            ? { apps: { ...prev.apps, [appId]: { ...app, badges: badgesFrom(current) } } }
            : {}),
        };
      }),
    [patch],
  );

  const hydrateConnections = useCallback<Store['hydrateConnections']>(
    (appId, next) =>
      patch((prev) => {
        const app = prev.apps[appId];
        const current = prev.connections[appId] ?? {};
        const keep =
          Object.keys(next).length > 0
            ? next
            : {
                ...connectionsFromBadges(app?.badges),
                ...current,
              };
        const same =
          Object.keys(keep).length === Object.keys(current).length &&
          Object.keys(keep).every((key) => {
            const left = keep[key as IntegrationKey];
            const right = current[key as IntegrationKey];
            return left?.badge === right?.badge && left?.on === right?.on;
          });
        if (same) return {};
        return {
          connections: { ...prev.connections, [appId]: keep },
          ...(app && Object.keys(next).length
            ? { apps: { ...prev.apps, [appId]: { ...app, badges: badgesFrom(keep) } } }
            : {}),
        };
      }),
    [patch],
  );

  const moveSection = useCallback<Store['moveSection']>(
    (appId, index, direction) =>
      patch((prev) => {
        const app = prev.apps[appId];
        if (!app) return {};
        return {
          apps: {
            ...prev.apps,
            [appId]: {
              ...app,
              layout: moveSectionIn(app.layout, index, direction),
            },
          },
        };
      }),
    [patch],
  );

  const completeOnboarding = useCallback<Store['completeOnboarding']>(
    ({ user, app }) => {
      AsyncStorage.setItem(ONBOARDED_KEY, '1').catch(() => {});
      patch((prev) => {
        if (!app) {
          return {
            onboarded: true,
            user: { ...prev.user, ...user },
            ...(stripBundledLoop({ ...prev, user: { ...prev.user, ...user } }) ?? {}),
          };
        }

        // A listing created on the server arrives complete and becomes the only
        // app. Merging it over the sample listing instead would hand a brand
        // new app Tidepool's view and trade counts.
        if (app.id) {
          return {
            onboarded: true,
            user: {
              ...prev.user,
              ...user,
              bio: user?.bio ?? '',
              socials: user?.socials ?? [],
              feedbackGiven: 0,
              replyRate: '—',
              rating: '—',
            },
            apps: { [app.id]: app as OwnedApp },
            appOrder: [app.id],
            connections: { [app.id]: {} },
            heys: [],
            matchedHeys: [],
            sentHeys: [],
            matches: [],
            messages: { team: [] },
            inbox: {},
          };
        }

        // No backend configured: the sample listing is edited in place so the
        // whole flow still works.
        return {
          onboarded: true,
          user: { ...prev.user, ...user },
          apps: { ...prev.apps, tide: { ...prev.apps.tide, ...app } },
        };
      });
    },
    [patch],
  );

  const replaceApps = useCallback<Store['replaceApps']>(
    (apps) =>
      patch((prev) => ({
        apps: Object.fromEntries(
          apps.map((app) => {
            const local = prev.apps[app.id];
            if (!local) return [app.id, app];
            return [
              app.id,
              {
                ...app,
                description: app.description || local.description,
                problemOf: app.problemOf || local.problemOf,
                problemFor: app.problemFor || local.problemFor,
                pricingModel: app.pricingModel || local.pricingModel,
                priceFrom: app.priceFrom || local.priceFrom,
                pitchUri: app.pitchUri || local.pitchUri,
                pitchSeconds: app.pitchSeconds ?? local.pitchSeconds,
                layout: withDefaultSections(app.layout?.length ? app.layout : local.layout),
              },
            ];
          }),
        ),
        appOrder: apps.map((app) => app.id),
        connections: Object.fromEntries(
          apps.map((app) => [app.id, prev.connections[app.id] ?? {}]),
        ),
      })),
    [patch],
  );

  const addApp = useCallback<Store['addApp']>(
    (app) =>
      patch((prev) => ({
        apps: { ...prev.apps, [app.id]: app },
        appOrder: [...prev.appOrder, app.id],
        connections: { ...prev.connections, [app.id]: {} },
      })),
    [patch],
  );

  const updateApp = useCallback<Store['updateApp']>(
    (appId, appPatch) =>
      patch((prev) =>
        prev.apps[appId]
          ? {
              apps: {
                ...prev.apps,
                [appId]: { ...prev.apps[appId], ...appPatch },
              },
            }
          : {},
      ),
    [patch],
  );

  const owned = useMemo(
    () => state.appOrder.map((id) => state.apps[id]).filter(Boolean),
    [state.appOrder, state.apps],
  );

  const value = useMemo<Store>(
    () => ({
      ...state,
      remote,
      isPro,
      matchesLeft,
      ownedApps: owned,
      primaryApp: owned.find((app) => app.primary) ?? owned[0],
      displayName:
        state.user.showAs === 'username' ? `@${state.user.username}` : state.user.realName,
      matchesMade: state.matches.length,
      usersFound: state.appOrder.reduce((sum, id) => sum + (state.apps[id]?.trades ?? 0), 0),
      listing,
      attributedApp,
      sayHey,
      passApp,
      heyBack,
      dismissHey,
      passHey,
      sendFollowUp,
      dismissPassFeedback: () => patch({ passFeedbackDismissed: true }),
      setPassFeedback: (enabled: boolean) => patch({ passFeedbackDismissed: !enabled }),
      sendMessage,
      markChatRead,
      deleteChat,
      setTradeStatus,
      setMatchShare,
      submitFeedback,
      rateFeedback,
      hydrateLoop,
      setMessages,
      setAppConnection,
      hydrateConnections,
      moveSection,
      setPlan: (plan) => patch({ plan }),
      markMatchPaywallSeen: () => patch({ seenMatchPaywall: true }),
      completeOnboarding,
      addApp,
      replaceApps,
      updateApp,
      updateUser: (next) => patch((prev) => ({ user: { ...prev.user, ...next } })),
      setPreviewApp: (appId) => patch({ previewAppId: appId }),
    }),
    [
      addApp,
      owned,
      replaceApps,
      updateApp,
      attributedApp,
      completeOnboarding,
      dismissHey,
      heyBack,
      hydrateLoop,
      isPro,
      listing,
      markChatRead,
      matchesLeft,
      moveSection,
      passApp,
      passHey,
      patch,
      rateFeedback,
      remote,
      sayHey,
      sendFollowUp,
      sendMessage,
      setMessages,
      setTradeStatus,
      setMatchShare,
      state,
      submitFeedback,
      setAppConnection,
      hydrateConnections,
    ],
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(AppStoreContext);
  if (!store) throw new Error('useStore must be used inside AppStoreProvider');
  return store;
}

/** Title for a match thread, e.g. "Cadence". */
export function matchTitle(id: string): string {
  const app = LISTINGS[id] ?? MATCH_APPS[id];
  return app ? shortName(app.name) : id;
}
