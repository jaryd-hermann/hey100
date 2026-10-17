import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { PickedShot } from '@/data/types';

const ADJECTIVES = [
  'ship',
  'quiet',
  'tiny',
  'bright',
  'brave',
  'spare',
  'swift',
  'solid',
  'plain',
  'north',
];

const NOUNS = ['shape', 'otter', 'ledger', 'harbor', 'signal', 'ember', 'pilot', 'maple', 'atlas', 'river'];

/** adjective + noun + 4 digits, per the username step. */
export function generateUsername(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const digits = String(Math.floor(1000 + Math.random() * 9000));
  return `${adjective}${noun}${digits}`;
}

export const USERNAME_PATTERN = /^[a-z0-9_]{1,20}$/;

export type Draft = {
  step: number;
  inviteCode: string;
  inviteOk: boolean;
  invitedBy: string | null;

  appUrl: string;
  fetched: boolean;
  appName: string;
  appSub: string;
  appHue: number;
  appCats: string[];
  links: { web: string; tiktok: string; instagram: string };
  /** Picked shots in carousel order. The first one is the cover. */
  shots: PickedShot[];

  /** Multi-select answers keyed by step group. */
  sel: Record<string, string[]>;
  own: Record<string, string>;
  /** Visible-on-profile, defaults to on. */
  vis: Record<string, boolean>;

  /** Prompt ids in slot order, plus their answers. */
  answered: string[];
  answers: Record<string, string>;

  workplace: string;
  job: string;

  username: string;
  showAs: 'username' | 'realName';
  terms: boolean;
};

function initialDraft(startStep: number): Draft {
  return {
    step: startStep,
    inviteCode: '',
    inviteOk: false,
    invitedBy: null,
    appUrl: '',
    fetched: false,
    appName: '',
    appSub: '',
    appHue: 220,
    appCats: [],
    links: { web: '', tiktok: '', instagram: '' },
    shots: [],
    sel: {},
    own: {},
    vis: {},
    answered: [],
    answers: {},
    workplace: '',
    job: '',
    username: generateUsername(),
    showAs: 'username',
    terms: false,
  };
}

/** Writes are debounced because the text steps patch on every keystroke. */
const SAVE_DELAY_MS = 400;

/**
 * `storageKey` null means do not persist. The "list another app" flow reuses
 * these steps but is not a signup, so it must not overwrite a signup draft.
 */
export function useOnboardingDraft(startStep = 0, storageKey: string | null = null) {
  const [draft, setDraft] = useState<Draft>(() => initialDraft(startStep));
  // Onboarding is long enough that losing it to a backgrounded app would be a
  // real loss, so it is restored before the first step renders.
  const [ready, setReady] = useState(!storageKey);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!storageKey) return;

    let active = true;
    AsyncStorage.getItem(storageKey)
      .then((stored) => {
        if (!active || !stored) return;
        const parsed = JSON.parse(stored) as Partial<Draft>;
        // A draft written by an older build can hold the wrong shape, which is
        // worse than losing the field.
        if (!Array.isArray(parsed.shots)) delete parsed.shots;
        // Spread over a fresh draft so a shape change in a new build cannot
        // leave a field undefined.
        setDraft((prev) => ({ ...prev, ...parsed }));
      })
      .catch(() => {})
      .finally(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || !ready) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      AsyncStorage.setItem(storageKey, JSON.stringify(draft)).catch(() => {});
    }, SAVE_DELAY_MS);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [draft, ready, storageKey]);

  const clear = useCallback(async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (storageKey) await AsyncStorage.removeItem(storageKey).catch(() => {});
  }, [storageKey]);

  const update = useCallback(
    (patch: Partial<Draft> | ((prev: Draft) => Partial<Draft>)) =>
      setDraft((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) })),
    [],
  );

  /** Single-select replaces the group; multi-select toggles within it. */
  const toggle = useCallback((group: string, label: string, single?: boolean) => {
    setDraft((prev) => {
      const current = prev.sel[group] ?? [];
      const next = single
        ? [label]
        : current.includes(label)
          ? current.filter((item) => item !== label)
          : [...current, label];
      return { ...prev, sel: { ...prev.sel, [group]: next } };
    });
  }, []);

  const picked = useCallback((group: string) => draft.sel[group] ?? [], [draft.sel]);

  const isVisible = useCallback((key: string) => draft.vis[key] !== false, [draft.vis]);

  const toggleVisible = useCallback(
    (key: string) =>
      setDraft((prev) => ({ ...prev, vis: { ...prev.vis, [key]: prev.vis[key] === false } })),
    [],
  );

  return { draft, ready, update, toggle, picked, isVisible, toggleVisible, clear };
}
