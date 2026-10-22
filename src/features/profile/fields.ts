import { STEPS } from '@/features/onboarding/steps';

/** The profile's tag rows, keyed by the onboarding group that filled them. */
export const TAG_ROWS: [label: string, group: string][] = [
  ['Day job', 'job'],
  ['Skills', 'sk'],
  ['Looking for', 'look'],
  ["Apps I'd try", 'cat'],
  ['Tests on', 'd'],
];

export type EditableGroup = {
  group: string;
  /** The row label used on the profile, e.g. "Looking for". */
  label: string;
  /** The onboarding question, reused as the editor's hint. */
  title: string;
  opts: string[];
  /** Whether onboarding offered the "in your own words" field for this group. */
  own: boolean;
  search?: boolean;
  max?: number;
};

/**
 * The person-side multi-selects the profile editor can change, read off the
 * onboarding steps so the options and copy stay in sync with the flow.
 */
export const EDITABLE_GROUPS: EditableGroup[] = TAG_ROWS.filter(([, group]) => group !== 'job').map(
  ([label, group]) => {
    const step = STEPS.find((candidate) => candidate.group === group);
    return {
      group,
      label,
      title: step?.title ?? label,
      opts: step?.opts ?? [],
      own: !!step?.own,
      search: step?.search,
      max: step?.max,
    };
  },
);

/** Twitter's bio length — short enough to read on a card. */
export const BIO_MAX = 160;

/** Database key → label shown on the profile and listing. */
export const SOCIAL_KEYS: [key: string, label: string][] = [
  ['x', 'X'],
  ['github', 'GitHub'],
  ['linkedin', 'LinkedIn'],
  ['instagram', 'Instagram'],
  ['tiktok', 'TikTok'],
  ['youtube', 'YouTube'],
  ['discord', 'Discord'],
  ['web', 'Web'],
];

/** Networks the editor offers, in the order they appear on the profile. */
export const SOCIAL_FIELDS: [kind: string, placeholder: string][] = [
  ['X', '@handle'],
  ['GitHub', 'username'],
  ['LinkedIn', 'username'],
  ['Instagram', '@handle'],
  ['TikTok', '@handle'],
  ['YouTube', '@handle'],
  ['Discord', 'username'],
  ['Web', 'yoursite.com'],
];
