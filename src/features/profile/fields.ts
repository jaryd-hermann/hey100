import { STEPS } from '@/features/onboarding/steps';

/** The profile's tag rows, keyed by the onboarding group that filled them. */
export const TAG_ROWS: [label: string, group: string][] = [
  ['Day job', 'job'],
  ['Looking for', 'look'],
  ["Apps I'd try", 'cat'],
  ['Outside building', 'l'],
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
    };
  },
);

/** Networks the editor offers, in the order they appear on the profile. */
export const SOCIAL_FIELDS: [kind: string, placeholder: string][] = [
  ['X', '@handle'],
  ['GitHub', 'username'],
  ['LinkedIn', 'in/username'],
  ['Web', 'yoursite.com'],
];
