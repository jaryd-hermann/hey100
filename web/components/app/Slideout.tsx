'use client';

import { ListingView } from '@/components/app/ListingView';
import type { ListingCard } from '@/lib/loop';
import { hueFill, initial } from '@/lib/format';
import { publicAvatarUrl, publicMediaUrl } from '@/lib/site';

export function Slideout({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="slide-scrim" onClick={onClose} role="presentation">
      <aside className="slideout" onClick={(event) => event.stopPropagation()}>
        <header>
          <h2>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>
        <div className="slide-body">{children}</div>
      </aside>
    </div>
  );
}

export function BuilderCard({
  name,
  photo,
  job,
  app,
}: {
  name: string;
  photo?: string | null;
  job?: string | null;
  app?: ListingCard | null;
}) {
  const src = publicAvatarUrl(photo) ?? (photo && /^https?:/i.test(photo) ? photo : null);
  const icon = publicMediaUrl(app?.app.icon_path);
  return (
    <div className="builder-card">
      <div className="builder-head">
        {src ? <img src={src} alt="" /> : <span className="builder-fallback">{initial(name)}</span>}
        <div>
          <strong>{name}</strong>
          <span>{job || 'Builder'}</span>
        </div>
      </div>
      {app ? (
        <div className="chips" style={{ marginTop: 10 }}>
          {icon ? <img src={icon} alt="" style={{ width: 28, height: 28, borderRadius: 8 }} /> : null}
          <span className="chip">{app.app.name}</span>
        </div>
      ) : null}
    </div>
  );
}

export function AppPeek({ card }: { card: ListingCard }) {
  return <ListingView card={card} compact />;
}
