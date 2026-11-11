import type { FeedbackByApp, ThreadRow } from '@/lib/loop';

const ago = (hours: number) => new Date(Date.now() - hours * 3600_000).toISOString();

export const SAMPLE_INBOX: FeedbackByApp = {
  sample: {
    heys: 38,
    views: 412,
    skips: 274,
    entries: [
      {
        id: 'sample-nina',
        match_id: 'sample-match-nina',
        stars: 5,
        summary: 'The swell chart is clear. I got lost finding saved spots.',
        confusion: 'Where saved spots live',
        keep: 'Yes',
        keep_why: 'I would open it before a session if saved spots were on the home screen.',
        best_moment: 'The swell chart updating live.',
        bug: 'Saved spots are buried under Profile → Places.',
        bug_shots: [
          'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80',
          'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=400&q=80',
        ],
        video_path: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        price: '$3.99',
        unlocked: true,
        created_at: ago(48),
        from: { real_name: 'Nina Park', username: 'nina', photo_url: null },
      },
      {
        id: 'sample-sam',
        match_id: 'sample-match-sam',
        stars: 4,
        summary: 'Onboarding asks for location before showing any value.',
        confusion: 'Why location first',
        keep: 'Maybe',
        bug_shots: ['https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&q=80'],
        unlocked: false,
        created_at: ago(96),
        from: { real_name: 'Sam Ortiz', username: 'sam', photo_url: null },
      },
      {
        id: 'sample-lena',
        match_id: 'sample-match-lena',
        stars: 4,
        summary: 'Calm and clear. I wanted to invite my partner sooner.',
        confusion: 'Partner invite is buried in settings',
        keep: 'Yes',
        best_moment: 'The Sunday summary reading like a letter.',
        video_path: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        price: '$3–5',
        unlocked: true,
        created_at: ago(2),
        from: { real_name: 'Lena Vogel', username: 'lena', photo_url: null },
      },
    ],
  },
};

export function sampleThread(matchId: string): ThreadRow | null {
  const entry = SAMPLE_INBOX.sample.entries.find((row) => row.match_id === matchId);
  if (!entry) return null;
  const name = entry.from?.real_name || 'A builder';
  return {
    match_id: matchId,
    created_at: entry.created_at,
    them: entry.from?.username ?? matchId,
    builder: {
      real_name: name,
      username: entry.from?.username ?? null,
      photo_url: entry.from?.photo_url ?? null,
      job: 'Builder',
    },
    their_app: null,
    last_message: {
      kind: 'text',
      body: entry.summary,
      mine: false,
      created_at: entry.created_at,
    },
  };
}

export function sampleMessages(matchId: string) {
  const entry = SAMPLE_INBOX.sample.entries.find((row) => row.match_id === matchId);
  if (!entry) return [];
  const media = [
    ...(entry.bug_shots ?? []).map((path) => ({ storage_path: path, kind: 'image' as const })),
    ...(entry.video_path ? [{ storage_path: entry.video_path, kind: 'video' as const }] : []),
  ];
  return [
    {
      id: `${matchId}-fb`,
      body: entry.summary,
      kind: 'text',
      mine: false,
      created_at: entry.created_at,
      media,
    },
  ];
}
