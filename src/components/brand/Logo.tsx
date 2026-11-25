import React from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { fonts, htg } from '@/theme/tokens';

import { Txt } from '../ui/Txt';

export type WordmarkProps = {
  /** Font size of the letters; every other measure scales from it. */
  size?: number;
  /** `HTG` colour. */
  ink?: string;
  /** `.CHAT` sticker fill and letter colour. */
  chip?: string;
  chipInk?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * `HTG` plus a `.CHAT` sticker chip. The chip's small left tail makes it read
 * as a chat bubble.
 */
export function Wordmark({
  size = 34,
  ink = '#FFFFFF',
  chip = htg.verified,
  chipInk = htg.sticker,
  style,
}: WordmarkProps) {
  const border = Math.max(2, size * 0.07);
  const letters = {
    fontFamily: fonts.logo,
    fontSize: size,
    lineHeight: size,
    includeFontPadding: false,
  } as const;

  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel="htg.chat"
      style={[{ flexDirection: 'row', alignItems: 'center', gap: size * 0.3 }, style]}
    >
      <Text style={[letters, { color: ink }]}>HTG</Text>
      <View
        style={{
          paddingTop: size * 0.2,
          paddingBottom: size * 0.12,
          paddingHorizontal: size * 0.28,
          borderRadius: size * 0.3,
          backgroundColor: chip,
          borderWidth: border,
          borderColor: htg.sticker,
          shadowColor: '#000',
          shadowOpacity: 1,
          shadowRadius: 0,
          shadowOffset: { width: 0, height: Math.max(1, size * 0.12) },
        }}
      >
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: -size * 0.2,
            top: '50%',
            width: size * 0.34,
            height: size * 0.34,
            marginTop: -size * 0.17,
            backgroundColor: chip,
            borderLeftWidth: size * 0.07,
            borderBottomWidth: size * 0.07,
            borderColor: htg.sticker,
            transform: [{ rotate: '45deg' }],
          }}
        />
        <Text style={[letters, { color: chipInk }]}>.CHAT</Text>
      </View>
    </View>
  );
}

/** In-app header row: wordmark, optional screen title, and a right slot. */
export function HeaderLogo({ title, right }: { title?: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexGrow: 1, flexBasis: 'auto' }}>
      <Wordmark size={22} />
      {title ? (
        <Txt font="mono" size={17} weight={500} style={{ flex: 1 }} numberOfLines={1}>
          {title}
        </Txt>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      {right}
    </View>
  );
}
