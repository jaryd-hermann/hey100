import { Image } from 'expo-image';
import React from 'react';
import { View } from 'react-native';

import { Txt } from '@/components/ui/Txt';
import { LIME } from '@/features/onboarding/look';
import { appHueColor } from '@/theme/oklch';

export type SummaryStepProps = {
  name: string;
  subtitle: string;
  icon?: string;
  hue: number;
  stage: string;
  devices: string;
  shotLabel: string;
  looking: string;
  ageGender: string;
  feedback: string;
};

const ROWS: { key: keyof Pick<SummaryStepProps, 'devices' | 'shotLabel' | 'looking' | 'ageGender' | 'feedback'>; label: string }[] = [
  { key: 'devices', label: 'DEVICES' },
  { key: 'shotLabel', label: 'SCREENSHOTS' },
  { key: 'looking', label: 'LOOKING FOR' },
  { key: 'ageGender', label: 'AGE · GENDER' },
  { key: 'feedback', label: 'FEEDBACK ON' },
];

/** The tilted white card from the onboarding prototype. */
export function SummaryStep(props: SummaryStepProps) {
  const letter = (props.name || 'A').trim().charAt(0).toUpperCase();

  return (
    <View style={{ marginBottom: 8, transform: [{ rotate: '-1deg' }] }}>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 6,
          bottom: -6,
          borderRadius: 24,
          backgroundColor: LIME,
        }}
      />
      <View
        style={{
          padding: 18,
          borderRadius: 24,
          backgroundColor: '#FFFFFF',
          borderWidth: 2,
          borderColor: '#111111',
          gap: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 15,
              borderWidth: 2,
              borderColor: '#111111',
              backgroundColor: appHueColor(props.hue),
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {props.icon ? (
              <Image source={{ uri: props.icon }} style={{ width: 56, height: 56 }} contentFit="cover" />
            ) : (
              <Txt font="logo" size={26} color="#111111">
                {letter}
              </Txt>
            )}
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt font="mono" size={18} weight={700} color="#111111" tracking={-0.5} numberOfLines={2}>
              {props.name || 'Your app'}
            </Txt>
            {props.subtitle ? (
              <Txt size={13.5} color="#111111" numberOfLines={2}>
                {props.subtitle}
              </Txt>
            ) : null}
          </View>
        </View>

        <View
          style={{
            alignSelf: 'flex-start',
            paddingVertical: 5,
            paddingHorizontal: 10,
            borderRadius: 9,
            backgroundColor: LIME,
            borderWidth: 1.5,
            borderColor: '#111111',
          }}
        >
          <Txt font="mono" size={11} weight={700} color="#111111">
            {props.stage.toUpperCase()}
          </Txt>
        </View>

        {ROWS.map((row) => (
          <View
            key={row.label}
            style={{
              gap: 4,
              paddingTop: 11,
              borderTopWidth: 1.5,
              borderTopColor: 'rgba(17,17,17,0.1)',
            }}
          >
            <Txt font="mono" size={10.5} weight={700} color="#5B625C" tracking={1.05}>
              {row.label}
            </Txt>
            <Txt size={15} weight={600} lh={1.4} color="#111111">
              {props[row.key] || 'Not set'}
            </Txt>
          </View>
        ))}
      </View>
    </View>
  );
}
