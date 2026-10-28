import { oklch } from '@/theme/oklch';

/**
 * GitHub Identicons (2013): MD5 of the numeric user id, a 5×5 sprite whose
 * left three columns come from hash nibbles (even = filled) and mirror to the
 * right, plus a pastel HSL colour from the leftover bits.
 *
 * Ours follows that sprite, but hashes the claimed @username (the id we have
 * before sign-in) with cyrb128, and paints in OKLCH so the faces sit in the
 * same colour space as app icons. A real photo on the profile replaces this.
 */
const GRID = 5;
const UNIQUE_COLS = 3;

export type IdenticonSpec = {
  cells: boolean[][];
  fg: string;
  bg: string;
};

/** 128-bit string hash, four unsigned 32-bit words. */
function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
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
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

export function identiconOf(seed: string): IdenticonSpec {
  const [pattern, hueBits, chromaBits] = cyrb128(seed.trim().toLowerCase() || 'hey100');

  const cells: boolean[][] = Array.from({ length: GRID }, () => Array<boolean>(GRID).fill(false));
  for (let i = 0; i < GRID * UNIQUE_COLS; i++) {
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
    fg: oklch(0.78, chroma, hue),
    bg: oklch(0.2, 0.03, hue),
  };
}
