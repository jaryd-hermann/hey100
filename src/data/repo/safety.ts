import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { getSupabase } from '@/lib/supabase';

import { queryKeys } from './keys';

export type ReportSubject = 'user' | 'listing' | 'message' | 'group' | 'community_message';

type SafetyStatus = { status: string; reason?: string };

async function rpc<T>(name: string, args?: object): Promise<T | null> {
  const db = getSupabase();
  if (!db) return null;
  const { data, error } = await (db.rpc as never as (
    n: string,
    a?: object,
  ) => Promise<{ data: unknown; error: { message: string } | null }>)(name, args);
  if (error) throw new Error(error.message);
  return (data ?? null) as T | null;
}

export async function fetchBlockedIds(): Promise<string[]> {
  return (await rpc<string[]>('my_blocked_ids')) ?? [];
}

export function useBlockedIds() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: queryKeys.blocked(userId),
    enabled: !!userId,
    queryFn: fetchBlockedIds,
    staleTime: 60 * 1000,
  });
}

export function blockUser(userId: string) {
  return rpc<SafetyStatus>('block_user', { p_user_id: userId });
}

export function unmatchUser(matchId: string) {
  return rpc<SafetyStatus>('unmatch_user', { p_match_id: matchId });
}

export function reportContent(input: {
  type: ReportSubject;
  id: string;
  reason: string;
  userId?: string | null;
}) {
  return rpc<SafetyStatus>('report_content', {
    p_subject_type: input.type,
    p_subject_id: input.id,
    p_reason: input.reason,
    p_subject_user_id: input.userId ?? null,
  });
}

export function deleteMyAccount() {
  return rpc<SafetyStatus>('delete_my_account');
}
