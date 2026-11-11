const GRID = 5;
const UNIQUE_COLS = 3;

export function identiconOf(seed: string): { cells: boolean[][]; fg: string; bg: string } {
  const [pattern, hueBits, chromaBits] = cyrb128(seed.trim().toLowerCase() || 'hey100');
  const cells: boolean[][] = Array.from({ length: GRID }, () => Array<boolean>(GRID).fill(false));
  for (let i = 0; i < GRID * UNIQUE_COLS; i += 1) {
    const on = ((pattern >>> i) & 1) === 1;
    const row = Math.floor(i / UNIQUE_COLS);
    const col = i % UNIQUE_COLS;
    cells[row][col] = on;
    cells[row][GRID - 1 - col] = on;
  }
  const hue = hueBits % 360;
  const chroma = 0.1 + ((chromaBits % 80) / 80) * 0.08;
  return {
    cells,
    fg: `oklch(0.78 ${chroma} ${hue})`,
    bg: `oklch(0.2 0.03 ${hue})`,
  };
}

function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < str.length; i += 1) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

export function Identicon({ seed, size, radius }: { seed: string; size: number; radius?: number }) {
  const { cells, fg, bg } = identiconOf(seed);
  const pad = size / 12;
  const cell = (size - pad * 2) / GRID;
  const r = radius ?? size * 0.26;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
      style={{ borderRadius: r, display: 'block', flex: 'none' }}
    >
      <rect width={size} height={size} fill={bg} rx={r} />
      {cells.flatMap((row, y) =>
        row.map((on, x) =>
          on ? (
            <rect
              key={`${x}-${y}`}
              x={pad + x * cell}
              y={pad + y * cell}
              width={cell + 0.4}
              height={cell + 0.4}
              fill={fg}
            />
          ) : null,
        ),
      )}
    </svg>
  );
}
