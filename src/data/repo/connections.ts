import type { AppConnection, IntegrationKey } from '@/data/types';
import { getSupabase } from '@/lib/supabase';

export type ConnectStatus = {
  github: boolean;
  stripe: boolean;
  revenuecat: boolean;
  asc: boolean;
};

export type GithubRepo = {
  fullName: string;
  private: boolean;
  pushedAt: string;
};

export type RcProject = {
  id: string;
  name: string;
};

type ConnectBody = {
  action: string;
  appId?: string;
  repo?: string;
  url?: string;
  apiKey?: string;
  projectId?: string;
  projectName?: string;
  provider?: IntegrationKey;
};

async function invoke<T>(body: ConnectBody): Promise<T> {
  const db = getSupabase();
  if (!db) throw new Error('Supabase is not configured');
  const { data, error } = await db.functions.invoke<T & { error?: string }>('listing-connect', { body });
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(data.error);
  }
  if (error) {
    const response = (error as { context?: Response }).context;
    if (response) {
      try {
        const payload = (await response.json()) as { error?: string };
        if (payload.error) throw new Error(payload.error);
      } catch (inner) {
        if (inner instanceof Error && inner.message !== error.message) throw inner;
      }
    }
    throw new Error(error.message);
  }
  return data as T;
}

export function fetchConnectStatus() {
  return invoke<ConnectStatus>({ action: 'status' });
}

export async function listConnections(appId: string): Promise<Partial<Record<IntegrationKey, AppConnection>>> {
  const { connections } = await invoke<{
    connections: {
      provider: IntegrationKey;
      badge: string;
      label: string;
      detail?: string | null;
      checked_at?: string;
      snapshot?: { badges?: string[] };
    }[];
  }>({ action: 'list', appId });
  return Object.fromEntries(
    (connections ?? []).map((row) => {
      const badges = row.snapshot?.badges?.filter(Boolean);
      return [
        row.provider,
        {
          provider: row.provider,
          badge: row.badge,
          badges,
          on: row.label,
          detail: row.detail ?? undefined,
          checkedAt: row.checked_at,
        } satisfies AppConnection,
      ];
    }),
  );
}

export function startGithub(appId: string) {
  return invoke<{ url: string }>({ action: 'github_start', appId });
}

export function syncGithubProfile() {
  return invoke<{ url?: string; login?: string; commits?: number }>({ action: 'github_profile_sync' });
}

export function listGithubRepos(appId: string) {
  return invoke<{ repos: GithubRepo[] }>({ action: 'github_repos', appId });
}

export function selectGithubRepo(appId: string, repo: string) {
  return invoke<AppConnectionSnapshot>({ action: 'github_select', appId, repo });
}

export function verifyAppStore(appId: string, url: string) {
  return invoke<AppConnectionSnapshot>({ action: 'asc_verify', appId, url });
}

export function listRevenueCatProjects(appId: string, apiKey: string) {
  return invoke<{ projects: RcProject[] }>({ action: 'revenuecat_projects', appId, apiKey });
}

export function connectRevenueCat(appId: string, apiKey: string, projectId: string, projectName: string) {
  return invoke<AppConnectionSnapshot>({
    action: 'revenuecat_connect',
    appId,
    apiKey,
    projectId,
    projectName,
  });
}

export function connectStripe(appId: string, apiKey: string) {
  return invoke<AppConnectionSnapshot>({ action: 'stripe_connect', appId, apiKey });
}

export function disconnectProvider(appId: string, provider: IntegrationKey) {
  return invoke<{ ok: boolean }>({ action: 'disconnect', appId, provider });
}

export type AppConnectionSnapshot = {
  badge: string;
  badges?: string[];
  label: string;
  detail?: string;
  snapshot?: {
    rating?: number | null;
    rating_count?: number | null;
  };
};

export function snapshotToConnection(
  provider: IntegrationKey,
  snap: AppConnectionSnapshot,
): AppConnection {
  return {
    provider,
    badge: snap.badge,
    badges: snap.badges,
    on: snap.label,
    detail: snap.detail,
    checkedAt: new Date().toISOString(),
  };
}
