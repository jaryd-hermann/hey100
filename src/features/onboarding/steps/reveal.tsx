import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { Txt } from '@/components/ui/Txt';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radii } from '@/theme/tokens';

const RevealCtx = createContext({ scrollY: 0, viewport: 800 });

/** Same climb as hey100.com: fully lit by 55% of the viewport, nearly gone at the bottom. */
export function lineLit(mid: number, viewport: number): number {
  return Math.min(1, Math.max(0, (viewport * 0.88 - mid) / (viewport * 0.33)));
}

export function readScroll(event: NativeScrollEvent) {
  const { contentOffset, contentSize, layoutMeasurement } = event;
  const y = Math.max(0, contentOffset.y);
  const travel = contentSize.height - layoutMeasurement.height;
  if (travel <= 12) return { scrollY: y, progress: 1 };
  const remaining = contentSize.height - y - layoutMeasurement.height;
  const ratio = y / travel;
  const progress = remaining <= 48 || ratio >= 0.88 ? 1 : Math.min(1, Math.max(0, ratio));
  return { scrollY: y, progress };
}

export function RevealScroll({
  floor,
  onProgress,
  children,
}: {
  floor: number;
  onProgress: (progress: number) => void;
  children: React.ReactNode;
}) {
  const { height } = useWindowDimensions();
  const [scrollY, setScrollY] = useState(0);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = readScroll(event.nativeEvent);
    setScrollY(next.scrollY);
    onProgress(next.progress);
  };

  return (
    <RevealCtx.Provider value={{ scrollY, viewport: height }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        onMomentumScrollEnd={onScroll}
        onScrollEndDrag={onScroll}
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingTop: 8,
          paddingBottom: floor,
        }}
      >
        <View style={{ width: '100%' }}>{children}</View>
      </ScrollView>
    </RevealCtx.Provider>
  );
}

export function RevealBox({
  space = 64,
  children,
}: {
  space?: number;
  children: React.ReactNode;
}) {
  const { scrollY, viewport } = useContext(RevealCtx);
  const ref = useRef<View>(null);
  const [mid, setMid] = useState(viewport);

  const measure = () => {
    ref.current?.measureInWindow((_x, y, _w, h) => {
      if (h) setMid(y + h / 2);
    });
  };

  useEffect(() => {
    measure();
  }, [scrollY, viewport]);

  const lit = lineLit(mid, viewport);

  return (
    <View
      ref={ref}
      onLayout={measure}
      style={{
        opacity: 0.07 + 0.93 * lit,
        transform: [{ translateY: (1 - lit) * 14 }],
        width: '100%',
        marginBottom: space,
      }}
    >
      {children}
    </View>
  );
}

export function ConvictionCta({
  progress,
  onPress,
  label,
}: {
  progress: number;
  onPress: () => void;
  label: string;
}) {
  const { c } = useTheme();
  const fill = progress >= 0.88 ? 1 : Math.max(0.06, progress);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 56,
        paddingVertical: 14,
        paddingHorizontal: 18,
        borderRadius: radii.pill,
        borderWidth: 2,
        borderColor: c.ink,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: c.raised,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          right: `${Math.round((1 - fill) * 100)}%`,
          backgroundColor: c.accent,
        }}
      />
      <Txt size={16} weight={600} color={progress > 0.4 ? c.accentInk : c.ink}>
        {label}
      </Txt>
    </Pressable>
  );
}
