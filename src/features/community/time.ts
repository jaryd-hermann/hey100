export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function shortWhen(iso?: string): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 2 * MINUTE) return 'now';
  if (ms < HOUR) return `${Math.round(ms / MINUTE)}m`;
  if (ms < DAY) return `${Math.round(ms / HOUR)}h`;
  if (ms < 7 * DAY) return `${Math.round(ms / DAY)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Last-active bands on the group preview: Now / 2hrs / 1 day ago. */
export function lastActiveLabel(iso?: string): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < HOUR) return 'Now';
  if (ms < DAY) {
    const hours = Math.max(1, Math.round(ms / HOUR));
    return hours === 1 ? '1hr' : `${hours}hrs`;
  }
  const days = Math.max(1, Math.round(ms / DAY));
  return days === 1 ? '1 day ago' : `${days} days ago`;
}
