import { AGES } from '@/data/mock';

export type StepKind =
  | 'welcome'
  | 'invite'
  | 'check'
  | 'link'
  | 'media'
  | 'pick'
  | 'summary'
  | 'prompts'
  | 'text'
  | 'summary2'
  | 'username'
  | 'auth';

export type Step = {
  kind: StepKind;
  title?: string;
  /** Selection group key, e.g. `stage`, `ii`, `look`. */
  group?: string;
  single?: boolean;
  /** Shows the "Visible on profile" checkbox in the bottom bar. */
  vis?: boolean;
  /** Offers the dashed "Share more in your own words" expander. */
  own?: boolean;
  skip?: boolean;
  opts?: string[];
};

/**
 * One question per step, Hinge-style. The app side of matching is collected
 * first (steps 3–13), then the person side (15–19).
 */
export const STEPS: Step[] = [
  { kind: 'welcome' },
  { kind: 'invite', title: 'Hey100 is invite-only right now' },
  {
    kind: 'check',
    title: "Let's start with your app. You don't need to get it perfect. We'll guide you as you go.",
  },
  { kind: 'link', title: 'Add your app' },
  { kind: 'media', title: 'Add up to 6 screenshots or videos', skip: true },
  {
    kind: 'pick',
    group: 'stage',
    single: true,
    vis: true,
    title: 'What stage is your app at?',
    opts: ['💡 Idea or prototype', '🧪 In beta or TestFlight', '🚀 Live', '💸 Live with revenue'],
  },
  {
    kind: 'pick',
    group: 'f',
    own: true,
    title: 'What feedback do you want most?',
    opts: ['Onboarding', 'UI and design', 'Pricing', 'Bugs', 'Retention', 'Marketing and copy'],
  },
  {
    kind: 'check',
    title: "Next: who's your app for? We'll match you with builders who'd actually use it.",
  },
  {
    kind: 'pick',
    group: 'ii',
    own: true,
    vis: true,
    title: 'Who are your ideal users?',
    opts: [
      '💑 In a couple',
      '👶 New parent',
      '🏠 Homeowner',
      '🎓 Student',
      '💼 Freelancer',
      '💰 Into budgeting',
      '📈 Investors',
      '🍳 Home cooks',
      '🏃 Runners',
      '⚡ Productivity nerds',
    ],
  },
  { kind: 'pick', group: 'ia', vis: true, title: 'How old are they?', opts: AGES },
  {
    kind: 'pick',
    group: 'ig',
    single: true,
    vis: true,
    title: 'Any gender focus?',
    opts: ['Anyone', 'Mostly women', 'Mostly men'],
  },
  {
    kind: 'pick',
    group: 'ip',
    vis: true,
    title: 'What devices are they on?',
    opts: ['📱 iPhone', '📲 Android', '💻 Mac', '🖥️ Windows', '🌐 Web'],
  },
  { kind: 'summary', title: "Here's a summary of your app so far." },
  { kind: 'prompts', title: "Pick prompts to tell your app's story", skip: true },
  { kind: 'check', title: "Now we'll ask about you, and the apps you'd be open to trying." },
  { kind: 'text', title: 'What keeps you busy these days?', skip: true },
  {
    kind: 'pick',
    group: 'look',
    own: true,
    vis: true,
    title: 'What are you looking for as a developer?',
    opts: [
      '🧪 Early users for my app',
      '🗣️ Honest feedback',
      '🤝 Builder friends',
      '🧑‍💻 A co-founder',
      '🚀 Launch support',
      '💡 Ideas and inspiration',
    ],
  },
  {
    kind: 'pick',
    group: 'cat',
    own: true,
    title: 'What apps would interest you?',
    opts: [
      '⚡ Productivity',
      '💰 Finance',
      '💪 Health & fitness',
      '🛠️ Dev tools',
      '🤖 AI tools',
      '🎮 Games',
      '☕ Food & drink',
      '👶 Parenting',
      '📚 Education',
      '🎵 Music',
    ],
  },
  {
    kind: 'pick',
    group: 'l',
    own: true,
    vis: true,
    title: 'What describes your life outside building?',
    opts: [
      '💑 In a couple',
      '👶 New parent',
      '🎓 Student',
      '💼 Freelancer',
      '🏠 Homeowner',
      '☕ Coffee',
      '🍳 Cooking',
      '🏃 Running',
      '💪 Fitness',
      '💰 Budgeting',
      '🎮 Gaming',
      '📚 Reading',
      '✈️ Travel',
      '🐶 Pets',
    ],
  },
  {
    kind: 'pick',
    group: 'd',
    vis: true,
    title: 'Which devices can you test on?',
    opts: ['📱 iPhone', '📲 Android', '💻 Mac', '🖥️ Windows', '⌚ Apple Watch', '🌐 Web'],
  },
  { kind: 'summary2', title: "Here's how some of what you share will appear." },
  { kind: 'username', title: 'Claim your username' },
  { kind: 'auth', title: 'Save your app page' },
];

export const LAST_STEP = STEPS.length - 1;

/** Steps 2–12 are reused by the "List another app" flow in the Apps tab. */
export const ADD_APP_RANGE = { first: 2, last: 12 } as const;

/** Any valid code works until invites are server-side. */
export const VALID_INVITE_CODES = ['HEY100', 'BUILD100', 'DIFF100'];

export const INVITERS: Record<string, string> = {
  HEY100: 'Jaryd',
  BUILD100: 'Nina Park',
  DIFF100: 'Omar Haddad',
};
