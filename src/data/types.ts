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
  /** Absent until a real upload exists, so renderers fall back to the placeholder. */
  uri?: string;
};

/** A shot straight out of the picker, before it has been uploaded. */
export type PickedShot = {
  /** Local file uri. */
  uri: string;
  kind: 'image' | 'video';
  /** Caption shown under the shot on the listing. */
  label?: string;
};

/** Every screenshot in one listing shares an orientation, picked by the owner. */
export type ShotLayout = 'vertical' | 'horizontal';

/**
 * Frame shape per orientation, both taken from App Store Connect: an iPhone
 * screenshot at 1290 × 2796 and a Mac one at 2880 × 1800. The screenshots a
 * builder already made for their own listing fill the frame, rather than being
 * cropped to a shape only this app uses.
 */
export const SHOT_RATIO: Record<ShotLayout, number> = {
  vertical: 1290 / 2796,
  horizontal: 2880 / 1800,
};

/** A listing as shown in Discover, Heys, the owner preview and the web page. */
export type AppListing = {
  id: string;
  /** Server-allocated, and what the share link and web page use. */
  slug?: string;
  name: string;
  sub: string;
  cat: string;
  plat: string;
  stage: string;
  hue: number;
  /** The real app icon, once one has been fetched or uploaded. */
  icon?: string;
  builder: string;
  /** The builder's profile photo, once they have one. */
  builderPhoto?: string;
  role: string;
  /** Bio shown under the name on the builder card. */
  style: string;
  /** Skills shown as tags under the bio. */
  skills?: string[];
  /** Public socials from the builder's profile, not the listing links. */
  builderSocials?: [string, string][];
  /** Horizontal banner, separate from the screenshot carousel. */
  cover?: string;
  /** Band, not an exact number. */
  likes: string;
  trades: number;
  reply: string;
  /** The subtle "why you're seeing this" line under the header. */
  fit?: string;
  media: MediaItem[];
  /** Carousel orientation for every item in `media`. */
  shotLayout: ShotLayout;
  prompts: [label: string, answer: string][];
  ideal: IdealUsers;
  badges: string[];
  links: [kind: string, value: string][];
  /** Unlocked only after a match. */
  code?: string;
  asked?: string;
  /** “This solves the problem of X for Y.” */
  problemOf?: string;
  problemFor?: string;
  pricingModel?: string;
  priceFrom?: string;
  onboarding?: string;
  storeRating?: number;
  storeRatingCount?: number;
  /** App Store listing URL used to pull the public rating. */
  storeUrl?: string;
  /** Public GitHub commit total for this builder, across their repos. */
  githubCommits?: number;
  /** Vertical elevator-pitch video from the builder. */
  pitchUri?: string;
  pitchSeconds?: number;
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
  | 'problem'
  | 'pricing'
  | 'onboarding'
  | 'pitch'
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

export const PASS_REASONS = [
  'Not my audience',
  'Already use something similar',
  'Not a category I test',
  'Listing looks unfinished',
  'Something else',
] as const;
export type PassReason = (typeof PASS_REASONS)[number];

/** An incoming hey in the Heys queue. */
export type IncomingHey = {
  id: string;
  appId: string;
  /** Which of the user's apps it was aimed at. */
  viaAppId: string;
  target: string;
  note: string;
  /** A second note from the sender, shown under the first as "Very interested". */
  followUp?: { note: string; when: string };
};

export type SentHeyStatus = 'Pending' | 'Passed' | 'Matched';

/** A hey the user sent. Sent heys are what the Sent tab lists. */
export type SentHey = {
  id: string;
  /** The listing they heyed. */
  appId: string;
  /** Which of the user's apps it was sent from. */
  viaAppId: string;
  target: string;
  note: string;
  /** Epoch ms; the follow-up only unlocks 24h after this. */
  sentAt: number;
  status: SentHeyStatus;
  /** Only set when the other side passed. */
  passReason?: string;
  followUp?: { note: string; sentAt: number };
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
  /** Unread messages waiting in this thread. */
  unread?: number;
};

export type MessageReaction = { emoji: string; count: number; mine: boolean };

export type MessageReply = { id: string; body: string };

export type ChatMessage = {
  id?: string;
  reply?: MessageReply;
  reactions?: MessageReaction[];
};

export type Message =
  | ({ kind: 'system'; body: string } & ChatMessage)
  /** `body` is absent on a media-only message. */
  | ({ kind: 'them'; body?: string; media?: MediaItem[] } & ChatMessage)
  | ({ kind: 'me'; body?: string; media?: MediaItem[] } & ChatMessage)
  | ({ kind: 'announcement'; body: string; when: string; media?: MediaItem[] } & ChatMessage)
  | ({
      kind: 'feedback';
      from: 'me' | 'them';
      stars: string;
      body: string;
      meta: string;
    } & ChatMessage);

export type FeedbackEntry = {
  id: string;
  /** The thread it came from, so the card can open it. */
  matchId?: string;
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

/** A verified connection as the listing and the owner screens render it. */
export type AppConnection = {
  provider: IntegrationKey;
  badge: string;
  /** Public listing rows from one connect. RevenueCat can fill several. */
  badges?: string[];
  on: string;
  detail?: string;
  checkedAt?: string;
};
