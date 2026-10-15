import { useCallback, useState } from 'react';

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
  /** Number of filled media slots; real assets land here once uploads exist. */
  shots: number;

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
    shots: 0,
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

export function useOnboardingDraft(startStep = 0) {
  const [draft, setDraft] = useState<Draft>(() => initialDraft(startStep));

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

  return { draft, update, toggle, picked, isVisible, toggleVisible };
}
