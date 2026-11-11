import React from 'react';
import { Image, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Txt } from '@/components/ui/Txt';

import { FlowButton } from '../FlowButton';
import { LIME } from '../look';

const PHOTO = require('../../../../assets/images/onboarding-jaryd.jpg');

const YEL = '#FFFF00';
const CYAN = '#00FFFF';
const MAG = '#FF00FF';

const LINES = [
  { text: 'Accelerators like YC and Speedrun are so good because builders get proximity to other builders.', weight: 600 as const },
  { text: "Everybody uses each other's products and gives feedback.", weight: 500 as const },
  { text: "It's a distribution and feedback hub.", weight: 500 as const },
  { text: "That's why these companies do so well.", weight: 500 as const },
];

const STEPS = [
  { n: '1', text: 'You build a profile for your product. (And you).', color: YEL, rot: '-1deg' },
  { n: '2', text: "You like apps you'd be down to try.", color: CYAN, rot: '1deg' },
  { n: '3', text: "When there's a match, you can DM the builder.", color: MAG, rot: '-0.5deg' },
  { n: '4', text: 'Trade feedback, chat, and find users.', color: LIME, rot: '1deg' },
];

const STROKE = [
  [2, 0],
  [-2, 0],
  [0, 2],
  [0, -2],
  [2, 2],
  [-2, 2],
  [2, -2],
  [-2, -2],
] as const;

export function WhyStep({ onContinue }: { onContinue: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 16, paddingHorizontal: 22, paddingBottom: 28, gap: 16 }}
      >
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <Image
            source={PHOTO}
            accessibilityLabel="Jaryd"
            style={{
              width: 62,
              height: 62,
              borderRadius: 31,
              borderWidth: 2,
              borderColor: '#111111',
              backgroundColor: '#111111',
              transform: [{ rotate: '-4deg' }],
              shadowColor: '#111111',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 1,
              shadowRadius: 0,
            }}
          />
          <Txt font="mono" size={23} weight={600} lh={1.15} tracking={-1.15} color="#FFFFFF" style={{ flex: 1 }}>
            Hey, I'm Jaryd. That's why I made Hey100.
          </Txt>
        </View>

        {LINES.map((line) => (
          <Txt key={line.text} size={17} weight={line.weight} lh={1.45} color="#FFFFFF">
            {line.text}
          </Txt>
        ))}

        <View style={{ alignSelf: 'flex-start', transform: [{ rotate: '-2deg' }] }}>
          <View
            style={{
              paddingVertical: 9,
              paddingHorizontal: 15,
              borderRadius: 14,
              backgroundColor: '#111111',
            }}
          >
            <Txt font="mono" size={20} weight={600} tracking={-0.8} color={LIME}>
              Hey100 replicates that.
            </Txt>
          </View>
        </View>

        <View style={{ gap: 10 }}>
          {STEPS.map((step) => (
            <View key={step.n} style={{ transform: [{ rotate: step.rot }] }}>
              <View
                style={{
                  flexDirection: 'row',
                  gap: 12,
                  alignItems: 'center',
                  paddingVertical: 13,
                  paddingHorizontal: 14,
                  borderRadius: 18,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 2,
                  borderColor: '#111111',
                  shadowColor: '#111111',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 1,
                  shadowRadius: 0,
                }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    backgroundColor: step.color,
                    borderWidth: 2,
                    borderColor: '#111111',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Txt font="logo" size={17} color="#111111">
                    {step.n}
                  </Txt>
                </View>
                <Txt size={15} weight={600} lh={1.35} color="#111111" style={{ flex: 1 }}>
                  {step.text}
                </Txt>
              </View>
            </View>
          ))}
        </View>

        <Txt size={17} lh={1.45} color="#FFFFFF">
          You can also make and join groups, because sharing ideas and building with others is how we grow.
        </Txt>

        <View style={{ paddingTop: 6, alignSelf: 'flex-start' }}>
          {STROKE.map(([x, y]) => (
            <Txt
              key={`${x}${y}`}
              font="logo"
              size={38}
              color="#111111"
              style={{ position: 'absolute', left: x, top: 6 + y }}
            >
              Hey! And welcome.
            </Txt>
          ))}
          <Txt font="logo" size={38} color="#FFFFFF" style={{ textShadowColor: '#111111', textShadowOffset: { width: 0, height: 5 }, textShadowRadius: 0 }}>
            Hey! And welcome.
          </Txt>
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 16 }}>
        <FlowButton
          label="I want to list my product"
          bg={LIME}
          fg="#111111"
          shadow="#000000"
          onPress={onContinue}
        />
      </View>
    </View>
  );
}
