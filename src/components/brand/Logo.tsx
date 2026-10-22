import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useHeyMenu } from '@/features/nav/heyMenuContext';
import { fonts } from '@/theme/tokens';

import { Txt } from '../ui/Txt';

const STICKER = '#111111';

/** The waving hand, taken from the prototype's `HP` constant. */
const HAND_PATH =
  'M30 124 C 18 110, 12 92, 14 76 L 10 48 C 9 38, 22 36, 24 46 L 28 70 L 26 24 C 25 12, 41 11, 42 23 L 46 64 L 48 12 C 49 0, 65 1, 64 14 L 62 64 L 70 22 C 72 11, 87 14, 84 26 L 76 72 C 84 64, 96 54, 106 58 C 116 62, 112 74, 104 80 L 88 100 C 78 118, 60 128, 44 128 C 38 128, 33 126, 30 124 Z';

/** 16 points around a circle plus three below, matching the CSS sticker shadow. */
const RING = [
  [1, 0],
  [0.92, 0.38],
  [0.7, 0.7],
  [0.38, 0.92],
  [0, 1],
  [-0.38, 0.92],
  [-0.7, 0.7],
  [-0.92, 0.38],
  [-1, 0],
  [-0.92, -0.38],
  [-0.7, -0.7],
  [-0.38, -0.92],
  [0, -1],
  [0.38, -0.92],
  [0.7, -0.7],
  [0.92, -0.38],
] as const;

const DROP = [
  [0, 1.29],
  [0.57, 1.43],
  [-0.57, 1.43],
] as const;

type StickerTextProps = {
  children: React.ReactNode;
  size: number;
  /** Outline thickness as a fraction of the font size. */
  weight?: number;
};

/**
 * White fill with a black sticker outline and a drop edge. RN supports only one
 * text shadow, so the outline is built from offset copies behind the fill.
 */
function StickerText({ children, size, weight = 0.113 }: StickerTextProps) {
  const r = size * weight;

  const style = {
    fontFamily: fonts.logo,
    fontSize: size,
    lineHeight: size * 1.02,
  } as const;

  return (
    <View>
      {[...RING, ...DROP].map(([x, y], i) => (
        <Animated.Text
          key={i}
          allowFontScaling={false}
          style={[
            style,
            {
              position: 'absolute',
              left: x * r,
              top: y * r,
              color: STICKER,
            },
          ]}
        >
          {children}
        </Animated.Text>
      ))}
      <Animated.Text allowFontScaling={false} style={[style, { color: '#FFFFFF' }]}>
        {children}
      </Animated.Text>
    </View>
  );
}

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
  style?: StyleProp<ViewStyle>;
};

/** "Hey100" where the 00 are the eyes, with a smile curve beneath them. */
export function Wordmark({ size = 62, animated = false, style }: WordmarkProps) {
  const blink = useRef(new Animated.Value(1)).current;
  const draw = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) {
      draw.setValue(1);
      return;
    }
    const sequence = Animated.parallel([
      Animated.sequence([
        Animated.delay(2100),
        Animated.timing(blink, { toValue: 0.08, duration: 190, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 190, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(2600),
        Animated.timing(draw, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]),
    ]);
    sequence.start();
    return () => sequence.stop();
  }, [animated, blink, draw]);

  const smileWidth = size * 0.62;

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-start' }, style]}>
      <StickerText size={size}>Hey1</StickerText>

      <View>
        <Animated.View style={{ transform: [{ scaleY: blink }] }}>
          <StickerText size={size}>00</StickerText>
        </Animated.View>

        {/* The smile hangs under the eyes and reveals left to right. */}
        <Animated.View
          style={{
            position: 'absolute',
            top: size * 1.06,
            left: size * 0.04,
            height: size * 0.34,
            width: draw.interpolate({ inputRange: [0, 1], outputRange: [0, smileWidth] }),
            overflow: 'hidden',
          }}
        >
          <Svg width={smileWidth} height={size * 0.34} viewBox="0 0 100 34">
            <Path
              d="M6 6 Q50 36 90 8"
              fill="none"
              stroke={STICKER}
              strokeWidth={20}
              strokeLinecap="round"
            />
            <Path
              d="M6 6 Q50 36 90 8"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={7}
              strokeLinecap="round"
            />
          </Svg>
        </Animated.View>
      </View>
    </View>
  );
}

/** The splash and welcome lockup: hand before the wordmark, both animating once. */
export function HeroLogo({ size = 58 }: { size?: number }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        transform: [{ rotate: '-3deg' }],
        paddingLeft: 8,
        paddingTop: 4,
        paddingBottom: 30,
      }}
    >
      <HandMark size={size * 1.06} wave />
      <Wordmark size={size} animated />
    </View>
  );
}

/**
 * The in-app header lockup: `Hey100 % Screen`, with the hand only on Discover.
 */
export function HeaderLogo({
  title,
  hand = false,
  right,
  onWordmarkPress,
}: {
  title?: string;
  hand?: boolean;
  right?: React.ReactNode;
  onWordmarkPress?: () => void;
}) {
  const { open } = useHeyMenu();
  const mark = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {hand ? <HandMark size={24} /> : null}
      <Wordmark size={20} />
    </View>
  );

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
