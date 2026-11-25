import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { getSupabase } from '@/lib/supabase';
import type { Tables } from '@/types/supabase';

export type Plan = 'none' | 'member' | 'pro' | 'ultimate';

export type RevenueSummary = {
  provider: 'stripe' | 'revenuecat' | 'github';
  status: 'pending' | 'verified' | 'failed' | 'disconnected';
  band_id: string | null;
  mrr_cents: number | null;
  subscriptions: number | null;
  commits_90d: number | null;
  verified_at: string | null;
  grace_until: string | null;
  error: string | null;
};

export type Entitlements = {
  weekly_peeks_total: number;
  weekly_peeks_used: number;
  peek_credits: number;
  /** Bands above yours a peek may reach; null means any (Ultimate). */
  peek_band_range: number | null;
  can_eavesdrop: boolean;
  /** TLDR asks per month; null means unlimited. */
  asks_total: number | null;
  asks_used: number;
  category_changes_left: number;
};

/** Everything the shell needs about the signed-in user, from `public.me()`. */
export type Me = {
  profile: Omit<Tables<'profiles'>, 'notification_prefs'> & { plan: Plan };
  notification_prefs: Record<string, boolean>;
  product: Tables<'products'> | null;
  revenue: RevenueSummary | null;
  band_id: string | null;
  plan: Plan;
  primary_group_id: string | null;
  invite_code: string | null;
  entitlements: Entitlements;
};

export const ME_KEY = ['me'] as const;

export function useMe() {
  const { userId } = useAuth();

  return useQuery({
    queryKey: [...ME_KEY, userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Me | null> => {
      const db = getSupabase();
      if (!db) return null;
      const { data, error } = await db.rpc('me');
      if (error) throw error;
      return data as unknown as Me | null;
    },
  });
}

export function useRefreshMe() {
  const queryClient = useQueryClient();
  return useCallback(() => queryClient.invalidateQueries({ queryKey: ME_KEY }), [queryClient]);
}

/** Where a signed-in user should be: the next onboarding step, the paywall, or the app. */
export function nextRoute(me: Me): '/onboarding' | '/paywall' | '/(tabs)/chats' {
  if (!me.profile.onboarded_at) return '/onboarding';
  if (me.plan === 'none') return '/paywall';
  return '/(tabs)/chats';
}
