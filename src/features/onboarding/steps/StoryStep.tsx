import React, { useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wordmark } from '@/components/brand/Logo';
import { Txt } from '@/components/ui/Txt';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radii } from '@/theme/tokens';

type Line = {
  text: string;
  tone?: 'pop' | 'warn' | 'quote';
};

const LINES: Line[] = [
  { text: 'So, you shipped the product.' },
  { text: 'AI helped you build it faster than ever.' },
  { text: '30 visitors.', tone: 'pop' },
  { text: '0 customers.', tone: 'warn' },
  { text: 'Not because the product is useless…' },
  { text: '…but because nobody knows it exists.' },
  { text: '“Just post more.” “Become a creator.” “Do SEO.” “Run ads.”', tone: 'quote' },
  { text: 'Those playbooks were written for teams with money, employees, and time.' },
  { text: 'So, how do we crack early distribution when the whole team is just you?' },
  { text: 'Or get the right feedback…' },
  { text: '…or meet other builders who are also trying to grow, just like you?' },
];

const YELLOW = '#C4A02A';

export function StoryStep({ onContinue }: { onContinue: () => void }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [scrollY, setScrollY] = useState(0);
  const [progress, setProgress] = useState(0);
  const ctaReserve = insets.bottom + 120;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(event) => {
          const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
          const max = Math.max(1, contentSize.height - layoutMeasurement.height);
          setScrollY(contentOffset.y);
          setProgress(Math.min(1, Math.max(0, contentOffset.y / max)));
        }}
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingTop: 8,
          paddingBottom: ctaReserve + 12,
          alignItems: 'center',
          gap: 64,
        }}
      >
        {LINES.map((line) => (
          <RevealLine
            key={line.text}
            line={line}
            scrollY={scrollY}
            viewport={height}
            floor={ctaReserve}
            progress={progress}
          />
        ))}
        <RevealMark scrollY={scrollY} viewport={height} floor={ctaReserve} progress={progress} />
      </ScrollView>

      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: layout.gutter,
          paddingBottom: insets.bottom + 16,
          paddingTop: 28,
          backgroundColor: c.bg,
        }}
      >
        <ConvictionCta progress={progress} onPress={onContinue} />
      </View>
    </View>
  );
}

function RevealLine({
  line,
  scrollY,
  viewport,
  floor,
  progress,
}: {
  line: Line;
  scrollY: number;
  viewport: number;
  floor: number;
  progress: number;
}) {
  const { c } = useTheme();
  const [box, setBox] = useState({ y: 0, h: 40 });
  const mid = box.y + box.h / 2 - scrollY;
  const lit = lineLit(mid, viewport - floor, viewport, progress);
  const color = line.tone === 'pop' ? c.accentText : line.tone === 'warn' ? YELLOW : c.ink;

  return (
    <View
      onLayout={(event) => {
        const { y, height } = event.nativeEvent.layout;
        setBox({ y, h: height });
      }}
      style={{
        opacity: 0.03 + 0.97 * lit,
        transform: [{ translateY: (1 - lit) * 26 }],
        maxWidth: 390,
      }}
    >
      <Txt
        font="mono"
        size={34}
        weight={line.tone === 'warn' ? 700 : 500}
        lh={1.2}
        tracking={-0.55}
        center
        color={color}
        style={line.tone === 'quote' ? { fontStyle: 'italic' } : undefined}
      >
        {line.text}
      </Txt>
    </View>
  );
}

function lineLit(mid: number, visibleBottom: number, viewport: number, progress: number): number {
  if (mid < -40 || mid > visibleBottom + 30) return 0;
  // Bright in the top half; nearly gone as a line sits on the CTA.
  const climb = Math.min(1, Math.max(0, (viewport * 0.54 - mid) / (viewport * 0.2)));
  // At the end, keep the last lines readable without a huge empty pad.
  const finish = progress > 0.9 && mid < visibleBottom ? (progress - 0.9) / 0.1 : 0;
  return Math.min(1, Math.max(climb, finish));
}

function RevealMark({
  scrollY,
  viewport,
  floor,
  progress,
}: {
  scrollY: number;
  viewport: number;
  floor: number;
  progress: number;
}) {
  const [box, setBox] = useState({ y: 0, h: 80 });
  const mid = box.y + box.h / 2 - scrollY;
  const lit = lineLit(mid, viewport - floor, viewport, progress);

  return (
    <View
      onLayout={(event) => {
        const { y, height } = event.nativeEvent.layout;
        setBox({ y, h: height });
      }}
      style={{
        opacity: 0.03 + 0.97 * lit,
        transform: [{ translateY: (1 - lit) * 26 }],
        paddingTop: 8,
        paddingBottom: 8,
      }}
    >
      <Wordmark size={86} />
    </View>
  );
}

function ConvictionCta({ progress, onPress }: { progress: number; onPress: () => void }) {
  const { c } = useTheme();
  const fill = Math.max(0.06, progress);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continue, this resonates with me!"
      onPress={onPress}
      style={({ pressed }) => ({
        height: 56,
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
          width: `${Math.round(fill * 100)}%`,
          backgroundColor: c.accent,
        }}
      />
      <Txt size={16} weight={600} color={progress > 0.4 ? c.accentInk : c.ink}>
        Continue, this resonates with me!
      </Txt>
    </Pressable>
  );
}
