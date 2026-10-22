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
};

export const TOOL_CATEGORIES = [
  'Development',
  'Monetization',
  'Backend',
  'Messaging',
  'Productivity',
  'CRM',
] as const;

const CATEGORY_BY_NAME: Record<string, string> = {
  Expo: 'Development',
  Cursor: 'Development',
  Supabase: 'Backend',
  RevenueCat: 'Monetization',
  Resend: 'Messaging',
  OneSignal: 'Messaging',
  Granola: 'Productivity',
  Attio: 'CRM',
};

const FALLBACK: SponsoredTool[] = [
  {
    id: 'expo',
    name: 'Expo',
    subtitle: 'Ship iOS and Android from one codebase',
    url: 'https://expo.dev',
    logoUrl: 'https://avatars.githubusercontent.com/u/12504344?s=128',
    category: 'Development',
    createdAt: '2026-01-01',
    up: 0,
    down: 0,
    score: 0,
    myVote: 0,
  },
  {
    id: 'revenuecat',
    name: 'RevenueCat',
    subtitle: 'Subscriptions and in-app purchases',
    url: 'https://www.revenuecat.com',
    logoUrl: 'https://avatars.githubusercontent.com/u/31720269?s=128',
    category: 'Monetization',
    createdAt: '2026-01-02',
    up: 0,
    down: 0,
    score: 0,
    myVote: 0,
  },
  {
    id: 'granola',
    name: 'Granola',
    subtitle: 'AI notepad for meetings',
    url: 'https://www.granola.ai',
    logoUrl: 'https://www.granola.ai/favicon.ico',
    category: 'Productivity',
    createdAt: '2026-01-03',
    up: 0,
    down: 0,
    score: 0,
    myVote: 0,
  },
  {
    id: 'attio',
    name: 'Attio',
    subtitle: 'CRM for founders who live in their inbox',
    url: 'https://attio.com',
    logoUrl: 'https://attio.com/favicon.ico',
    category: 'CRM',
    createdAt: '2026-01-04',
    up: 0,
    down: 0,
    score: 0,
    myVote: 0,
  },
  {
    id: 'onesignal',
    name: 'OneSignal',
    subtitle: 'Push, email and in-app messages',
    url: 'https://onesignal.com',
    logoUrl: 'https://avatars.githubusercontent.com/u/5955002?s=128',
    category: 'Messaging',
    createdAt: '2026-01-05',
    up: 0,
    down: 0,
    score: 0,
    myVote: 0,
  },
  {
    id: 'resend',
    name: 'Resend',
    subtitle: 'Email API for developers',
    url: 'https://resend.com',
    logoUrl: 'https://avatars.githubusercontent.com/u/109384852?s=128',
    category: 'Messaging',
    createdAt: '2026-01-06',
    up: 0,
    down: 0,
    score: 0,
    myVote: 0,
  },
  {
    id: 'supabase',
    name: 'Supabase',
    subtitle: 'Postgres, auth and storage',
    url: 'https://supabase.com',
    logoUrl: 'https://avatars.githubusercontent.com/u/54469796?s=128',
    category: 'Backend',
    createdAt: '2026-01-07',
    up: 0,
    down: 0,
    score: 0,
    myVote: 0,
  },
  {
    id: 'cursor',
    name: 'Cursor',
    subtitle: 'The AI code editor',
    url: 'https://cursor.com',
    logoUrl: 'https://www.cursor.com/favicon.ico',
    category: 'Development',
    createdAt: '2026-01-08',
    up: 0,
    down: 0,
    score: 0,
    myVote: 0,
  },
];

function toolsKey(userId: string | null) {
  return [...queryKeys.sponsoredTools, userId] as const;
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

  const { data } = useQuery({
    queryKey: toolsKey(userId),
    staleTime: staleTimes.heys,
    gcTime: 24 * 60 * 60 * 1000,
    placeholderData: (previous) => previous,
    queryFn: async (): Promise<SponsoredTool[]> => {
      const db = getSupabase();
      if (!db) return FALLBACK;

      const previous = queryClient.getQueryData<SponsoredTool[]>(toolsKey(userId));
      const { data: rows, error } = await db
        .from('sponsored_tools')
        .select('id, name, subtitle, url, logo_url, sort_order, created_at, category')
        .eq('active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      if (!rows?.length) return FALLBACK;

      const { data: votes } = await db.from('sponsored_tool_votes').select('tool_id, user_id, vote');

      const tallies = new Map<string, { up: number; down: number; mine: -1 | 1 | 0 }>();
      for (const row of votes ?? []) {
        const next = tallies.get(row.tool_id) ?? { up: 0, down: 0, mine: 0 as const };
        const value = voteValue(row.vote);
        if (value === 1) next.up += 1;
        if (value === -1) next.down += 1;
        if (userId && row.user_id === userId && value) next.mine = value;
        tallies.set(row.tool_id, next);
      }

      return rows.map((row) => {
        const tally = tallies.get(row.id) ?? { up: 0, down: 0, mine: 0 as const };
        const last = previous?.find((tool) => tool.id === row.id || tool.name === row.name);
        const mine = tally.mine || last?.myVote || 0;
        let up = tally.up;
        let down = tally.down;
        if (!tally.mine && last?.myVote === 1 && !up) up = 1;
        if (!tally.mine && last?.myVote === -1 && !down) down = 1;
        return {
          id: row.id,
          name: row.name,
          subtitle: row.subtitle,
          url: row.url,
          logoUrl: row.logo_url,
          category: row.category || CATEGORY_BY_NAME[row.name] || 'Tools',
          createdAt: row.created_at ?? last?.createdAt ?? '',
          up,
          down,
          score: up - down,
          myVote: mine,
        };
      });
    },
  });

  return data ?? FALLBACK;
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
      const current = (queryClient.getQueryData<SponsoredTool[]>(key) ?? []).find(
        (tool) => tool.id === toolId || tool.id === id || tool.name === name,
      );
      const next = current?.myVote === vote ? 0 : vote;
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
      const previous = queryClient.getQueryData<SponsoredTool[]>(key);
      const apply = (tools: SponsoredTool[] | undefined) =>
        (tools ?? FALLBACK)
          .map((tool) =>
            tool.id === toolId || tool.name === name ? applyVote(tool, vote) : tool,
          )
          .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
      queryClient.setQueryData<SponsoredTool[]>(key, apply);
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sponsoredTools });
    },
  });
}
