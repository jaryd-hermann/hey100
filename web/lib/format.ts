export function hueFill(hue: number) {
  return `oklch(0.62 0.12 ${hue})`;
}

export function initial(name: string) {
  return (name.trim().slice(0, 1) || '?').toUpperCase();
}

export function host(url: string) {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//, '');
  }
}

export function mmss(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function timeAgo(iso: string | null | undefined) {
  if (!iso) return '';
  const delta = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(delta) || delta < 0) return '';
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function firstName(realName: string | null | undefined, fallback = 'there') {
  const name = realName?.trim();
  if (!name) return fallback;
  return name.split(/\s+/)[0] ?? fallback;
}

export function builderPhoto(path: string | null | undefined, mediaUrl: (p: string | null | undefined) => string | null) {
  if (!path) return null;
  if (/^https?:/i.test(path)) return path;
  return mediaUrl(path);
}
