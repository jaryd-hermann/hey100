import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

import { HandMark } from './Logo';

const STICKER = '#111111';

/** Every icon is drawn in this box, so all five tabs share an optical size. */
const VIEW_BOX = '-6 -6 132 140';
const RATIO = 140 / 132;

/** The offset dark layer behind the shape, as in the source SVGs. */
const SHADOW = {
  fill: STICKER,
  stroke: STICKER,
  strokeWidth: 16,
  strokeLinejoin: 'round',
} as const;

const OUTLINE = {
  stroke: STICKER,
  strokeWidth: 9,
  strokeLinejoin: 'round',
} as const;

export type TabIconProps = {
  size?: number;
  active?: boolean;
};

/** White when idle, accent green when selected. */
function useFill(active?: boolean): string {
  const { c } = useTheme();
  return active ? c.accent : '#FFFFFF';
}

function Frame({ size = 26, children }: { size?: number; children: React.ReactNode }) {
  return (
    <Svg viewBox={VIEW_BOX} width={size} height={size * RATIO}>
      {children}
    </Svg>
  );
}

export function DiscoverIcon({ size, active }: TabIconProps) {
  const fill = useFill(active);

  return (
    <Frame size={size}>
      <G transform="translate(0,6)">
        <Rect
          {...SHADOW}
          x={18}
          y={20}
          width={58}
          height={80}
          rx={14}
          transform="rotate(-12 47 60)"
        />
        <Rect {...SHADOW} x={44} y={16} width={58} height={80} rx={14} transform="rotate(8 73 56)" />
      </G>
      <Rect
        {...OUTLINE}
        fill={fill}
        x={18}
        y={20}
        width={58}
        height={80}
        rx={14}
        transform="rotate(-12 47 60)"
      />
      <Rect
        {...OUTLINE}
        fill={fill}
        x={44}
        y={16}
        width={58}
        height={80}
        rx={14}
        transform="rotate(8 73 56)"
      />
      <Path
        d="M73 70 C 60 60, 58 50, 64 45 C 69 41, 73 45, 73 48 C 73 45, 77 41, 82 45 C 88 50, 86 60, 73 70 Z"
        transform="rotate(8 73 56)"
        fill={STICKER}
      />
    </Frame>
  );
}

const BUBBLE =
  'M30 20 H 90 C 100 20, 108 28, 108 38 V 70 C 108 80, 100 88, 90 88 H 52 L 30 104 L 34 88 H 30 C 20 88, 12 80, 12 70 V 38 C 12 28, 20 20, 30 20 Z';

export function ChatIcon({ size, active }: TabIconProps) {
  const fill = useFill(active);

  return (
    <Frame size={size}>
      <G transform="translate(0,6)">
        <Path {...SHADOW} d={BUBBLE} />
      </G>
      <Path {...OUTLINE} fill={fill} d={BUBBLE} />
      <Circle cx={40} cy={54} r={7} fill={STICKER} />
      <Circle cx={60} cy={54} r={7} fill={STICKER} />
      <Circle cx={80} cy={54} r={7} fill={STICKER} />
    </Frame>
  );
}

/** The three ascending bars: `[x, y, height]`. */
const BARS: [number, number, number][] = [
  [14, 58, 46],
  [48, 36, 68],
  [82, 14, 90],
];

export function FeedbackIcon({ size, active }: TabIconProps) {
  const fill = useFill(active);

  return (
    <Frame size={size}>
      <G transform="translate(0,6)">
        {BARS.map(([x, y, height]) => (
          <Rect key={x} {...SHADOW} x={x} y={y} width={24} height={height} rx={8} />
        ))}
      </G>
      {BARS.map(([x, y, height]) => (
        <Rect key={x} {...OUTLINE} fill={fill} x={x} y={y} width={24} height={height} rx={8} />
      ))}
    </Frame>
  );
}

/** The 2x2 grid of app tiles: `[x, y]`. */
const TILES: [number, number][] = [
  [14, 14],
  [66, 14],
  [14, 66],
  [66, 66],
];

export function AppsIcon({ size, active }: TabIconProps) {
  const fill = useFill(active);

  return (
    <Frame size={size}>
      <G transform="translate(0,6)">
        {TILES.map(([x, y]) => (
          <Rect key={`${x}-${y}`} {...SHADOW} x={x} y={y} width={40} height={40} rx={12} />
        ))}
      </G>
      {TILES.map(([x, y]) => (
        <Rect
          key={`${x}-${y}`}
          {...OUTLINE}
          fill={fill}
          x={x}
          y={y}
          width={40}
          height={40}
          rx={12}
        />
      ))}
    </Frame>
  );
}

/** Heys reuses the brand hand rather than a fifth sticker file. */
export function HeysIcon({ size = 26, active }: TabIconProps) {
  const fill = useFill(active);

  // The hand is drawn rotated, so it needs the same box height as the others.
  return (
    <View
      style={{
        width: size,
        height: size * RATIO,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <HandMark size={size} fill={fill} />
    </View>
  );
}
