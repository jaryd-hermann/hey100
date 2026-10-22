import 'react-native-url-polyfill/auto';
import '@/lib/secureStoreGuard';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';

import { config, isSupabaseConfigured } from './config';

export type Db = SupabaseClient<Database>;

declare global {
  // Survives Fast Refresh so a previous client's refresh timer can be stopped.
  // eslint-disable-next-line no-var
  var __hey100Supabase: Db | undefined;
  // eslint-disable-next-line no-var
  var __hey100SupabaseStorage: 'async' | undefined;
}

/**
 * Null while the env vars are missing, which lets every repository fall back to
 * bundled mock data instead of crashing. Check `isSupabaseConfigured` when you
 * need to branch on it in UI.
 */
export function getSupabase(): Db | null {
  if (!isSupabaseConfigured) return null;

  if (globalThis.__hey100Supabase && globalThis.__hey100SupabaseStorage !== 'async') {
    void globalThis.__hey100Supabase.auth.stopAutoRefresh();
    globalThis.__hey100Supabase = undefined;
  }

  if (!globalThis.__hey100Supabase) {
    globalThis.__hey100Supabase = createClient<Database>(config.supabaseUrl!, config.supabaseAnonKey!, {
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
    globalThis.__hey100SupabaseStorage = 'async';
  }

  return globalThis.__hey100Supabase;
}

/**
 * Both media buckets are public, so an image URL is just a string. Building it
 * here rather than calling getPublicUrl keeps the mappers free of the client.
 */
export function publicUrl(bucket: 'listing-media' | 'avatars', path: string): string {
  return `${config.supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

/**
 * Server rows carry a uuid. Bundled mock listings use short ids like `tide`,
 * and writes for those have to stay local.
 */
export function isServerId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
