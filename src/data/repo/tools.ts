import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { getSupabase } from '@/lib/supabase';

import { queryKeys, staleTimes } from './keys';

export type SponsoredTool = {
  id: string;
  name: string;
  subtitle: string;
  url: string;
  logoUrl: string;
  category: string;
  createdAt: string;
  up: number;
  down: number;
  score: number;
  myVote: -1 | 1 | 0;
  threadCount: number;
  talkerCount: number;
  talkers: { name: string; photo?: string }[];
};

export const TOOL_CATEGORIES = [
  'Development',
  'Backend',
  'Messaging',
  'AI',
  'Design',
  'Monetization',
  'Growth',
  'Productivity',
  'Finance',
] as const;

const SEED: { name: string; subtitle: string; url: string; logoUrl: string; category: string; sort: number }[] = [
  { name: 'Xcode', subtitle: "Apple's IDE for building iOS apps.", url: 'https://developer.apple.com/xcode/', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain=developer.apple.com', category: 'Development', sort: 10 },
  { name: 'Simulator', subtitle: 'Runs iOS apps on virtual devices.', url: 'https://developer.apple.com/documentation/xcode/running-your-app-in-simulator-or-on-a-device', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain=developer.apple.com', category: 'Development', sort: 20 },
  { name: 'Android Studio', subtitle: 'The official IDE for Android.', url: 'https://developer.android.com/studio', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain=developer.android.com', category: 'Development', sort: 30 },
  { name: 'Firebase', subtitle: "Google's mobile app backend and analytics suite.", url: 'https://firebase.google.com/', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain=firebase.google.com', category: 'Development', sort: 40 },
  { name: 'Expo', subtitle: 'Framework for cross-platform React Native apps.', url: 'https://expo.dev', logoUrl: 'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/2fc01694-fd97-43b5-b74e-f0d510ba6704/expo.png?t=1779104706', category: 'Development', sort: 50 },
  { name: 'Supabase', subtitle: 'Open-source Postgres backend with auth & storage.', url: 'https://supabase.com/', logoUrl: 'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/33c85211-9f8b-497e-8d21-1ced71ddae40/icon.jpeg?t=1780885196', category: 'Backend', sort: 60 },
  { name: 'GitHub', subtitle: 'Code hosting, version control, and collaboration.', url: 'https://github.com', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain=github.com', category: 'Backend', sort: 70 },
  { name: 'Steel', subtitle: 'Browser infrastructure for AI agents.', url: 'https://www.steel.dev', logoUrl: 'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/b43f7502-6da5-4b39-af48-14d7190dfdae/logo.eba6ac6f.png?t=1780886360', category: 'Backend', sort: 80 },
  { name: 'Serper', subtitle: 'Fast Google Search API.', url: 'https://serper.dev/', logoUrl: 'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/561e3306-0404-454a-9748-18f3da5fbbbd/1709176631773.jpeg?t=1780886423', category: 'Backend', sort: 90 },
  { name: 'Vercel', subtitle: 'Hosting and deployment for web apps.', url: 'https://vercel.com', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain=vercel.com', category: 'Backend', sort: 100 },
  { name: 'Resend', subtitle: 'Developer-first transactional email API.', url: 'https://resend.com/', logoUrl: 'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/db2be608-d8c9-47b6-b188-b651a673955d/resend-icon-white.png?t=1780885332', category: 'Messaging', sort: 110 },
  { name: 'OneSignal', subtitle: 'Cross-platform push and in-app messaging.', url: 'https://www.onesignal.com', logoUrl: 'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/c05aa661-072c-4fb2-ab8f-b788ff4fa631/onesignal.png?t=1780885352', category: 'Messaging', sort: 120 },
  { name: 'Claude', subtitle: "Anthropic's AI assistant.", url: 'https://www.claude.com', logoUrl: 'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/904fb0d3-a24a-40a1-b6ba-ec8cb5a250d4/claude-ai-icon.webp?t=1780885545', category: 'AI', sort: 130 },
  { name: 'Cursor', subtitle: 'The AI-native code editor.', url: 'https://www.cursor.com', logoUrl: 'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/b525a5c5-3459-4b49-bd2a-5cbcbfdf10f0/0_zWCTHFNFdGAgSw2d.jpg?t=1780885285', category: 'AI', sort: 140 },
  { name: 'Tendem', subtitle: 'Human + AI working assistant by Toloka.', url: 'https://tendem.ai', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain=tendem.ai', category: 'AI', sort: 150 },
  { name: 'Granola', subtitle: 'AI notepad for meetings.', url: 'https://www.granola.ai', logoUrl: 'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/33b56535-bd17-4d53-bc02-d9ed57f0d1c2/nav-icon-ios-rebrand.png?t=1781887062', category: 'AI', sort: 160 },
  { name: 'Wispr Flow', subtitle: 'AI voice dictation for your computer.', url: 'https://wisprflow.ai', logoUrl: 'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/0bbf9216-7733-49fc-b18b-65c8386bcea3/68d427c7c5f98194a1c53c61_logo-symbol-dark.png?t=1780885361', category: 'AI', sort: 170 },
  { name: 'Quicker', subtitle: 'One inbox for all your DMs.', url: 'https://quicker.chat/', logoUrl: 'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/c496614a-b010-4f81-80bc-252ad8b3bede/image.png?t=1790858312', category: 'AI', sort: 180 },
  { name: 'Figma', subtitle: 'Collaborative design and prototyping.', url: 'https://www.figma.com', logoUrl: 'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/f8ce55a4-8b31-4a51-924c-a1ebe170715a/Screenshot_2026-06-07_at_10.37.14_PM.png?t=1780886259', category: 'Design', sort: 190 },
  { name: 'html.to.design', subtitle: 'Import any website into Figma.', url: 'https://html.to.design/', logoUrl: 'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/8ab12151-d939-4df4-a29e-617349ee9300/Screenshot_2026-06-07_at_10.26.59_PM.png?t=1780885634', category: 'Design', sort: 200 },
  { name: 'Descript', subtitle: 'Edit audio and video like a document.', url: 'https://www.descript.com', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain=descript.com', category: 'Design', sort: 210 },
  { name: 'Loom', subtitle: 'Async screen and video recording.', url: 'https://www.loom.com', logoUrl: 'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/36406a68-a325-4d68-b871-62b269235b66/9714361627859_75b15ab87e28ddf24bae_512.png?t=1780886127', category: 'Design', sort: 220 },
  { name: 'RevenueCat', subtitle: 'In-app subscription infrastructure.', url: 'https://www.revenuecat.com', logoUrl: 'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/9ae45500-d175-4963-923e-1f8d6c85ae9a/revenuecar.png?t=1780885056', category: 'Monetization', sort: 230 },
  { name: 'Stripe', subtitle: 'Online payments infrastructure.', url: 'https://stripe.com', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain=stripe.com', category: 'Monetization', sort: 240 },
  { name: 'PostHog', subtitle: 'Product analytics, replays, and flags.', url: 'https://posthog.com', logoUrl: 'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/f68d81c4-c780-4ad4-9482-3563cbf742ff/bltun1nd1o90zjbpyy3kli6cu03e.png?t=1780885166', category: 'Growth', sort: 250 },
  { name: 'beehiiv', subtitle: 'All-in-one newsletter platform.', url: 'https://www.beehiiv.com', logoUrl: 'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/0420cc7e-12f2-46af-909d-fbed27b01e7c/channels4_profile.jpg?t=1780885126', category: 'Growth', sort: 260 },
  { name: 'Attio', subtitle: 'The AI-native CRM.', url: 'https://attio.com', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain=attio.com', category: 'Growth', sort: 270 },
  { name: 'Passionfroot', subtitle: 'Sponsorship booking for creators.', url: 'https://www.passionfroot.me', logoUrl: 'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/31c5535e-ccca-48ab-b0f9-f50cf5ac3e36/passionfrootme_logo.jpeg?t=1780885472', category: 'Growth', sort: 280 },
  { name: 'Athyna', subtitle: 'Remote hiring of vetted global talent.', url: 'https://www.athyna.com', logoUrl: 'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/394ce64d-76cc-4673-a34f-ba9ecf4dd79f/images.jpeg?t=1780885456', category: 'Growth', sort: 290 },
  { name: 'Rezonant', subtitle: 'Agents product context across your apps.', url: 'https://www.rezonant.app', logoUrl: 'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/48542aee-53ab-491d-b9d4-be959e8c710b/Screenshot_2026-06-07_at_10.20.33_PM.png?t=1780885244', category: 'Productivity', sort: 300 },
  { name: 'Notion', subtitle: 'Docs, wikis, and project planning.', url: 'https://www.notion.so', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain=notion.so', category: 'Productivity', sort: 310 },
  { name: 'Superhuman', subtitle: 'The fastest email experience, with AI built in.', url: 'https://superhuman.com/', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain=superhuman.com', category: 'Productivity', sort: 320 },
  { name: 'Obsidian', subtitle: 'Local-first markdown notes.', url: 'https://obsidian.md/', logoUrl: 'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/a5aa20ad-3ee0-4e0f-9323-47eb847b8f69/9f1b5b46aed533f5386cf276ab2cdce48cbd2e25.png?t=1780886491', category: 'Productivity', sort: 330 },
  { name: 'LegalZoom', subtitle: 'Online legal and business setup.', url: 'https://www.legalzoom.com/', logoUrl: 'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/838b4051-c130-4aa0-9b0e-488d770d0435/images__1_.png?t=1780886172', category: 'Productivity', sort: 340 },
  { name: 'Betterment', subtitle: 'Automated investing and robo-advising.', url: 'https://www.betterment.com', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain=betterment.com', category: 'Finance', sort: 350 },
  { name: 'Monarch Money', subtitle: 'All-in-one personal finance tracker.', url: 'https://www.monarchmoney.com', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain=monarchmoney.com', category: 'Finance', sort: 360 },
];

const CATEGORY_BY_NAME: Record<string, string> = Object.fromEntries(
  SEED.map((tool) => [tool.name, tool.category]),
);

const FALLBACK: SponsoredTool[] = SEED.map((tool) => ({
  id: tool.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  name: tool.name,
  subtitle: tool.subtitle,
  url: tool.url,
  logoUrl: tool.logoUrl,
  category: tool.category,
  createdAt: '2026-01-01',
  up: 0,
  down: 0,
  score: 0,
  myVote: 0,
  threadCount: 0,
  talkerCount: 0,
  talkers: [],
}));

function toolsKey(userId: string | null) {
  return [...queryKeys.sponsoredTools, 'mine', userId] as const;
}

async function fetchVoteTallies(db: NonNullable<ReturnType<typeof getSupabase>>) {
  const scores = new Map<string, { up: number; down: number }>();
  const { data, error } = await db.rpc('sponsored_tool_vote_tallies');
  if (!error) {
    for (const row of data ?? []) {
      if (!row.tool_id) continue;
      scores.set(row.tool_id, { up: Number(row.up) || 0, down: Number(row.down) || 0 });
    }
    return scores;
  }

  const { data: votes } = await db.from('sponsored_tool_votes').select('tool_id, vote');
  for (const row of votes ?? []) {
    const next = scores.get(row.tool_id) ?? { up: 0, down: 0 };
    const value = voteValue(row.vote);
    if (value === 1) next.up += 1;
    if (value === -1) next.down += 1;
    scores.set(row.tool_id, next);
  }
  return scores;
}

function voteValue(vote: unknown): -1 | 1 | 0 {
  const value = Number(vote);
  if (value === 1) return 1;
  if (value === -1) return -1;
  return 0;
}

function applyVote(tool: SponsoredTool, vote: -1 | 1): SponsoredTool {
  const next: -1 | 1 | 0 = tool.myVote === vote ? 0 : vote;
  let up = tool.up;
  let down = tool.down;
  if (tool.myVote === 1) up -= 1;
  if (tool.myVote === -1) down -= 1;
  if (next === 1) up += 1;
  if (next === -1) down += 1;
  return { ...tool, up, down, score: up - down, myVote: next };
}

export function useSponsoredTools(): SponsoredTool[] {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const catalog = useQuery({
    queryKey: queryKeys.sponsoredTools,
    staleTime: staleTimes.heys,
    gcTime: 24 * 60 * 60 * 1000,
    placeholderData: (previous) => previous,
    queryFn: async (): Promise<SponsoredTool[]> => {
      const db = getSupabase();
      if (!db) return FALLBACK;

      const previous = queryClient.getQueryData<SponsoredTool[]>(queryKeys.sponsoredTools);
      const { data: rows, error } = await db
        .from('sponsored_tools')
        .select('id, name, subtitle, url, logo_url, sort_order, created_at, category')
        .eq('active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      if (!rows?.length) return FALLBACK;

      const [scores, { data: discussionRows }] = await Promise.all([
        fetchVoteTallies(db),
        (db as unknown as { rpc: (name: string) => Promise<{ data: unknown }> }).rpc(
          'sponsored_tool_discussion_counts',
        ),
      ]);
      const discussions = new Map<
        string,
        { threadCount: number; talkerCount: number; talkers: { name: string; photo?: string }[] }
      >();
      for (const row of (discussionRows ?? []) as {
        tool_id: string;
        thread_count?: number;
        talker_count?: number;
        talkers?: { name?: string; photo?: string | null }[];
      }[]) {
        discussions.set(row.tool_id, {
          threadCount: Number(row.thread_count) || 0,
          talkerCount: Number(row.talker_count) || 0,
          talkers: (row.talkers ?? [])
            .filter((person) => person.name)
            .map((person) => ({ name: person.name!, photo: person.photo ?? undefined })),
        });
      }

      return rows.map((row) => {
        const tally = scores.get(row.id) ?? { up: 0, down: 0 };
        const last = previous?.find((tool) => tool.id === row.id || tool.name === row.name);
        const discussion = discussions.get(row.id);
        return {
          id: row.id,
          name: row.name,
          subtitle: row.subtitle,
          url: row.url,
          logoUrl: row.logo_url,
          category: row.category || CATEGORY_BY_NAME[row.name] || 'Tools',
          createdAt: row.created_at ?? last?.createdAt ?? '',
          up: tally.up,
          down: tally.down,
          score: tally.up - tally.down,
          myVote: 0 as const,
          threadCount: discussion?.threadCount ?? last?.threadCount ?? 0,
          talkerCount: discussion?.talkerCount ?? last?.talkerCount ?? 0,
          talkers: discussion?.talkers ?? last?.talkers ?? [],
        };
      });
    },
  });

  const mine = useQuery({
    queryKey: toolsKey(userId),
    enabled: !!userId,
    staleTime: staleTimes.heys,
    queryFn: async (): Promise<Map<string, -1 | 1>> => {
      const db = getSupabase();
      const votes = new Map<string, -1 | 1>();
      if (!db || !userId) return votes;
      const { data } = await db
        .from('sponsored_tool_votes')
        .select('tool_id, vote')
        .eq('user_id', userId);
      for (const row of data ?? []) {
        const value = voteValue(row.vote);
        if (value) votes.set(row.tool_id, value);
      }
      return votes;
    },
  });

  return (catalog.data ?? FALLBACK).map((tool) => {
    const myVote = mine.data?.get(tool.id) ?? 0;
    return {
      ...tool,
      myVote,
      threadCount: tool.threadCount ?? 0,
      talkerCount: tool.talkerCount ?? 0,
      talkers: tool.talkers ?? [],
    };
  });
}

export async function ensureToolDiscussion(toolId: string, name?: string): Promise<string> {
  const db = getSupabase();
  if (!db) throw new Error('Sign in to discuss');
  const id = await resolveToolId(toolId, name);
  const { data, error } = await (db as unknown as {
    rpc: (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  }).rpc('ensure_tool_discussion', { p_tool_id: id });
  if (error || typeof data !== 'string') throw new Error(error?.message ?? 'Could not open the discussion');
  return data;
}

export function findSponsoredTool(tools: SponsoredTool[], id?: string | null): SponsoredTool | undefined {
  if (!id) return undefined;
  const needle = id.toLowerCase();
  return tools.find((tool) => tool.id === id || tool.name.toLowerCase() === needle);
}

async function resolveToolId(toolId: string, name: string | undefined): Promise<string> {
  if (/^[0-9a-f-]{36}$/i.test(toolId)) return toolId;
  const db = getSupabase();
  if (!db || !name) throw new Error('Votes are still loading');
  const { data, error } = await db.from('sponsored_tools').select('id').eq('name', name).maybeSingle();
  if (error || !data?.id) throw new Error('Could not find that tool');
  return data.id;
}

export function useVoteSponsoredTool() {
  const { userId, session } = useAuth();
  const queryClient = useQueryClient();
  const key = toolsKey(userId);

  return useMutation({
    mutationFn: async ({
      toolId,
      vote,
      name,
    }: {
      toolId: string;
      vote: -1 | 1;
      name?: string;
    }) => {
      const db = getSupabase();
      if (!db || !userId) throw new Error('Sign in to vote');
      if (session) {
        await db.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
      }

      const id = await resolveToolId(toolId, name);
      const current = (queryClient.getQueryData<SponsoredTool[]>(queryKeys.sponsoredTools) ?? []).find(
        (tool) => tool.id === toolId || tool.id === id || tool.name === name,
      );
      const mine = queryClient.getQueryData<Map<string, -1 | 1>>(key)?.get(id) ?? current?.myVote ?? 0;
      const next = mine === vote ? 0 : vote;
      const { error } = await db.rpc('vote_sponsored_tool', { p_tool_id: id, p_vote: next });
      if (error) {
        if (next === 0) {
          const { error: removeError } = await db
            .from('sponsored_tool_votes')
            .delete()
            .eq('tool_id', id)
            .eq('user_id', userId);
          if (removeError) throw error;
          return;
        }
        const { error: upsertError } = await db.from('sponsored_tool_votes').upsert(
          {
            tool_id: id,
            user_id: userId,
            vote: next,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'tool_id,user_id' },
        );
        if (upsertError) throw error;
      }
    },
    onMutate: async ({ toolId, vote, name }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.sponsoredTools });
      const previous = queryClient.getQueryData<SponsoredTool[]>(queryKeys.sponsoredTools);
      const previousMine = queryClient.getQueryData<Map<string, -1 | 1>>(key);
      const apply = (tools: SponsoredTool[] | undefined) =>
        (tools ?? FALLBACK)
          .map((tool) => {
            if (tool.id !== toolId && tool.name !== name) return tool;
            const current = previousMine?.get(tool.id) ?? 0;
            return applyVote({ ...tool, myVote: current }, vote);
          })
          .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
      queryClient.setQueryData<SponsoredTool[]>(queryKeys.sponsoredTools, apply);
      const nextMine = new Map(previousMine);
      const match = (previous ?? FALLBACK).find((tool) => tool.id === toolId || tool.name === name);
      if (match) {
        const current = previousMine?.get(match.id) ?? 0;
        const next: -1 | 1 | 0 = current === vote ? 0 : vote;
        if (next) nextMine.set(match.id, next);
        else nextMine.delete(match.id);
        queryClient.setQueryData(key, nextMine);
      }
      return { previous, previousMine };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.sponsoredTools, context.previous);
      if (context?.previousMine) queryClient.setQueryData(key, context.previousMine);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sponsoredTools });
    },
  });
}
