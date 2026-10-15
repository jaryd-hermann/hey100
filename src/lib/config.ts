import Constants from 'expo-constants';

/**
 * Release builds normally inline `EXPO_PUBLIC_*` via Babel, but some EAS paths
 * only populate `app.config.ts` → `extra`. Always read both.
 */
function read(key: string): string | undefined {
  const fromEnv = process.env[key];
  if (typeof fromEnv === 'string' && fromEnv.trim()) return fromEnv.trim();

  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const fromExtra = extra?.[key];
  if (typeof fromExtra === 'string' && fromExtra.trim()) return fromExtra.trim();

  return undefined;
}

export const config = {
  supabaseUrl: read('EXPO_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: read('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  posthogApiKey: read('EXPO_PUBLIC_POSTHOG_API_KEY'),
  posthogHost: read('EXPO_PUBLIC_POSTHOG_HOST') ?? 'https://us.i.posthog.com',
};

export const isSupabaseConfigured = Boolean(config.supabaseUrl && config.supabaseAnonKey);
export const isPostHogConfigured = Boolean(config.posthogApiKey?.startsWith('phc_'));

/** Names what is missing and how to fix it, loudly, in development only. */
export function warnOnMissingConfig(): void {
  if (!__DEV__) return;

  const missing: string[] = [];
  if (!config.supabaseUrl) missing.push('EXPO_PUBLIC_SUPABASE_URL');
  if (!config.supabaseAnonKey) missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  if (!config.posthogApiKey) missing.push('EXPO_PUBLIC_POSTHOG_API_KEY');

  if (missing.length) {
    console.warn(
      `[config] running on mock data — missing ${missing.join(', ')}.\n` +
        `Add them to .env.local (see .env.example), then for builds:\n` +
        `  eas env:create --name <KEY> --value '<value>' --type string ` +
        `--environment development --environment preview --environment production --scope project`,
    );
  }
}
