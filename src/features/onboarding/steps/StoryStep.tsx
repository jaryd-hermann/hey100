import React, { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wordmark } from '@/components/brand/Logo';
import { Txt } from '@/components/ui/Txt';
import { useTheme } from '@/theme/ThemeProvider';
import { layout } from '@/theme/tokens';

import { ConvictionCta, RevealBox, RevealScroll } from './reveal';

type Line = {
  text: string;
  tone?: 'pop' | 'warn' | 'alert' | 'quote';
};

const LINES: Line[] = [
  { text: 'So, you shipped the product.' },
  { text: 'AI helped you build it faster than ever.' },
  { text: '30 visitors.', tone: 'pop' },
  { text: '0 customers.', tone: 'warn' },
  { text: 'Not because the product is useless…' },
  { text: '…but because nobody knows it exists.' },
  { text: 'Building is now the easy part.' },
  { text: "Finding users is what's hard.", tone: 'alert' },
  { text: '“Just post more.” “Become a creator.” “Do SEO.” “Run ads.”', tone: 'quote' },
  { text: 'Those playbooks were written for teams with money, employees, and time.' },
  { text: 'So, how do we crack early distribution when the whole team is just you?' },
  { text: 'Or get the right feedback…' },
  { text: '…or meet other builders who are also trying to grow, just like you?' },
];

const YELLOW = '#C4A02A';
const ALERT = '#E6532E';

export function StoryStep({ onContinue }: { onContinue: () => void }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [progress, setProgress] = useState(0);
  const ctaReserve = insets.bottom + 120;

  return (
    <View style={{ flex: 1 }}>
      <RevealScroll floor={ctaReserve} onProgress={setProgress}>
        {LINES.map((line) => (
          <RevealBox key={line.text}>
            <StoryLine line={line} />
          </RevealBox>
        ))}
        <RevealBox space={8}>
          <View style={{ alignItems: 'center', paddingTop: 8 }}>
            <Wordmark size={86} />
          </View>
        </RevealBox>
      </RevealScroll>

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
        <ConvictionCta
          progress={progress}
          onPress={onContinue}
          label="Continue, this resonates with me!"
        />
      </View>
    </View>
  );
}

function StoryLine({ line }: { line: Line }) {
  const { c } = useTheme();
  const color =
    line.tone === 'pop'
      ? c.accentText
      : line.tone === 'warn'
        ? YELLOW
        : line.tone === 'alert'
          ? ALERT
          : c.ink;

  return (
    <Txt
      font="mono"
      size={34}
      weight={line.tone === 'warn' || line.tone === 'alert' ? 700 : 500}
      lh={1.2}
      tracking={-0.55}
      center
      color={color}
      style={line.tone === 'quote' ? { fontStyle: 'italic' } : undefined}
    >
      {line.text}
    </Txt>
  );
}
