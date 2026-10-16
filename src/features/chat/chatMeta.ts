import type { Message } from '@/data/types';

/** The founder thread. It sorts with the match rows rather than being pinned. */
export const TEAM_ID = 'team';

const UNITS: Record<string, number> = { m: 1, h: 60, d: 1440, w: 10080 };

/** Minutes behind now for a relative label like `2h`, so rows can be sorted. */
export function timeRank(time: string): number {
  const label = time.trim().toLowerCase();
  if (!label) return Number.MAX_SAFE_INTEGER;
  if (label === 'now') return 0;

  const parsed = /^(\d+)\s*([mhdw])/.exec(label);
  if (!parsed) return Number.MAX_SAFE_INTEGER;

  return Number(parsed[1]) * UNITS[parsed[2]];
}

/** The one-line summary a chat row shows for its newest message. */
export function previewText(message: Message): string {
  if (message.kind === 'feedback') {
    return message.from === 'me' ? 'You sent feedback' : 'Sent you feedback';
  }

  const body = 'body' in message ? message.body : undefined;
  if (body) return message.kind === 'me' ? `You: ${body}` : body;

  const count = 'media' in message && message.media ? message.media.length : 0;
  const label = count > 1 ? `${count} attachments` : 'Attachment';
  return message.kind === 'me' ? `You: ${label}` : label;
}

/**
 * The Team thread has no `Match` record, so its row reads straight from the
 * messages: it is current once the user writes in, and quiet otherwise.
 */
export function threadPreview(messages: Message[]): { last: string; time: string } {
  const last = messages[messages.length - 1];
  if (!last) return { last: 'Bugs, ideas, anything annoying you.', time: '' };

  return { last: previewText(last), time: last.kind === 'me' ? 'now' : '2d' };
}

/** `Jaryd · founder of Hey100` is one person, so the avatar is one initial. */
export function avatarName(builder: string): string {
  return builder.split('·')[0].trim() || builder;
}

/** First name only, for menu labels like "Lena's profile". */
export function firstName(builder: string): string {
  return avatarName(builder).split(/\s+/)[0];
}
