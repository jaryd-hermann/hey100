export type ListingCard = {
  app: {
    id: string;
    name: string;
    subtitle: string;
    description?: string | null;
    slug: string;
    hue: number;
    icon_path: string | null;
    cover_path: string | null;
    category?: string | null;
    platform?: string | null;
    stage?: string | null;
    problem_of?: string | null;
    problem_for?: string | null;
    pitch_path?: string | null;
    pitch_seconds?: number | null;
    store_url?: string | null;
    shot_layout?: string | null;
    feedback_wanted?: string[] | null;
    pricing_model?: string | null;
    price_from?: string | null;
    onboarding?: string | null;
    ideal_users?: { ages?: string[]; gender?: string; interests?: string[]; devices?: string[] } | null;
    layout?: string[] | null;
    owner_id: string;
  };
  media: { storage_path: string; kind: string; label?: string | null; position: number }[];
  prompts: { slot: number; label: string; answer: string }[];
  builder: {
    id?: string | null;
    real_name: string | null;
    username: string | null;
    photo_url: string | null;
    job: string | null;
    workplace: string | null;
  } | null;
};

export type Counters = {
  plan: 'free' | 'pro';
  heys_today: number;
  heys_left: number | null;
  matches: number;
  matches_left: number | null;
  bonus_matches: number;
};

export type ActionResult = {
  status: 'sent' | 'matched' | 'passed' | 'blocked' | string;
  reason?: string;
  match_id?: string;
  message_id?: string;
  hit_paywall?: boolean;
};

export type Me = {
  id: string;
  email: string | null;
  username: string | null;
  realName: string | null;
  photoUrl: string | null;
  job: string | null;
  plan: 'free' | 'pro';
  primaryAppId: string | null;
  primaryAppName: string | null;
  counters: Counters | null;
  karma: number;
  verified: boolean;
  isAdmin: boolean;
};

export type ThreadShare = {
  share_mine_url?: string | null;
  share_mine_code?: string | null;
  share_theirs_url?: string | null;
  share_theirs_code?: string | null;
  trade_mine?: string | null;
  trade_theirs?: string | null;
  my_feedback_id?: string | null;
};

export type HeyRow = {
  id: string;
  target: string;
  target_type: 'app' | 'prompt' | 'media';
  note: string | null;
  created_at: string;
  status?: 'pending' | 'passed' | 'matched';
  app_id: string;
  via_app_id?: string;
  card: ListingCard | null;
  match_id?: string | null;
};

export type ThreadRow = {
  match_id: string;
  created_at: string;
  last_message_at?: string;
  them: string;
  unread?: number;
  builder: {
    id?: string | null;
    real_name: string | null;
    username: string | null;
    photo_url: string | null;
    job?: string | null;
  } | null;
  their_app: ListingCard | null;
  my_app?: ListingCard | null;
  last_message: {
    kind?: string;
    body: string | null;
    mine: boolean;
    created_at: string;
  } | null;
  share_mine_url?: string | null;
  share_mine_code?: string | null;
  share_theirs_url?: string | null;
  share_theirs_code?: string | null;
  trade_mine?: string | null;
  trade_theirs?: string | null;
  my_feedback_id?: string | null;
};

export type ChatMessage = {
  id: string;
  body: string | null;
  kind?: string;
  mine: boolean;
  created_at: string;
  author_id?: string;
  media?: { storage_path: string; kind?: string; label?: string | null }[];
};

export type FeedbackEntry = {
  id: string;
  match_id?: string | null;
  stars: number;
  summary: string;
  confusion?: string | null;
  keep?: string | null;
  keep_why?: string | null;
  best_moment?: string | null;
  bug?: string | null;
  bug_shot?: string | null;
  bug_shots?: string[] | null;
  video_path?: string | null;
  price?: string | null;
  unlocked?: boolean;
  created_at: string;
  from?: {
    real_name?: string | null;
    username?: string | null;
    photo_url?: string | null;
  } | null;
};

export type FeedbackByApp = Record<
  string,
  { heys?: number; views?: number; skips?: number; entries: FeedbackEntry[] }
>;

export type ListingInsights = {
  views: number;
  likes: number;
  skips: number;
  liked_element?: string;
  pitch_watches?: number;
  pitch_completion?: number;
};

export type OwnedApp = {
  id: string;
  name: string;
  subtitle: string | null;
  slug: string | null;
  hue: number | null;
  icon_path: string | null;
  is_primary: boolean | null;
  created_at: string;
  description?: string | null;
  category?: string | null;
  platform?: string | null;
  stage?: string | null;
  store_url?: string | null;
  pitch_path?: string | null;
  pitch_seconds?: number | null;
  problem_of?: string | null;
  problem_for?: string | null;
  pricing_model?: string | null;
  price_from?: string | null;
  onboarding?: string | null;
  shot_layout?: string | null;
  layout?: string[] | null;
  feedback_wanted?: string[] | null;
  ideal_users?: { ages?: string[]; gender?: string; interests?: string[]; devices?: string[] } | null;
  badges?: string[] | null;
};

export function serverDeckSort(value: string): 'best_fit' | 'newest' | 'most_liked' {
  if (value === 'Newest') return 'newest';
  if (value === 'Most liked') return 'most_liked';
  return 'best_fit';
}
