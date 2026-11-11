import React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Txt } from '@/components/ui/Txt';

import { FlowButton } from '../FlowButton';
import { LIME } from '../look';

const YEL = '#FFFF00';
const MAG = '#FF00FF';
const CYAN = '#00FFFF';
const SOFT = 'rgba(255,255,255,0.82)';

type TextLine = { kind: 'text'; text: string; size: number; color: string };
type StickerLine = { kind: 'sticker'; text: string; size: number; bg: string; rot: string; align: 'flex-start' | 'flex-end' };
type ChipsLine = { kind: 'chips'; items: { text: string; rot: string }[] };
type Line = TextLine | StickerLine | ChipsLine;

const LINES: Line[] = [
  { kind: 'text', text: 'So, you shipped the product.', size: 27, color: '#fff' },
  { kind: 'text', text: 'AI helped you build it faster than ever.', size: 21, color: SOFT },
  { kind: 'sticker', text: '30 visitors.', size: 30, bg: YEL, rot: '-3deg', align: 'flex-start' },
  { kind: 'sticker', text: '0 customers.', size: 30, bg: MAG, rot: '2.5deg', align: 'flex-end' },
  { kind: 'text', text: 'Not because the product is useless…', size: 21, color: SOFT },
  { kind: 'text', text: '…but because nobody knows it exists.', size: 25, color: '#fff' },
  { kind: 'text', text: 'Building is now the easy part.', size: 21, color: SOFT },
  { kind: 'text', text: "Finding users is what's hard.", size: 27, color: LIME },
  {
    kind: 'chips',
    items: [
      { text: 'Just post more.', rot: '-3deg' },
      { text: 'Become a creator.', rot: '2deg' },
      { text: 'Do SEO.', rot: '-1deg' },
      { text: 'Run ads.', rot: '3deg' },
    ],
  },
  {
    kind: 'text',
    text: 'Those playbooks were written for teams with money, employees, and time.',
    size: 19,
    color: SOFT,
  },
  {
    kind: 'sticker',
    text: 'So, how do we crack early distribution when the whole team is just you?',
    size: 21,
    bg: CYAN,
    rot: '-1.5deg',
    align: 'flex-start',
  },
  { kind: 'text', text: 'Or get the right feedback…', size: 21, color: '#fff' },
  {
    kind: 'text',
    text: '…or meet other builders who are also trying to grow, just like you?',
    size: 21,
    color: '#fff',
  },
];

export function StoryStep({ onContinue }: { onContinue: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 18, paddingHorizontal: 24, paddingBottom: 30, gap: 22 }}
      >
        {LINES.map((line) => {
          if (line.kind === 'chips') {
            return (
              <View key="chips" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {line.items.map((item) => (
                  <View key={item.text} style={{ transform: [{ rotate: item.rot }] }}>
                    <View
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 14,
                        borderRadius: 20,
                        backgroundColor: '#FFFFFF',
                        borderWidth: 2,
                        borderColor: '#111111',
                        shadowColor: '#000000',
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 1,
                        shadowRadius: 0,
                      }}
                    >
                      <Txt
                        size={15}
                        weight={600}
                        color="#111111"
                        style={{ textDecorationLine: 'line-through', textDecorationColor: '#111111' }}
                      >
                        {item.text}
                      </Txt>
                    </View>
                  </View>
                ))}
              </View>
            );
          }

          if (line.kind === 'sticker') {
            return (
              <View key={line.text} style={{ alignSelf: line.align, maxWidth: 320, transform: [{ rotate: line.rot }] }}>
                <View
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 16,
                    backgroundColor: line.bg,
                    borderWidth: 2,
                    borderColor: '#111111',
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: 5 },
                    shadowOpacity: 1,
                    shadowRadius: 0,
                  }}
                >
                  <Txt font="mono" size={line.size} weight={600} lh={1.15} tracking={line.size * -0.05} color="#111111">
                    {line.text}
                  </Txt>
                </View>
              </View>
            );
          }

          return (
            <Txt
              key={line.text}
              font="mono"
              size={line.size}
              weight={600}
              lh={1.22}
              tracking={line.size * -0.045}
              color={line.color}
            >
              {line.text}
            </Txt>
          );
        })}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 16 }}>
        <FlowButton
          label="Continue, this resonates with me!"
          bg={LIME}
          fg="#111111"
          shadow="#000000"
          onPress={onContinue}
        />
      </View>
    </View>
  );
}
