import React, { useRef } from 'react';
import { Pressable, type PressableProps } from 'react-native';

import { afterTouch } from '@/lib/afterTouch';

/** Pressable that opens menus only once the finger is up.
 * A long press fires while the finger is still down; presenting a sheet then
 * sticks the iOS touch system. */
export function HoldPressable({
  onLongPress,
  onPress,
  delayLongPress = 280,
  ...rest
}: PressableProps) {
  const held = useRef(false);

  return (
    <Pressable
      {...rest}
      delayLongPress={onLongPress ? delayLongPress : undefined}
      onLongPress={
        onLongPress
          ? () => {
              held.current = true;
            }
          : undefined
      }
      onPress={
        onPress
          ? (event) => {
              afterTouch(() => onPress(event));
            }
          : undefined
      }
      onPressOut={(event) => {
        if (!held.current || !onLongPress) return;
        held.current = false;
        const fire = onLongPress;
        afterTouch(() => fire(event));
      }}
    />
  );
}
