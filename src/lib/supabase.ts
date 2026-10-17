import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';

import { config, isSupabaseConfigured } from './config';

export type Db = SupabaseClient<Database>;

let client: Db | null = null;

/**
 * Null while the env vars are missing, which lets every repository fall back to
 * bundled mock data instead of crashing. Check `isSupabaseConfigured` when you
 * need to branch on it in UI.
 */
export function getSupabase(): Db | null {
  if (!isSupabaseConfigured) return null;

  if (!client) {
    client = createClient<Database>(config.supabaseUrl!, config.supabaseAnonKey!, {
      auth: {
        // React Native has no browser storage and never sees an OAuth code in a
        // URL; the session lives in AsyncStorage and arrives via deep link.
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'implicit',
      },
    });
  }

  return client;
}
