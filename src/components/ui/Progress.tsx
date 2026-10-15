import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

/** The thin ink-filled progress bar across the top of onboarding. */
export function Progress({ value }: { value: number }) {
  const { c } = useTheme();
  const anim = useRef(new Animated.Value(value)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [anim, value]);

  return (
    <View style={{ height: 3, backgroundColor: c.line, borderRadius: 2, overflow: 'hidden' }}>
      <Animated.View
        style={{
          height: 3,
          backgroundColor: c.ink,
          width: anim.interpolate({
            inputRange: [0, 1],
            outputRange: ['0%', '100%'],
            extrapolate: 'clamp',
          }),
        }}
      />
    </View>
  );
}
