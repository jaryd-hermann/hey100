import React, { useState } from 'react';
import { Image, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wordmark } from '@/components/brand/Logo';
import { Txt } from '@/components/ui/Txt';
import { JarydMark } from '@/features/chat/TeamMark';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radii } from '@/theme/tokens';

import { ConvictionCta, RevealBox, RevealScroll } from './reveal';

const YC = require('../../../../assets/images/yc.png');
const SPEEDRUN = require('../../../../assets/images/speedrun.jpg');

const COPY = 30;

const HOW = [
  'You build a profile for your product. (And you)',
  "You like apps you'd be down to try.",
  "When there's a match, you can DM the builder.",
  'Trade feedback, chat, and find users.',
];

function StoryTxt({ children, tone }: { children: React.ReactNode; tone?: 'pop' }) {
  const { c } = useTheme();
  return (
    <Txt
      font="mono"
      size={COPY}
      weight={500}
      lh={1.25}
      tracking={-0.45}
      center
      color={tone === 'pop' ? c.accentText : c.ink}
    >
      {children}
    </Txt>
  );
}

function RoundMark({
  source,
  label,
  size = 28,
}: {
  source: number;
  label: string;
  size?: number;
}) {
  return (
    <Image
      source={source}
      accessibilityLabel={label}
      style={{ width: size, height: size, borderRadius: size / 2 }}
    />
  );
}

function TagChip({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  const { c } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 2,
        paddingLeft: 4,
        paddingRight: 14,
        borderRadius: radii.pill,
        borderWidth: 1.5,
        borderColor: c.ink,
        backgroundColor: c.surface,
      }}
    >
      {icon}
      <Txt font="mono" size={COPY} weight={500} lh={1.25} tracking={-0.45}>
        {label}
      </Txt>
    </View>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        columnGap: 8,
        rowGap: 10,
      }}
    >
      {children}
    </View>
  );
}

export function WhyStep({ onContinue }: { onContinue: () => void }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [progress, setProgress] = useState(0);
  const ctaReserve = insets.bottom + 120;

  return (
    <View style={{ flex: 1 }}>
      <RevealScroll floor={ctaReserve} onProgress={setProgress}>
        <View style={{ alignItems: 'center', gap: 14, width: '100%', paddingBottom: 20 }}>
          <Wrap>
            <StoryTxt>Hey, I'm</StoryTxt>
            <TagChip icon={<JarydMark size={28} />} label="Jaryd" />
          </Wrap>
          <Wrap>
            <StoryTxt>That's why I made</StoryTxt>
            <Wordmark size={36} />
          </Wrap>
        </View>

        <RevealBox space={16}>
          <Wrap>
            <StoryTxt>Accelerators like</StoryTxt>
            <TagChip icon={<RoundMark source={YC} label="YC" />} label="YC" />
            <TagChip icon={<RoundMark source={SPEEDRUN} label="Speedrun" />} label="Speedrun" />
            <StoryTxt>and co.</StoryTxt>
          </Wrap>
        </RevealBox>
        <RevealBox space={48}>
          <StoryTxt>are so good because builders get proximity to other builders.</StoryTxt>
        </RevealBox>

        <RevealBox space={64}>
          <StoryTxt>Everybody uses each other's products and gives feedback.</StoryTxt>
        </RevealBox>
        <RevealBox space={48}>
          <StoryTxt>It's a distribution and feedback hub.</StoryTxt>
        </RevealBox>

        <RevealBox space={48}>
          <StoryTxt>That's why these companies do so well.</StoryTxt>
        </RevealBox>

        <RevealBox space={48}>
          <StoryTxt>Hey100 replicates that.</StoryTxt>
        </RevealBox>

        {HOW.map((text, index) => (
          <RevealBox key={text} space={index === HOW.length - 1 ? 28 : 18}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: c.ink,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 4,
                  flexShrink: 0,
                }}
              >
                <Txt font="mono" size={15} weight={600}>
                  {index + 1}
                </Txt>
              </View>
              <Txt font="mono" size={COPY} weight={500} lh={1.3} tracking={-0.3} style={{ flex: 1 }}>
                {text}
              </Txt>
            </View>
          </RevealBox>
        ))}

        <RevealBox space={48}>
          <StoryTxt>
            You can also make and join groups, because sharing ideas and building with others is how
            we grow.
          </StoryTxt>
        </RevealBox>

        <RevealBox space={8}>
          <StoryTxt tone="pop">Hey! And welcome</StoryTxt>
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
        <ConvictionCta progress={progress} onPress={onContinue} label="I want to list my product" />
      </View>
    </View>
  );
}
