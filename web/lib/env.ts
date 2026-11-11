export function supabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
}

export function supabaseAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
}

export function posthogKey(): string {
  return process.env.NEXT_PUBLIC_POSTHOG_API_KEY ?? process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? '';
}

export function posthogHost(): string {
  return (
    process.env.NEXT_PUBLIC_POSTHOG_HOST ??
    process.env.EXPO_PUBLIC_POSTHOG_HOST ??
    'https://us.i.posthog.com'
  );
}
