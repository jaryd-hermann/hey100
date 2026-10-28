import { Image } from 'expo-image';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useHeyMenu } from '@/features/nav/heyMenuContext';
import { useTheme } from '@/theme/ThemeProvider';

import { Txt } from '../ui/Txt';

const LOGO_LIGHT = require('../../../assets/images/logo-lightmode.svg');
const LOGO_DARK = require('../../../assets/images/logo-darkmode.svg');
const LOGO_RATIO = 449 / 119.5;

const STICKER = '#111111';

/** The waving hand, taken from the prototype's `HP` constant. */
const HAND_PATH =
  'M30 124 C 18 110, 12 92, 14 76 L 10 48 C 9 38, 22 36, 24 46 L 28 70 L 26 24 C 25 12, 41 11, 42 23 L 46 64 L 48 12 C 49 0, 65 1, 64 14 L 62 64 L 70 22 C 72 11, 87 14, 84 26 L 76 72 C 84 64, 96 54, 106 58 C 116 62, 112 74, 104 80 L 88 100 C 78 118, 60 128, 44 128 C 38 128, 33 126, 30 124 Z';

export type HandMarkProps = {
  size?: number;
  wave?: boolean;
  /** The sticker outline stays black; only the inner fill changes. */
  fill?: string;
};

export function HandMark({ size = 64, wave = false, fill = '#FFFFFF' }: HandMarkProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!wave) return;
    const sequence = Animated.sequence([
      Animated.delay(300),
      ...[-24, -6, -20, -14].map((_, i) =>
        Animated.timing(anim, {
          toValue: i + 1,
          duration: 225,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ),
    ]);
    sequence.start();
    return () => sequence.stop();
  }, [anim, wave]);

  const rotate = anim.interpolate({
    inputRange: [0, 1, 2, 3, 4],
    outputRange: ['-14deg', '-24deg', '-6deg', '-20deg', '-14deg'],
  });

  return (
    <Animated.View
      style={{
        width: size,
        height: size * 1.03,
        transform: [{ rotate: wave ? rotate : '-14deg' }],
      }}
    >
      <Svg viewBox="-24 -6 136 140" width="100%" height="100%">
        <Path
          d={HAND_PATH}
          transform="translate(0,4)"
          fill={STICKER}
          stroke={STICKER}
          strokeWidth={14}
          strokeLinejoin="round"
        />
        <Path d={HAND_PATH} fill={fill} stroke={STICKER} strokeWidth={7} strokeLinejoin="round" />
      </Svg>
    </Animated.View>
  );
}

export type WordmarkProps = {
  size?: number;
  /** Blinks the 00 eyes and draws the smile, once on mount. */
  animated?: boolean;
  /** Use the dark-ink mark, for a light background. */
  onLight?: boolean;
  /** Stretch to the parent width, keeping the mark's ratio. */
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** The real wordmark assets, not a type-drawn stand-in. */
export function Wordmark({ size = 62, onLight, fill, style }: WordmarkProps) {
  const { isDark } = useTheme();
  const height = size;
  const width = size * LOGO_RATIO;
  const darkMark = onLight ? false : isDark;

  return (
    <View
      style={[
        fill ? { width: '100%', aspectRatio: LOGO_RATIO } : { width, height },
        style,
      ]}
    >
      <Image
        source={darkMark ? LOGO_DARK : LOGO_LIGHT}
        contentFit="contain"
        style={{ width: '100%', height: '100%' }}
        accessibilityLabel="Hey100"
      />
    </View>
  );
}

/** The splash and welcome lockup. The asset already includes the hand. */
export function HeroLogo({ size = 58, onLight }: { size?: number; onLight?: boolean }) {
  return (
    <View style={{ paddingTop: 4, paddingBottom: 16, width: '100%' }}>
      <Wordmark size={size} onLight={onLight} fill />
    </View>
  );
}

/**
 * The in-app header lockup: `Hey100 % Screen`, with the hand only on Discover.
 */
export function HeaderLogo({
  title,
  hand: _hand = false,
  right,
  onWordmarkPress,
}: {
  title?: string;
  hand?: boolean;
  right?: React.ReactNode;
  onWordmarkPress?: () => void;
}) {
  const { open } = useHeyMenu();
  const mark = <Wordmark size={26} />;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        // flexBasis auto keeps the row at content height inside an auto-height column.
        flexGrow: 1,
        flexBasis: 'auto',
      }}
    >
      <Pressable
        onPress={onWordmarkPress ?? open}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Hey100 menu"
      >
        {mark}
      </Pressable>
      {title ? (
        <>
          <Txt font="mono" size={17} weight={500} muted>
            %
          </Txt>
          <Txt font="mono" size={17} weight={500}>
            {title}
          </Txt>
        </>
      ) : null}
      {right}
    </View>
  );
}
