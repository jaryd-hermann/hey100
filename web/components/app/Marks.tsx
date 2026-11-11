export function AppleMark({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.4 12.3c0-2.4 2-3.3 2.1-3.4-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.6.9s-1.9-1-3.1-1c-1.6 0-3.1 1-4 2.5-1.7 2.9-.4 7.3 1.2 9.7.8 1.2 1.7 2.5 3 2.4 1.2-.1 1.6-.7 3.1-.7s1.8.7 3.1.7c1.3 0 2.1-1.2 2.9-2.4.9-1.3 1.3-2.6 1.3-2.6s-2.5-1-2.5-3.8zM14.5 5.6c.6-.8 1.1-1.9.9-3-1 .1-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 2.9 1.1.1 2.3-.6 3-1.4z" />
    </svg>
  );
}

export function PlayMark({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3.5 20.5 13.2 12 3.5 3.5v17zM14.3 12.9l2.4 1.4-10.7 6.2 8.3-7.6zM16.7 9.7 6 3.5l10.7 6.2zM17.4 10.1 21 12l-3.6 1.9V10.1z" />
    </svg>
  );
}

export function WindowsMark({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 5.5 11 4.3v7.2H3V5.5zm0 13 8 1.3v-7.3H3v6zm9.2-6.1 8.8-1.2V3.8L12.2 5.3v7.1zm0 8.6 8.8 1.3v-8.7l-8.8 1.2v6.2z" />
    </svg>
  );
}

export function ChromeMark({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3.2" fill="currentColor" />
      <path d="M12 3.2h8.2M3.8 7.2 8 14.5M20.2 7.2 12 21" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function PlatformMark({ label, size = 12 }: { label: string; size?: number }) {
  const value = label.toLowerCase();
  if (value.includes('android')) return <PlayMark size={size} />;
  if (value.includes('windows')) return <WindowsMark size={size} />;
  if (value.includes('web') || value.includes('chrome')) return <ChromeMark size={size} />;
  if (value.includes('iphone') || value.includes('ios') || value.includes('mac') || value.includes('apple')) {
    return <AppleMark size={size} />;
  }
  return null;
}

export function VerifiedBadge({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="11" fill="oklch(0.87 0.18 128)" />
      <path d="M7 12.2 10.2 15.4 17 8.6" fill="none" stroke="#111" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
