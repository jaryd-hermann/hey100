import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';

import { Txt } from '@/components/ui/Txt';

const COIN = require('../../../assets/images/block-coin.png');
const LIME = '#C6F24E';

/**
 * The blocks ticket. It drops onto the wizard bar, counts up, and leaves.
 * Remount it per award (`key`) so the animation plays again.
 */
export function EarnToast({
  from,
  to,
  gain,
  top,
}: {
  from: number;
  to: number;
  gain: number;
  top: number;
}) {
  const [n, setN] = useState(from);
  const travel = useRef(new Animated.Value(0)).current;
  const hop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const ride = Animated.sequence([
      Animated.timing(travel, {
        toValue: 1,
        duration: 310,
        easing: Easing.bezier(0.2, 0.8, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.delay(1540),
      Animated.timing(travel, {
        toValue: 2,
        duration: 350,
        easing: Easing.bezier(0.2, 0.8, 0.2, 1),
        useNativeDriver: true,
      }),
    ]);
    const bounce = Animated.sequence([
      Animated.delay(300),
      Animated.loop(
        Animated.sequence([
          Animated.timing(hop, { toValue: 1, duration: 210, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(hop, { toValue: 2, duration: 175, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(hop, { toValue: 3, duration: 315, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]),
        { iterations: 2 },
      ),
    ]);
    ride.start();
    bounce.start();
    return () => {
      ride.stop();
      bounce.stop();
    };
  }, [hop, travel]);

  useEffect(() => {
    let frame = 0;
    let started = 0;
    const tick = (now: number) => {
      if (!started) started = now;
      const p = Math.min(1, Math.max(0, (now - started - 380) / 700));
      const eased = 1 - (1 - p) ** 3;
      setN(Math.round(from + (to - from) * eased));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [from, to]);

  const translateY = travel.interpolate({ inputRange: [0, 1, 2], outputRange: [-62, 0, -62] });
  const opacity = travel.interpolate({ inputRange: [0, 0.35, 1, 1.7, 2], outputRange: [0, 1, 1, 1, 0] });
  const scale = travel.interpolate({ inputRange: [0, 0.7, 1, 2], outputRange: [0.9, 1.03, 1, 1] });
  const coinY = hop.interpolate({ inputRange: [0, 1, 2, 3], outputRange: [0, -5, 0, 0] });
  const coinSpin = hop.interpolate({ inputRange: [0, 1, 2, 3], outputRange: ['0deg', '-12deg', '6deg', '0deg'] });

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top, zIndex: 30, alignItems: 'center' }}>
      <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            height: 44,
            paddingLeft: 5,
            paddingRight: 14,
            borderRadius: 22,
            backgroundColor: '#111111',
            borderWidth: 2,
            borderColor: '#111111',
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 0,
          }}
        >
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: -1.5,
              right: -1.5,
              top: -1.5,
              bottom: -1.5,
              borderRadius: 24,
              borderWidth: 1.5,
              borderColor: 'rgba(198,242,78,0.55)',
            }}
          />
          <Animated.View
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: LIME,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ translateY: coinY }, { rotate: coinSpin }],
            }}
          >
            <Image source={COIN} style={{ width: 24, height: 24 }} contentFit="contain" />
          </Animated.View>
          <Txt font="mono" size={13} weight={700} color={LIME}>
            +{gain}
          </Txt>
          <View style={{ width: 1, height: 18, backgroundColor: 'rgba(255,255,255,0.2)' }} />
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
            <Txt font="mono" size={15} weight={600} color="#FFFFFF" style={{ minWidth: 34, textAlign: 'right', fontVariant: ['tabular-nums'] }}>
              {n}
            </Txt>
            <Txt font="mono" size={9} weight={600} color="#8E968F" tracking={0.9}>
              BLOCKS
            </Txt>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}
