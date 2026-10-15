/**
 * The design spec defines colours in OKLCH, which React Native cannot parse.
 * These convert to sRGB hex so the tokens can stay written the way they were
 * designed, and so per-app icon hues can be generated at runtime.
 */

const cache = new Map<string, string>();

function gamma(channel: number): number {
  const c = channel <= 0.0031308 ? 12.92 * channel : 1.055 * Math.pow(channel, 1 / 2.4) - 0.055;
  return Math.min(1, Math.max(0, c));
}

function hex2(value: number): string {
  return Math.round(value * 255)
    .toString(16)
    .padStart(2, '0');
}

/** `oklch(L C H)` with L in 0–1 and H in degrees, as written in the spec. */
export function oklch(l: number, c: number, h: number, alpha = 1): string {
  const key = `${l}|${c}|${h}|${alpha}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const rad = (h * Math.PI) / 180;
  const a = c * Math.cos(rad);
  const b = c * Math.sin(rad);

  const lp = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mp = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const sp = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;

  const r = gamma(4.0767416621 * lp - 3.3077115913 * mp + 0.2309699292 * sp);
  const g = gamma(-1.2684380046 * lp + 2.6097574011 * mp - 0.3413193965 * sp);
  const bl = gamma(-0.0041960863 * lp - 0.7034186147 * mp + 1.707614701 * sp);

  const out =
    alpha >= 1
      ? `#${hex2(r)}${hex2(g)}${hex2(bl)}`
      : `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(bl * 255)}, ${alpha})`;

  cache.set(key, out);
  return out;
}

/** Per-app icon colour, generated from the app's hue. */
export function appHueColor(hue: number): string {
  return oklch(0.66, 0.13, hue);
}
