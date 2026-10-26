const HOSTS = new Set(['hey100.com', 'www.hey100.com']);

const RESERVED = new Set([
  'i',
  'g',
  'l',
  'u',
  'badge',
  'api',
  'app',
  'invite',
  'group',
  'listing',
  'onboarding',
  'settings',
  'apple-app-site-association',
]);

/**
 * Universal links land as https://hey100.com/... . Rewrite them onto the
 * screens the app already has, so a share from Messages opens the listing,
 * invite, or group instead of a 404.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    const url = parse(path);
    if (!url || !HOSTS.has(url.hostname)) return path;

    const parts = url.pathname.split('/').filter(Boolean);
    const head = parts[0]?.toLowerCase();
    const rest = parts[1];

    if (head === 'i' && rest) return `/invite/${rest}`;
    if (head === 'g' && rest) return `/group/${rest}`;
    if (head === 'l' && rest) return `/l/${rest}`;
    if (head && !RESERVED.has(head) && !rest) return `/l/${head}`;

    return '/';
  } catch {
    return path;
  }
}

function parse(path: string): URL | null {
  if (path.startsWith('hey100://')) return null;
  if (path.includes('://')) return new URL(path);
  if (path.startsWith('/')) return new URL(path, 'https://hey100.com');
  return null;
}
