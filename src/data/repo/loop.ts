import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { serverDeckSort, useDeckSort } from '@/features/discover/deckSort';
import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

import { queryKeys, staleTimes } from './keys';
import type { AppRow, MediaRow } from './listings';

type Tables = Database['public']['Tables'];

export type BuilderRow = Database['public']['Views']['builders']['Row'];
export type MessageRow = Tables['messages']['Row'];

/** One prompt answer as the server returns it, with its question resolved. */
export type CardPrompt = {
  slot: number;
  prompt_id: string;
  label: string;
  tag: string;
  answer: string;
};

/** A listing with everything a card renders, from `app.listing_card`. */
export type ListingCard = {
  app: AppRow;
  media: MediaRow[];
  prompts: CardPrompt[];
  builder: BuilderRow | null;
  hey_count?: number;
};

export type HeyRow = {
  id: string;
  target: string;
  target_type: 'app' | 'prompt' | 'media';
  note: string | null;
  created_at: string;
  status?: 'pending' | 'passed' | 'matched';
  pass_reason?: string | null;
  follow_up: { note: string; at: string } | null;
  app_id: string;
  via_app_id: string;
  card: ListingCard | null;
};

export type ThreadRow = {
  match_id: string;
  reason: string | null;
  created_at: string;
  expires_at: string;
  last_message_at: string;
  hidden: boolean;
  trade_mine: 'Not started' | 'Using' | 'Feedback sent';
  trade_theirs: 'Not started' | 'Using' | 'Feedback sent';
  them: string;
  builder: BuilderRow | null;
  their_app: ListingCard | null;
  my_app: ListingCard | null;
  last_message: {
    kind: MessageRow['kind'];
    body: string | null;
    mine: boolean;
    created_at: string;
    media: number;
  } | null;
  unread: number;
  my_feedback_id: string | null;
};

export type FeedbackRow = {
  id: string;
  match_id: string;
  stars: number;
  summary: string;
  confusion: string | null;
  keep: 'Yes' | 'Maybe' | 'No' | null;
  opt_in: boolean;
  helpful: 'yes' | 'no' | null;
  best_moment: string | null;
  bug: string | null;
  bug_shot: string | null;
  price: string | null;
  created_at: string;
  from: BuilderRow | null;
};

/** Feedback on the owner's apps, keyed by app id. */
export type FeedbackByApp = Record<string, { heys: number; entries: FeedbackRow[] }>;

export type Counters = {
  plan: 'free' | 'pro';
  heys_today: number;
  /** Null on Pro, which is uncapped. */
  heys_left: number | null;
  matches: number;
  matches_left: number | null;
  bonus_matches: number;
};

/**
 * Every action returns a status rather than throwing, because a refusal is
 * usually a plan limit the client turns into a paywall, not an error.
 */
export type ActionResult = {
  status: 'sent' | 'matched' | 'passed' | 'blocked' | 'set' | 'unchanged' | 'hidden' | 'read';
  reason?: string;
  match_id?: string;
  hit_paywall?: boolean;
  message_id?: string;
  feedback_id?: string;
};

async function rpc<T>(
  name: keyof Database['public']['Functions'],
  args?: object,
): Promise<T | null> {
  const db = getSupabase();
  if (!db) return null;

  // The generated signature is per function; one helper for all of them needs
  // the cast, and each caller states the shape it expects back.
  const { data, error } = await (db.rpc as never as RpcCall)(name, args);
  if (error) throw error;
  return (data ?? null) as T | null;
}

type RpcCall = (
  name: string,
  args?: object,
) => Promise<{ data: unknown; error: { message: string } | null }>;

/* ---------------------------------------------------------------- */
/* Reads                                                            */
/* ---------------------------------------------------------------- */

export function useDeck() {
  const { userId } = useAuth();
  const sort = useDeckSort();

  return useQuery({
    queryKey: [...queryKeys.deck(userId), sort],
    enabled: !!userId,
    staleTime: staleTimes.deck,
    queryFn: async () =>
      (await rpc<ListingCard[]>('discover_deck', {
        p_limit: 40,
        p_sort: serverDeckSort(sort),
      })) ?? [],
  });
}

export function useHeys() {
  const { userId } = useAuth();

  return useQuery({
    queryKey: queryKeys.heys(userId),
    enabled: !!userId,
    staleTime: staleTimes.heys,
    queryFn: async () =>
      (await rpc<{ received: HeyRow[]; sent: HeyRow[] }>('my_heys')) ?? {
        received: [],
        sent: [],
      },
  });
}

export function useThreads() {
  const { userId } = useAuth();

  return useQuery({
    queryKey: queryKeys.threads(userId),
    enabled: !!userId,
    staleTime: staleTimes.threads,
    queryFn: async () => (await rpc<ThreadRow[]>('my_threads')) ?? [],
  });
}

export function useFeedbackInbox() {
  const { userId } = useAuth();

  return useQuery({
    queryKey: queryKeys.feedback(userId),
    enabled: !!userId,
    staleTime: staleTimes.feedback,
    queryFn: async () => (await rpc<FeedbackByApp>('my_feedback')) ?? {},
  });
}

export function useCounters() {
  const { userId } = useAuth();

  return useQuery({
    queryKey: queryKeys.counters(userId),
    enabled: !!userId,
    staleTime: staleTimes.counters,
    queryFn: async () => await rpc<Counters>('my_counters'),
  });
}

/** Messages in one thread, oldest first, which is the order they render in. */
export async function fetchMessages(matchId: string): Promise<MessageRow[]> {
  const db = getSupabase();
  if (!db) return [];

  const { data, error } = await db
    .from('messages')
    .select('*, chat_reactions!message_id(emoji, user_id), reply:reply_to(id, body)')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export function useMessages(matchId: string | null) {
  return useQuery({
    queryKey: queryKeys.messages(matchId),
    enabled: !!matchId && !!getSupabase(),
    staleTime: staleTimes.messages,
    queryFn: () => fetchMessages(matchId as string),
  });
}

/* ---------------------------------------------------------------- */
/* Actions                                                          */
/* ---------------------------------------------------------------- */

export type SayHeyArgs = {
  toAppId: string;
  fromAppId: string;
  targetType: 'app' | 'prompt' | 'media';
  target: string;
  note?: string;
};

export function sayHey({ toAppId, fromAppId, targetType, target, note }: SayHeyArgs) {
  return rpc<ActionResult>('say_hey', {
    p_to_app_id: toAppId,
    p_from_app_id: fromAppId,
    p_target_type: targetType,
    p_target_label: target,
    p_note: note ?? null,
  });
}

export function heyBack(heyId: string, fromAppId?: string) {
  return rpc<ActionResult>('hey_back', {
    p_hey_id: heyId,
    p_from_app_id: fromAppId ?? null,
  });
}

export function passHey(heyId: string, reason?: string) {
  return rpc<ActionResult>('pass_hey', {
    p_hey_id: heyId,
    p_reason: reason ?? null,
  });
}

export function followUpHey(heyId: string, note: string) {
  return rpc<ActionResult>('follow_up_hey', { p_hey_id: heyId, p_note: note });
}

export function sendMessage(matchId: string, body: string, media: object[] = [], replyTo?: string) {
  return rpc<ActionResult>('send_message', {
    p_match_id: matchId,
    p_body: body || null,
    p_media: media,
    p_reply_to: replyTo ?? null,
  });
}

export function setTradeStatus(matchId: string, status: string) {
  return rpc<ActionResult>('set_trade_status', {
    p_match_id: matchId,
    p_status: status,
  });
}

export function hideThread(matchId: string) {
  return rpc<ActionResult>('hide_thread', { p_match_id: matchId });
}

export function markThreadRead(matchId: string) {
  return rpc<ActionResult>('mark_thread_read', { p_match_id: matchId });
}

export type FeedbackArgs = {
  matchId: string;
  stars: number;
  summary: string;
  confusion?: string;
  keep?: string;
  optIn?: boolean;
  bestMoment?: string;
  bug?: string;
  /** Storage path of the bug screenshot, already uploaded. */
  bugShot?: string;
  price?: string;
};

export function leaveFeedback(args: FeedbackArgs) {
  return rpc<ActionResult>('leave_feedback', {
    p_match_id: args.matchId,
    p_stars: args.stars,
    p_summary: args.summary,
    p_confusion: args.confusion ?? null,
    p_keep: args.keep ?? null,
    p_opt_in: args.optIn ?? false,
    p_best_moment: args.bestMoment ?? null,
    p_bug: args.bug ?? null,
    p_bug_shot: args.bugShot ?? null,
    p_price: args.price ?? null,
  });
}

/** Passing in Discover is one row in one table, so it needs no function. */
export async function passApp(userId: string, appId: string, reason?: string): Promise<void> {
  const db = getSupabase();
  if (!db) return;

  const { error } = await db
    .from('passes')
    .upsert({ user_id: userId, app_id: appId, reason: reason ?? null });

  if (error) throw error;
}

/* ---------------------------------------------------------------- */
/* Demo builders                                                    */
/* ---------------------------------------------------------------- */

/**
 * Standing in for the other side while testing alone. Each of these only acts
 * for an account the server has flagged as a demo builder, and only toward the
 * caller, so there is nothing here that a real account can be made to do.
 */
export type DemoResult = { status: string; reason?: string; heys?: number };

export function demoHeyMe() {
  return rpc<DemoResult>('demo_hey_me');
}

export function demoReply(matchId: string, body?: string) {
  return rpc<DemoResult>('demo_reply', {
    p_match_id: matchId,
    p_body: body ?? null,
  });
}

export function demoFeedback(matchId: string) {
  return rpc<DemoResult>('demo_feedback', { p_match_id: matchId });
}

export async function rateFeedbackHelpful(
  feedbackId: string,
  helpful: 'yes' | 'no',
): Promise<void> {
  const db = getSupabase();
  if (!db) return;

  const { error } = await db.from('feedback').update({ helpful }).eq('id', feedbackId);
  if (error) throw error;
}
