import {
  INBOX,
  INCOMING_HEYS,
  INITIAL_MATCHES,
  INITIAL_MESSAGES,
  SENT_HEYS,
} from '@/data/mock';
import type { FeedbackEntry, InboxData, IncomingHey, Match, Message, SentHey } from '@/data/types';
import { useAuth } from '@/features/auth/AuthProvider';
import { useDevMode } from '@/lib/devMode';
import { useStore } from '@/store/AppStore';

function mergeById<T>(sample: T[], live: T[], id: (item: T) => string): T[] {
  const seen = new Set(live.map(id));
  return [...sample.filter((item) => !seen.has(id(item))), ...live];
}

/**
 * Sample heys, DMs and feedback for the admin's Dev mode toggle. Live rows
 * stay in front; bundled Cadence / Tidepool data only fills empty surfaces.
 */
export function useDevLoop() {
  const store = useStore();
  const { isAdmin } = useAuth();
  const { devMode } = useDevMode();
  const on = isAdmin && devMode;

  return {
    on,
    heys: on ? mergeById(INCOMING_HEYS, store.heys, (hey: IncomingHey) => hey.id) : store.heys,
    sentHeys: on ? mergeById(SENT_HEYS, store.sentHeys, (hey: SentHey) => hey.id) : store.sentHeys,
    matches: on ? mergeById(INITIAL_MATCHES, store.matches, (match: Match) => match.id) : store.matches,
    messages: (id: string): Message[] => {
      const live = store.messages[id] ?? [];
      if (!on) return live;
      const sample = INITIAL_MESSAGES[id];
      return live.length ? live : (sample ?? []);
    },
    inbox: (appId: string): InboxData | undefined => {
      const live = store.inbox[appId];
      if (live && (live.list?.length || live.responses)) return live;
      if (!on) return live;
      return INBOX[appId] ?? INBOX.tide;
    },
    responses: (appId: string): FeedbackEntry[] => {
      const data = store.inbox[appId];
      if (data?.list?.length) return data.list;
      if (!on) return data?.list ?? [];
      return (INBOX[appId] ?? INBOX.tide).list;
    },
  };
}
