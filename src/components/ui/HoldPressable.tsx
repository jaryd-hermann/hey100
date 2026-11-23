import React, { useEffect, useRef } from 'react';
import { Pressable, type PressableProps } from 'react-native';

import { afterTouch, touchClaimed } from '@/lib/afterTouch';

/** Pressable that opens menus only once the finger is up, and not while scrolling.
 * The system long-press fires while the finger is still down. Presenting a sheet
 * then sticks the iOS touch system. */
export function HoldPressable({
  onLongPress,
  onPress,
  onPressIn,
  onPressOut,
  delayLongPress = 280,
  ...rest
}: PressableProps) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef({ x: 0, y: 0 });
  const held = useRef(false);
  const fired = useRef(false);

  const clear = () => {
    if (!timer.current) return;
    clearTimeout(timer.current);
    timer.current = null;
  };

  useEffect(() => () => clear(), []);

  return (
    <Pressable
      {...rest}
      onPressIn={(event) => {
        fired.current = false;
        held.current = false;
        start.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY };
        clear();
        if (onLongPress) {
          timer.current = setTimeout(() => {
            held.current = true;
          }, delayLongPress);
        }
        onPressIn?.(event);
      }}
      onPress={(event) => {
        if (fired.current || touchClaimed() || !onPress) return;
        afterTouch(() => onPress(event));
      }}
      onPressOut={(event) => {
        clear();
        const dx = event.nativeEvent.pageX - start.current.x;
        const dy = event.nativeEvent.pageY - start.current.y;
        const moved = dx * dx + dy * dy > 144;
        if (held.current && onLongPress && !moved) {
          held.current = false;
          fired.current = true;
          const fire = onLongPress;
          afterTouch(() => {
            if (touchClaimed()) return;
            fire(event);
          });
        } else {
          held.current = false;
        }
        onPressOut?.(event);
      }}
    />
  );
}
