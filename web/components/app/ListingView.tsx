import { PlatformMark } from '@/components/app/Marks';
import { hueFill, host, initial, mmss } from '@/lib/format';
import type { ListingCard } from '@/lib/loop';
import { publicMediaUrl } from '@/lib/site';

export function ListingView({ card, compact = false }: { card: ListingCard; compact?: boolean }) {
  const icon = publicMediaUrl(card.app.icon_path);
  const pitch = publicMediaUrl(card.app.pitch_path);
  const chips = [
    ...(card.app.category ? [{ label: card.app.category, plat: false }] : []),
    ...String(card.app.platform ?? '')
      .split(/[,·|/]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((label) => ({ label, plat: true })),
    ...(card.app.stage ? [{ label: card.app.stage, plat: false }] : []),
  ];
  const builderName = card.builder?.real_name || (card.builder?.username ? `@${card.builder.username}` : 'Builder');

  return (
    <div className={compact ? 'listing-compact' : 'listing-view'}>
      <header className="listing-hero">
        <div className="icon-stack">
          {icon ? (
            <img src={icon} alt="" />
          ) : (
            <div className="icon-fallback" style={{ background: hueFill(card.app.hue) }}>
              {initial(card.app.name)}
            </div>
          )}
        </div>
        <div>
          <h1>{card.app.name}</h1>
          <p>{card.app.subtitle}</p>
          <small>made by {builderName}</small>
        </div>
      </header>
      {chips.length ? (
        <div className="chips">
          {chips.map((chip) => (
            <span key={chip.label} className="chip">
              {chip.plat ? <PlatformMark label={chip.label} /> : null}
              {chip.label}
            </span>
          ))}
        </div>
      ) : null}
      {card.app.description ? <p className="blurb">{card.app.description}</p> : null}
      {card.app.store_url ? (
        <a className="store-pill" href={card.app.store_url} target="_blank" rel="noreferrer">
          {host(card.app.store_url)} ↗
        </a>
      ) : null}
      {pitch ? (
        <div className="pitch-card">
          <video className="pitch-thumb" src={pitch} playsInline controls preload="metadata" />
          <div>
            <span className="eyebrow">Quick pitch</span>
            <strong>Watch {builderName.split(' ')[0]}&apos;s quick pitch</strong>
            <span className="muted">{mmss(card.app.pitch_seconds ?? 0)}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
