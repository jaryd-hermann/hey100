import type { Prompt } from './types';

/** The prompt library. Tags drive the chips on the picker. */
export const PROMPT_LIBRARY: Prompt[] = [
  { id: 'honest', tag: 'Feedback', label: 'The honest thing I need feedback on…' },
  { id: 'love', tag: 'Audience', label: "You'll love this app if…" },
  { id: 'how', tag: 'Product', label: "In 30 seconds, here's how it works:" },
  { id: 'proud', tag: 'Product', label: "The feature I'm most proud of…" },
  { id: 'works', tag: 'Feedback', label: "I'll know this app works when…" },
  { id: 'dont', tag: 'Audience', label: "Don't download this if…" },
  { id: 'green', tag: 'Audience', label: 'Green flag in a user:' },
  { id: 'why', tag: 'Story', label: 'Why I built this…' },
  { id: 'first', tag: 'Story', label: 'Our first user said…' },
  { id: 'weird', tag: 'Story', label: 'The weirdest thing I learned building it…' },
  { id: 'next', tag: 'Product', label: "What's coming next…" },
  { id: 'stuck', tag: 'Feedback', label: 'Where people get stuck…' },
  { id: 'magic', tag: 'Product', label: 'The magic moment is…' },
  { id: 'solves', tag: 'Product', label: 'I solve the problem of…' },
  { id: 'different', tag: 'Product', label: 'My app is different because…' },
  { id: 'skipping', tag: 'Product', label: "What I'm deliberately not building…" },
  { id: 'premise', tag: 'Story', label: 'The premise is…' },
  { id: 'strength', tag: 'Story', label: 'My strength as a builder is…' },
  { id: 'hardest', tag: 'Story', label: 'The hardest part to get right…' },
  { id: 'hearing', tag: 'Story', label: 'What I keep hearing from users…' },
  { id: 'who', tag: 'Audience', label: 'Who this is really for…' },
  { id: 'try', tag: 'Feedback', label: 'Try this first:' },
];

export const PROMPT_TAGS = ['All', 'Product', 'Audience', 'Story', 'Feedback'] as const;

export const ANSWER_MAX = 225;

export function promptLabel(id: string): string {
  return PROMPT_LIBRARY.find((p) => p.id === id)?.label ?? '';
}

/** Seed answers used by the prototype's pre-filled Tidepool listing. */
export const SAMPLE_ANSWERS: Record<string, string> = {
  honest: 'Whether inviting your partner feels exciting or like homework.',
  love: 'Money talks with your partner usually end with someone on the couch.',
  how: 'Connect one account each. Every Sunday you get a short "money date" summary to read together.',
  proud: 'The Sunday summary. It reads like a letter, not a spreadsheet.',
  works: 'A couple opens it together without one of them being asked twice.',
  dont: 'You want to track every cent. This is for talking, not auditing.',
  green: "You'll open it with your partner, not just on your own.",
  why: 'My partner and I kept having the same money argument. I wanted a calmer way to have it.',
  first: '"We had our first money talk that didn\'t end in a fight."',
  weird: 'Couples open it most on Sunday nights, right before the week starts.',
  next: 'Shared savings goals with a progress bar you both can see.',
  stuck: 'Connecting the second bank account.',
};
