const STICKER = '#111111';
const IDLE = '#FFFFFF';
const ACTIVE = '#C6F24E';

type Props = { size?: number; active?: boolean };

function Frame({ size = 22, children }: { size?: number; children: React.ReactNode }) {
  return (
    <svg width={size} height={Math.round(size * (140 / 132))} viewBox="-6 -6 132 140" aria-hidden>
      {children}
    </svg>
  );
}

export function DiscoverIcon({ size, active }: Props) {
  const fill = active ? ACTIVE : IDLE;
  return (
    <Frame size={size}>
      <g transform="translate(0,6)">
        <rect fill={STICKER} stroke={STICKER} strokeWidth="16" strokeLinejoin="round" x="18" y="20" width="58" height="80" rx="14" transform="rotate(-12 47 60)" />
        <rect fill={STICKER} stroke={STICKER} strokeWidth="16" strokeLinejoin="round" x="44" y="16" width="58" height="80" rx="14" transform="rotate(8 73 56)" />
      </g>
      <rect fill={fill} stroke={STICKER} strokeWidth="9" strokeLinejoin="round" x="18" y="20" width="58" height="80" rx="14" transform="rotate(-12 47 60)" />
      <rect fill={fill} stroke={STICKER} strokeWidth="9" strokeLinejoin="round" x="44" y="16" width="58" height="80" rx="14" transform="rotate(8 73 56)" />
      <path d="M73 70 C 60 60, 58 50, 64 45 C 69 41, 73 45, 73 48 C 73 45, 77 41, 82 45 C 88 50, 86 60, 73 70 Z" transform="rotate(8 73 56)" fill={STICKER} />
    </Frame>
  );
}

const BUBBLE =
  'M30 20 H 90 C 100 20, 108 28, 108 38 V 70 C 108 80, 100 88, 90 88 H 52 L 30 104 L 34 88 H 30 C 20 88, 12 80, 12 70 V 38 C 12 28, 20 20, 30 20 Z';

export function ChatIcon({ size, active }: Props) {
  const fill = active ? ACTIVE : IDLE;
  return (
    <Frame size={size}>
      <g transform="translate(0,6)">
        <path d={BUBBLE} fill={STICKER} stroke={STICKER} strokeWidth="16" strokeLinejoin="round" />
      </g>
      <path d={BUBBLE} fill={fill} stroke={STICKER} strokeWidth="9" strokeLinejoin="round" />
      <circle cx="40" cy="54" r="7" fill={STICKER} />
      <circle cx="60" cy="54" r="7" fill={STICKER} />
      <circle cx="80" cy="54" r="7" fill={STICKER} />
    </Frame>
  );
}

export function FeedbackIcon({ size, active }: Props) {
  const fill = active ? ACTIVE : IDLE;
  const bars: [number, number, number][] = [
    [14, 58, 46],
    [48, 36, 68],
    [82, 14, 90],
  ];
  return (
    <Frame size={size}>
      <g transform="translate(0,6)">
        {bars.map(([x, y, h]) => (
          <rect key={x} fill={STICKER} stroke={STICKER} strokeWidth="16" strokeLinejoin="round" x={x} y={y} width="24" height={h} rx="8" />
        ))}
      </g>
      {bars.map(([x, y, h]) => (
        <rect key={x} fill={fill} stroke={STICKER} strokeWidth="9" strokeLinejoin="round" x={x} y={y} width="24" height={h} rx="8" />
      ))}
    </Frame>
  );
}

export function AppsIcon({ size, active }: Props) {
  const fill = active ? ACTIVE : IDLE;
  const tiles: [number, number][] = [
    [14, 14],
    [66, 14],
    [14, 66],
    [66, 66],
  ];
  return (
    <Frame size={size}>
      <g transform="translate(0,6)">
        {tiles.map(([x, y]) => (
          <rect key={`${x}-${y}`} fill={STICKER} stroke={STICKER} strokeWidth="16" strokeLinejoin="round" x={x} y={y} width="40" height="40" rx="12" />
        ))}
      </g>
      {tiles.map(([x, y]) => (
        <rect key={`${x}-${y}`} fill={fill} stroke={STICKER} strokeWidth="9" strokeLinejoin="round" x={x} y={y} width="40" height="40" rx="12" />
      ))}
    </Frame>
  );
}

export function HeysIcon({ size, active }: Props) {
  const fill = active ? ACTIVE : IDLE;
  return (
    <Frame size={size}>
      <g transform="rotate(-10 60 62)">
        <path
          d="M60 112 C 32 94, 8 72, 8 46 C 8 26, 22 12, 40 12 C 50 12, 56 18, 60 26 C 64 18, 70 12, 80 12 C 98 12, 112 26, 112 46 C 112 72, 88 94, 60 112 Z"
          transform="translate(0,6)"
          fill={STICKER}
          stroke={STICKER}
          strokeWidth="16"
          strokeLinejoin="round"
        />
        <path
          d="M60 112 C 32 94, 8 72, 8 46 C 8 26, 22 12, 40 12 C 50 12, 56 18, 60 26 C 64 18, 70 12, 80 12 C 98 12, 112 26, 112 46 C 112 72, 88 94, 60 112 Z"
          fill={fill}
          stroke={STICKER}
          strokeWidth="9"
          strokeLinejoin="round"
        />
      </g>
    </Frame>
  );
}

export function CommunityIcon({ size, active }: Props) {
  const fill = active ? ACTIVE : IDLE;
  return (
    <svg width={size ?? 22} height={Math.round((size ?? 22) * (136 / 140))} viewBox="-8 -4 140 136" aria-hidden>
      <g transform="rotate(-8 60 60)">
        <path d="M52 8 Q 60 44 96 52 Q 60 60 52 96 Q 44 60 8 52 Q 44 44 52 8 Z" transform="translate(0,6)" fill={STICKER} stroke={STICKER} strokeWidth="16" strokeLinejoin="round" />
        <path d="M98 70 Q 102 88 120 92 Q 102 96 98 114 Q 94 96 76 92 Q 94 88 98 70 Z" transform="translate(0,5)" fill={STICKER} stroke={STICKER} strokeWidth="14" strokeLinejoin="round" />
        <path d="M52 8 Q 60 44 96 52 Q 60 60 52 96 Q 44 60 8 52 Q 44 44 52 8 Z" fill={fill} stroke={STICKER} strokeWidth="8" strokeLinejoin="round" />
        <path d="M98 70 Q 102 88 120 92 Q 102 96 98 114 Q 94 96 76 92 Q 94 88 98 70 Z" fill={fill} stroke={STICKER} strokeWidth="7" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export function AssistantIcon({ size, active }: Props) {
  const fill = active ? ACTIVE : IDLE;
  const bubble =
    'M30 14 H 90 C 102 14, 110 22, 110 34 V 70 C 110 82, 102 90, 90 90 H 54 L 30 108 L 34 90 H 30 C 18 90, 10 82, 10 70 V 34 C 10 22, 18 14, 30 14 Z';
  return (
    <svg width={size ?? 22} height={size ?? 22} viewBox="-6 -2 132 132" aria-hidden>
      <g transform="rotate(-6 60 60)">
        <path d={bubble} transform="translate(0,6)" fill={STICKER} stroke={STICKER} strokeWidth="16" strokeLinejoin="round" />
        <path d={bubble} fill={fill} stroke={STICKER} strokeWidth="9" strokeLinejoin="round" />
        <path d="M60 30 Q 64 48 82 52 Q 64 56 60 74 Q 56 56 38 52 Q 56 48 60 30 Z" fill={STICKER} stroke={STICKER} strokeWidth="4" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export function ToolsIcon({ size = 22, active }: Props) {
  const fill = active ? ACTIVE : IDLE;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4L16 11l-3-3 1.7-1.7z"
        fill={fill}
        stroke={STICKER}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
