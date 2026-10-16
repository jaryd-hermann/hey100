import { useEffect, useState } from 'react';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/** How long ago a hey went out, e.g. "5h ago". */
export function sinceLabel(when: number): string {
  const diff = Math.max(0, Date.now() - when);
  if (diff < MINUTE) return 'just now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < 24 * HOUR) return `${Math.floor(diff / HOUR)}h ago`;
  return `${Math.floor(diff / (24 * HOUR))}d ago`;
}

/** How long until a moment in the future, e.g. "19h". */
export function untilLabel(when: number): string {
  const diff = Math.max(0, when - Date.now());
  if (diff >= HOUR) return `${Math.floor(diff / HOUR)}h`;
  return `${Math.max(1, Math.round(diff / MINUTE))}m`;
}

/** Re-renders on an interval, so follow-up countdowns unlock without a reload. */
export function useTick(every = MINUTE): void {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), every);
    return () => clearInterval(id);
  }, [every]);
}
