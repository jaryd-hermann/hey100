export type Stage = 'Idea' | 'TestFlight' | 'Live' | 'Revenue';

export type PromptTag = 'Product' | 'Audience' | 'Story' | 'Feedback';

export type Prompt = {
  id: string;
  tag: PromptTag;
  label: string;
};

export type IdealUsers = {
  age: string;
  gender: string;
  interests: string;
  plat: string;
  /** Feedback types the owner is asking for. */
  wants: string;
};

export type MediaItem = {
  /** Stand-in for the real asset until listings are fetched from the store. */
  label: string;
  video?: boolean;
};

/** A listing as shown in Discover, Heys, the owner preview and the web page. */
export type AppListing = {
  id: string;
  name: string;
  sub: string;
  cat: string;
  plat: string;
  stage: string;
  hue: number;
  builder: string;
  role: string;
  /** Feedback style plus reply time, shown on the builder card. */
  style: string;
  /** Band, not an exact number. */
  likes: string;
  trades: number;
  reply: string;
  /** The subtle "why you're seeing this" line under the header. */
  fit?: string;
  media: MediaItem[];
  prompts: [label: string, answer: string][];
  ideal: IdealUsers;
  badges: string[];
  links: [kind: string, value: string][];
  /** Unlocked only after a match. */
  code?: string;
  asked?: string;
};

/** One of the user's own listings. */
export type OwnedApp = AppListing & {
  views: number;
  matches: number;
  primary?: boolean;
  listedUntilDays?: number;
  /** Section order the owner can rearrange. */
  layout: SectionKey[];
};

export type SectionKey =
  | 'shots'
  | 'builder'
  | 'looking'
  | 'stats'
  | 'verified'
  | 'p0'
  | 'p1'
  | 'p2'
  | 'p3'
  | 'p4';

export type HeyTargetType = 'app' | 'prompt' | 'media';

/** An incoming hey in the Heys queue. */
export type IncomingHey = {
  id: string;
  appId: string;
  /** Which of the user's apps it was aimed at. */
  viaAppId: string;
  target: string;
  note: string;
};

export type TradeStatus = 'Not started' | 'Using' | 'Feedback sent';

export type Match = {
  id: string;
  appId: string;
  viaAppId: string;
  last: string;
  time: string;
  mine: TradeStatus;
  theirs: TradeStatus;
  /** Your turn to reply. */
  turn?: boolean;
  expiresInDays?: number;
  why?: string;
};

export type Message =
  | { kind: 'system'; body: string }
  | { kind: 'them'; body: string }
  | { kind: 'me'; body: string }
  | { kind: 'announcement'; body: string; when: string }
  | {
      kind: 'feedback';
      from: 'me' | 'them';
      stars: string;
      body: string;
      meta: string;
    };

export type FeedbackEntry = {
  id: string;
  who: string;
  app: string;
  hue: number;
  when: string;
  stars: string;
  text: string;
  confusion: string;
  keep: 'Yes' | 'Maybe' | 'No';
  /** Whether the giver agreed to their quote being used as a testimonial. */
  optIn: boolean;
  helpful?: 'yes' | 'no';
};

export type InboxData = {
  funnel: { views: string; skips: string; heys: string; ratio: string };
  responses: number;
  impression: string;
  price: string;
  yes: number;
  maybe: number;
  no: number;
  list: FeedbackEntry[];
};

export type IntegrationKey = 'github' | 'asc' | 'revenuecat' | 'stripe';

export type Integration = {
  key: IntegrationKey;
  name: string;
  letter: string;
  desc: string;
  /** Live value shown once connected. */
  on: string;
  detail?: string;
  badge: string;
};
