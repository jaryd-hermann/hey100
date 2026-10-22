import type {
  BuilderRow,
  Counters,
  FeedbackByApp,
  FeedbackRow,
  HeyRow,
  ListingCard,
  MessageRow,
  ThreadRow,
} from '@/data/repo/loop';
import type {
  AppListing,
  FeedbackEntry,
  InboxData,
  IncomingHey,
  Match,
  MediaItem,
  Message,
  SentHey,
  SentHeyStatus,
} from '@/data/types';
import { toOwnedApp } from '@/features/apps/mapListing';
import { groupReactions, type ReactionRow } from '@/features/chat/reactions';
import { socialsFromLinks } from '@/features/profile/builderCard';
import { publicUrl } from '@/lib/supabase';

/**
 * Server shapes to the shapes the screens already render.
 *
 * The screens were built against the bundled sample data, and that data is
 * still what the app falls back to without a backend, so this file is the one
 * place the two meet. Relative times are made here rather than stored, because
 * "2h" is a rendering of a timestamp, not a fact about it.
 */

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** `now`, `5m`, `2h`, `3d`, `2w` — the labels the chat and heys rows show. */
export function shortAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 2 * MINUTE) return 'now';
  if (ms < HOUR) return `${Math.round(ms / MINUTE)}m`;
  if (ms < DAY) return `${Math.round(ms / HOUR)}h`;
  if (ms < 7 * DAY) return `${Math.round(ms / DAY)}d`;
  return `${Math.round(ms / (7 * DAY))}w`;
}

function daysLeft(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / DAY));
}

/**
 * Section 4: Discover shows whichever of username or real name the builder
 * chose, and a real name is only readable at all once there is a match, which
 * the server decides. Chat prefers it because a match is what chat means.
 */
export function builderName(builder: BuilderRow | null, preferReal = false): string {
  if (!builder) return 'A builder';

  const real = builder.real_name?.trim();
  const handle = builder.username ? `@${builder.username}` : '';

  if (preferReal && real) return real;
  if (builder.display_pref === 'realName' && real) return real;
  return handle || real || 'A builder';
}

export function builderPhoto(builder: BuilderRow | null): string | undefined {
  return builder?.photo_url ?? undefined;
}

/** A listing card, as Discover, Heys and the trade sheet render it. */
export function cardToListing(card: ListingCard, preferRealName = false): AppListing {
  const labels = new Map(card.prompts.map((prompt) => [prompt.prompt_id, prompt.label]));

  const listing = toOwnedApp(
    { ...card.app, app_media: card.media, app_prompts: card.prompts },
    {
      builder: builderName(card.builder, preferRealName),
      promptLabel: (id) => labels.get(id) ?? id,
    },
  );

  const photo = builderPhoto(card.builder);
  const role = [card.builder?.job, card.builder?.workplace].filter(Boolean).join(' · ');
  const words = (card.builder?.own_words ?? {}) as Record<string, string>;
  const skills = card.builder?.skills ?? [];
  const socials = socialsFromLinks((card.builder?.links ?? {}) as Record<string, string>);

  return {
    ...listing,
    ...(photo ? { builderPhoto: photo } : {}),
    role: listing.role || role,
    style: listing.style || words.bio || '',
    ...(skills.length ? { skills } : {}),
    ...(socials.length ? { builderSocials: socials } : {}),
    ...((card.builder as { github_commits?: number | null } | null)?.github_commits != null
      ? { githubCommits: (card.builder as { github_commits?: number }).github_commits }
      : {}),
  };
}

export function heyToIncoming(row: HeyRow): IncomingHey {
  return {
    id: row.id,
    appId: row.app_id,
    viaAppId: row.via_app_id,
    target: row.target,
    note: row.note ?? '',
    ...(row.follow_up
      ? {
          followUp: {
            note: row.follow_up.note,
            when: shortAgo(row.follow_up.at),
          },
        }
      : {}),
  };
}

const SENT_STATUS: Record<string, SentHeyStatus> = {
  pending: 'Pending',
  passed: 'Passed',
  matched: 'Matched',
};

export function heyToSent(row: HeyRow): SentHey {
  return {
    id: row.id,
    appId: row.app_id,
    viaAppId: row.via_app_id,
    target: row.target,
    note: row.note ?? '',
    sentAt: new Date(row.created_at).getTime(),
    status: SENT_STATUS[row.status ?? 'pending'] ?? 'Pending',
    ...(row.pass_reason ? { passReason: row.pass_reason } : {}),
    ...(row.follow_up
      ? {
          followUp: {
            note: row.follow_up.note,
            sentAt: new Date(row.follow_up.at).getTime(),
          },
        }
      : {}),
  };
}

/** The one-line preview a chat row shows, from the server's last message. */
function threadPreviewLine(last: ThreadRow['last_message']): string {
  if (!last) return 'Say hi and swap test links.';

  if (last.kind === 'feedback') return last.mine ? 'You sent feedback' : 'Sent you feedback';
  if (last.body) return last.mine ? `You: ${last.body}` : last.body;

  const label = last.media > 1 ? `${last.media} attachments` : 'Attachment';
  return last.mine ? `You: ${label}` : label;
}

export function threadToMatch(row: ThreadRow): Match {
  return {
    id: row.match_id,
    appId: row.their_app?.app.id ?? row.match_id,
    viaAppId: row.my_app?.app.id ?? '',
    last: threadPreviewLine(row.last_message),
    time: shortAgo(row.last_message_at),
    mine: row.trade_mine,
    theirs: row.trade_theirs,
    // Their message is unanswered, so the reply is owed.
    ...(row.last_message && !row.last_message.mine ? { turn: true } : {}),
    expiresInDays: daysLeft(row.expires_at),
    ...(row.reason ? { why: row.reason } : {}),
    unread: row.unread,
  };
}

type MediaJson = { storage_path?: string; kind?: string; label?: string };

export function mediaFromJson(value: unknown): MediaItem[] {
  if (!Array.isArray(value)) return [];

  return (value as MediaJson[])
    .filter((item) => item.storage_path)
    .map((item) => ({
      label: item.label ?? '',
      video: item.kind === 'video',
      uri: publicUrl('listing-media', item.storage_path as string),
    }));
}

type MessageEmbed = MessageRow & {
  chat_reactions?: ReactionRow[] | null;
  reply?: { id: string; body: string | null } | null;
};

export function messageToMessage(row: MessageEmbed, me: string): Message {
  const mine = row.sender_id === me;
  const reactions = groupReactions(row.chat_reactions, me);
  const reply = row.reply?.id
    ? { id: row.reply.id, body: row.reply.body?.trim() || 'Attachment' }
    : undefined;
  const extra = {
    id: row.id,
    ...(reply ? { reply } : {}),
    ...(reactions.length ? { reactions } : {}),
  };

  if (row.kind === 'system') return { kind: 'system', body: row.body ?? '', ...extra };

  if (row.kind === 'announcement') {
    const media = mediaFromJson(row.media);
    return {
      kind: 'announcement',
      body: row.body ?? '',
      when: shortAgo(row.created_at),
      ...(media.length ? { media } : {}),
      ...extra,
    };
  }

  if (row.kind === 'feedback') {
    const meta = (row.feedback ?? {}) as {
      stars?: number;
      keep?: string;
      price?: string;
    };
    return {
      kind: 'feedback',
      from: mine ? 'me' : 'them',
      stars: `${meta.stars ?? 0}/5`,
      body: row.body ?? '',
      meta: [
        meta.keep ? `Keep using: ${meta.keep}` : null,
        meta.price ? `Fair price: ${meta.price}` : null,
      ]
        .filter(Boolean)
        .join(' · '),
      ...extra,
    };
  }

  const media = mediaFromJson(row.media);

  return {
    kind: mine ? 'me' : 'them',
    ...(row.body ? { body: row.body } : {}),
    ...(media.length ? { media } : {}),
    ...extra,
  };
}

function stars(entries: FeedbackRow[]): string {
  if (!entries.length) return '—';
  const total = entries.reduce((sum, entry) => sum + entry.stars, 0);
  return `${(total / entries.length).toFixed(1)}/5`;
}

/** The most common answer, which is what "fair price" means on the summary. */
function commonPrice(entries: FeedbackRow[]): string {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    if (entry.price) counts.set(entry.price, (counts.get(entry.price) ?? 0) + 1);
  }

  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return best?.[0] ?? '—';
}

function share(entries: FeedbackRow[], answer: 'Yes' | 'Maybe' | 'No'): number {
  const answered = entries.filter((entry) => entry.keep);
  if (!answered.length) return 0;
  return Math.round(
    (answered.filter((entry) => entry.keep === answer).length / answered.length) * 100,
  );
}

export function feedbackEntry(row: FeedbackRow, appName: string, hue: number): FeedbackEntry {
  return {
    id: row.id,
    matchId: row.match_id,
    // Feedback comes from a match, so the real name is readable and is what a
    // testimonial needs.
    who: builderName(row.from, true),
    app: appName,
    hue,
    when: shortAgo(row.created_at),
    stars: `${row.stars}/5`,
    text: row.summary,
    confusion: row.confusion ?? '—',
    keep: row.keep ?? 'Maybe',
    optIn: row.opt_in,
    ...(row.helpful ? { helpful: row.helpful } : {}),
  };
}

/**
 * Views and skips are listing stats, which are not collected yet, so they read
 * as an em dash rather than a made up number.
 */
export function feedbackToInbox(
  byApp: FeedbackByApp,
  appName: (appId: string) => string,
  appHue: (appId: string) => number,
): Record<string, InboxData> {
  return Object.fromEntries(
    Object.entries(byApp)
      // An app with no reviews gets the screen's empty state rather than a
      // summary of nothing.
      .filter(([, { entries }]) => entries.length > 0)
      .map(([appId, { heys, entries }]) => [
        appId,
        {
          funnel: { views: '—', skips: '—', heys: String(heys), ratio: '—' },
          responses: entries.length,
          impression: stars(entries),
          price: commonPrice(entries),
          yes: share(entries, 'Yes'),
          maybe: share(entries, 'Maybe'),
          no: share(entries, 'No'),
          list: entries.map((entry) => feedbackEntry(entry, appName(appId), appHue(appId))),
        } satisfies InboxData,
      ]),
  );
}

export function countersToStore(counters: Counters | null): {
  plan: 'free' | 'pro';
  heysLeftToday: number;
} | null {
  if (!counters) return null;

  return {
    plan: counters.plan,
    // Pro is uncapped; the screens read the plan for that, so any number here
    // is only a fallback for the free counter.
    heysLeftToday: counters.heys_left ?? 99,
  };
}
