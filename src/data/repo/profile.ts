import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfilePatch = Database['public']['Tables']['profiles']['Update'];

/**
 * The row is created by a database trigger the moment the account exists, so a
 * signed-in user always has one. Null here means signed out, not missing.
 */
export function useMyProfile() {
  const { userId } = useAuth();

  return useQuery({
    queryKey: ['profile', userId],
    enabled: !!userId,
    queryFn: async (): Promise<Profile | null> => {
      const db = getSupabase();
      if (!db || !userId) return null;

      const { data, error } = await db.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Column grants stop this writing plan, bonus_matches or referred_by even if a
 * patch asks it to, so the worst a bug here can do is corrupt the user's own
 * presentable fields.
 */
export async function updateMyProfile(userId: string, patch: ProfilePatch): Promise<void> {
  const db = getSupabase();
  if (!db) return;

  const { error } = await db.from('profiles').update(patch).eq('id', userId);
  if (error) throw error;
}
