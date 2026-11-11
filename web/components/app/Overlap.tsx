import { hueFill, initial } from '@/lib/format';

export function OverlapAvatars({
  person,
  personSrc,
  app,
  appSrc,
  appHue = 140,
  size = 44,
}: {
  person: string;
  personSrc?: string | null;
  app: string;
  appSrc?: string | null;
  appHue?: number;
  size?: number;
}) {
  const badge = Math.round(size * 0.4);
  return (
    <span className="overlap" style={{ width: size, height: size }}>
      {personSrc ? (
        <img src={personSrc} alt="" style={{ width: size, height: size, borderRadius: Math.round(size * 0.28) }} />
      ) : (
        <span className="row-fallback" style={{ width: size, height: size, borderRadius: Math.round(size * 0.28) }}>
          {initial(person)}
        </span>
      )}
      {appSrc ? (
        <img className="overlap-badge" src={appSrc} alt="" style={{ width: badge, height: badge }} />
      ) : (
        <span
          className="overlap-badge"
          style={{
            width: badge,
            height: badge,
            background: hueFill(appHue),
            fontSize: Math.max(9, badge * 0.45),
          }}
        >
          {initial(app)}
        </span>
      )}
    </span>
  );
}
