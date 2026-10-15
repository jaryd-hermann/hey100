import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import {
  DEFAULT_LAYOUT,
  INBOX,
  INCOMING_HEYS,
  INITIAL_MATCHES,
  INITIAL_MESSAGES,
  LISTINGS,
  MATCH_APPS,
  OWNED_APPS,
  shortName,
} from '@/data/mock';
import type {
  AppListing,
  HeyTargetType,
  IncomingHey,
  InboxData,
  IntegrationKey,
  Match,
  Message,
  OwnedApp,
  SectionKey,
  TradeStatus,
} from '@/data/types';

export const FREE_MATCH_LIMIT = 5;
export const FREE_DAILY_HEYS = 8;

export type Plan = 'free' | 'pro';

export type UserProfile = {
  realName: string;
  username: string;
  /** What Discover shows. Chat always shows the real name. */
  showAs: 'username' | 'realName';
  job: string;
  workplace: string;
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
};

export type SentHey = {
  appId: string;
  targetType: HeyTargetType;
  target: string;
  note: string;
  viaAppId: string;
};

type State = {
  onboarded: boolean;
  plan: Plan;
  user: UserProfile;
  apps: Record<string, OwnedApp>;
  appOrder: string[];
  heysLeftToday: number;
  /** Incoming heys awaiting a pass or a hey back. */
  heys: IncomingHey[];
  sentHeys: SentHey[];
  passed: string[];
  matches: Match[];
  messages: Record<string, Message[]>;
  inbox: Record<string, InboxData>;
  /** Integrations connected per owned app. */
  connections: Record<string, Partial<Record<IntegrationKey, boolean>>>;
  seenMatchPaywall: boolean;
};

const initialUser: UserProfile = {
  realName: 'Jaryd',
  username: 'shipshape2308',
  showAs: 'username',
  job: '',
  workplace: '',
  tags: {},
  ownWords: {},
  hidden: {},
  referralCode: 'jaryd',
  bonusMatches: 0,
  feedbackGiven: 14,
  replyRate: '94%',
  rating: '4.8',
};

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
    heysLeftToday: 6,
    heys: [...INCOMING_HEYS],
    sentHeys: [],
    passed: [],
    matches: [...INITIAL_MATCHES],
    messages: { ...INITIAL_MESSAGES },
    inbox: { ...INBOX },
    connections: { tide: { github: true }, tally: { github: true, asc: true } },
    seenMatchPaywall: false,
  };
}

export type MatchResult = { matched: boolean; matchId?: string; hitPaywall?: boolean };

type Store = State & {
  isPro: boolean;
  matchesLeft: number;
  primaryApp: OwnedApp;
  ownedApps: OwnedApp[];
  displayName: string;

  /** Looks up any app by id, owned or not. */
  listing: (id: string) => AppListing | undefined;
  /** Section 9: a hey is attributed to the owner's best-fitting app. */
  attributedApp: (targetAppId: string) => OwnedApp;

  sayHey: (input: Omit<SentHey, 'viaAppId'> & { viaAppId?: string }) => MatchResult;
  passApp: (appId: string) => void;
  heyBack: (heyId: string) => MatchResult;
  dismissHey: (heyId: string) => void;

  sendMessage: (matchId: string, body: string) => void;
  setTradeStatus: (matchId: string, side: 'mine' | 'theirs', status: TradeStatus) => void;
  submitFeedback: (matchId: string, summary: string, stars: string, meta: string) => void;
  rateFeedback: (appId: string, feedbackId: string, helpful: 'yes' | 'no') => void;

  toggleIntegration: (appId: string, key: IntegrationKey) => void;
  moveSection: (appId: string, index: number, direction: -1 | 1) => void;

  setPlan: (plan: Plan) => void;
  markMatchPaywallSeen: () => void;
  completeOnboarding: (patch: { user?: Partial<UserProfile>; app?: Partial<OwnedApp> }) => void;
  addApp: (app: OwnedApp) => void;
  updateUser: (patch: Partial<UserProfile>) => void;
};

const AppStoreContext = createContext<Store | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(initialState);

  const patch = useCallback((next: Partial<State> | ((prev: State) => Partial<State>)) => {
    setState((prev) => ({ ...prev, ...(typeof next === 'function' ? next(prev) : next) }));
  }, []);

  const listing = useCallback(
    (id: string): AppListing | undefined =>
      state.apps[id] ?? LISTINGS[id] ?? (MATCH_APPS[id] as AppListing | undefined),
    [state.apps],
  );

  const attributedApp = useCallback(
    (targetAppId: string): OwnedApp => {
      const target = LISTINGS[targetAppId];
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
    [state.appOrder, state.apps],
  );

  const isPro = state.plan === 'pro';
  const matchesLeft = Math.max(
    0,
    FREE_MATCH_LIMIT + state.user.bonusMatches - state.matches.length,
  );

  /** Creates the match, its opening system line, and reports a paywall hit. */
  const createMatch = useCallback(
    (appId: string, viaAppId: string, why: string): MatchResult => {
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
          messages: {
            ...prev.messages,
            [appId]: [{ kind: 'system', body: `matched just now · ${why}` }],
          },
        };
      });

      return result;
    },
    [],
  );

  const sayHey = useCallback<Store['sayHey']>(
    (input) => {
      const via = input.viaAppId ?? attributedApp(input.appId).id;
      const theyAlreadySaidHey = state.heys.some((hey) => hey.appId === input.appId);

      patch((prev) => ({
        sentHeys: [...prev.sentHeys, { ...input, viaAppId: via }],
        heysLeftToday: prev.plan === 'pro' ? prev.heysLeftToday : Math.max(0, prev.heysLeftToday - 1),
        heys: theyAlreadySaidHey ? prev.heys.filter((hey) => hey.appId !== input.appId) : prev.heys,
      }));

      if (theyAlreadySaidHey) {
        return createMatch(input.appId, via, `you both said hey`);
      }
      return { matched: false };
    },
    [attributedApp, createMatch, patch, state.heys],
  );

  const passApp = useCallback<Store['passApp']>(
    (appId) => patch((prev) => ({ passed: [...prev.passed, appId] })),
    [patch],
  );

  const heyBack = useCallback<Store['heyBack']>(
    (heyId) => {
      const hey = state.heys.find((h) => h.id === heyId);
      if (!hey) return { matched: false };

      patch((prev) => ({ heys: prev.heys.filter((h) => h.id !== heyId) }));
      return createMatch(hey.appId, hey.viaAppId, `they said hey to your ${hey.target}`);
    },
    [createMatch, patch, state.heys],
  );

  const dismissHey = useCallback<Store['dismissHey']>(
    (heyId) => patch((prev) => ({ heys: prev.heys.filter((h) => h.id !== heyId) })),
    [patch],
  );

  const sendMessage = useCallback<Store['sendMessage']>(
    (matchId, body) => {
      const trimmed = body.trim();
      if (!trimmed) return;

      patch((prev) => ({
        messages: {
          ...prev.messages,
          [matchId]: [...(prev.messages[matchId] ?? []), { kind: 'me', body: trimmed }],
        },
        matches: prev.matches.map((m) =>
          m.id === matchId ? { ...m, last: `You: ${trimmed}`, time: 'now', turn: false } : m,
        ),
      }));
    },
    [patch],
  );

  const setTradeStatus = useCallback<Store['setTradeStatus']>(
    (matchId, side, status) =>
      patch((prev) => ({
        matches: prev.matches.map((m) => (m.id === matchId ? { ...m, [side]: status } : m)),
      })),
    [patch],
  );

  const submitFeedback = useCallback<Store['submitFeedback']>(
    (matchId, summary, stars, meta) =>
      patch((prev) => ({
        messages: {
          ...prev.messages,
          [matchId]: [
            ...(prev.messages[matchId] ?? []),
            { kind: 'feedback', from: 'me', stars, body: summary, meta },
          ],
        },
        matches: prev.matches.map((m) => (m.id === matchId ? { ...m, mine: 'Feedback sent' } : m)),
      })),
    [patch],
  );

  const rateFeedback = useCallback<Store['rateFeedback']>(
    (appId, feedbackId, helpful) =>
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
      }),
    [patch],
  );

  const toggleIntegration = useCallback<Store['toggleIntegration']>(
    (appId, key) =>
      patch((prev) => {
        const current = prev.connections[appId] ?? {};
        const connections = { ...prev.connections, [appId]: { ...current, [key]: !current[key] } };
        const app = prev.apps[appId];
        if (!app) return { connections };

        const badges = Object.entries(connections[appId])
          .filter(([, on]) => on)
          .map(([k]) => k);

        return {
          connections,
          apps: {
            ...prev.apps,
            [appId]: { ...app, badges: badges as string[] },
          },
        };
      }),
    [patch],
  );

  const moveSection = useCallback<Store['moveSection']>(
    (appId, index, direction) =>
      patch((prev) => {
        const app = prev.apps[appId];
        if (!app) return {};
        const next: SectionKey[] = [...app.layout];
        const target = index + direction;
        if (target < 0 || target >= next.length) return {};
        [next[index], next[target]] = [next[target], next[index]];
        return { apps: { ...prev.apps, [appId]: { ...app, layout: next } } };
      }),
    [patch],
  );

  const completeOnboarding = useCallback<Store['completeOnboarding']>(
    ({ user, app }) =>
      patch((prev) => ({
        onboarded: true,
        user: { ...prev.user, ...user },
        apps: app ? { ...prev.apps, tide: { ...prev.apps.tide, ...app } } : prev.apps,
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

  const value = useMemo<Store>(
    () => ({
      ...state,
      isPro,
      matchesLeft,
      ownedApps: state.appOrder.map((id) => state.apps[id]).filter(Boolean),
      primaryApp: state.apps.tide ?? state.apps[state.appOrder[0]],
      displayName:
        state.user.showAs === 'username' ? `@${state.user.username}` : state.user.realName,
      listing,
      attributedApp,
      sayHey,
      passApp,
      heyBack,
      dismissHey,
      sendMessage,
      setTradeStatus,
      submitFeedback,
      rateFeedback,
      toggleIntegration,
      moveSection,
      setPlan: (plan) => patch({ plan }),
      markMatchPaywallSeen: () => patch({ seenMatchPaywall: true }),
      completeOnboarding,
      addApp,
      updateUser: (next) => patch((prev) => ({ user: { ...prev.user, ...next } })),
    }),
    [
      addApp,
      attributedApp,
      completeOnboarding,
      dismissHey,
      heyBack,
      isPro,
      listing,
      matchesLeft,
      moveSection,
      passApp,
      patch,
      rateFeedback,
      sayHey,
      sendMessage,
      setTradeStatus,
      state,
      submitFeedback,
      toggleIntegration,
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
