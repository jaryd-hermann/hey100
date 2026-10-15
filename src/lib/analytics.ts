import PostHog from 'posthog-react-native';

import { config, isPostHogConfigured } from './config';

let client: PostHog | null = null;

/**
 * One shared client. Letting `PostHogProvider` build its own would split
 * `identify()` and custom events across two clients and silently break funnels.
 */
export function getPostHog(): PostHog | null {
  if (!isPostHogConfigured) return null;
  if (client) return client;

  try {
    client = new PostHog(config.posthogApiKey!, {
      host: config.posthogHost,
      captureAppLifecycleEvents: true,
      enableSessionReplay: true,
      sessionReplayConfig: { maskAllTextInputs: true, maskAllImages: true },
      enablePersistSessionIdAcrossRestart: true,
    });
    return client;
  } catch (error) {
    console.error('[analytics] init failed:', error);
    return null;
  }
}

export type EventProperties = Record<string, string | number | boolean | null | undefined>;

/** PostHog's property type rejects `undefined`, so drop those keys. */
function clean(properties?: EventProperties): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(properties ?? {})) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

export function captureEvent(event: string, properties?: EventProperties): void {
  try {
    getPostHog()?.capture(event, clean(properties));
  } catch (error) {
    console.warn('[analytics] capture failed:', error);
  }
}

export function identifyUser(userId: string, properties?: EventProperties): void {
  try {
    getPostHog()?.identify(userId, clean(properties));
  } catch (error) {
    console.warn('[analytics] identify failed:', error);
  }
}

export function resetAnalytics(): void {
  try {
    getPostHog()?.reset();
  } catch (error) {
    console.warn('[analytics] reset failed:', error);
  }
}
