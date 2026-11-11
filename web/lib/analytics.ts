'use client';

import posthog from 'posthog-js';

import { posthogHost, posthogKey } from '@/lib/env';

let booted = false;

export function initAnalytics(): void {
  const key = posthogKey();
  if (booted || !key.startsWith('phc_') || typeof window === 'undefined') return;
  posthog.init(key, {
    api_host: posthogHost(),
    capture_pageview: true,
    persistence: 'localStorage+cookie',
  });
  posthog.register({ platform: 'web' });
  booted = true;
}

export function captureEvent(
  event: string,
  properties?: Record<string, string | number | boolean | null | undefined>,
): void {
  if (!booted) initAnalytics();
  const clean: Record<string, string | number | boolean | null> = { platform: 'web' };
  for (const [key, value] of Object.entries(properties ?? {})) {
    if (value !== undefined) clean[key] = value;
  }
  posthog.capture(event, clean);
}

export function identifyUser(userId: string): void {
  if (!booted) initAnalytics();
  posthog.identify(userId);
}

export function resetAnalytics(): void {
  if (!booted) return;
  posthog.reset();
}
