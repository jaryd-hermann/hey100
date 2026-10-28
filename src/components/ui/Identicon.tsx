import React, { useMemo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { identiconOf } from '@/lib/identicon';

const GRID = 5;

/** 5×5 mirrored sprite, clipped to the circular avatar. */
export function Identicon({
  seed,
  size,
  style,
}: {
  seed: string;
  size: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { cells, fg, bg } = useMemo(() => identiconOf(seed), [seed]);
  const pad = size / 12;
  const cell = (size - pad * 2) / GRID;

  return (
    <View
      pointerEvents="none"
      style={[{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }, style]}
    >
      <Svg width={size} height={size}>
        <Rect x={0} y={0} width={size} height={size} fill={bg} />
        {cells.map((row, y) =>
          row.map((on, x) =>
            on ? (
              <Rect
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
      </Svg>
    </View>
  );
}
