import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Txt } from '@/components/ui/Txt';

const LIME = '#C6F24E';
const INK = '#111111';
const BG = '#0E100F';
const STEP_MS = 1600;
const TILE = 64;
const POP = Easing.bezier(0.2, 0.9, 0.3, 1.4);

const TILES = [
  {
    logo: require('../../../../web/public/landing/logo-1.png'),
    face: require('../../../../web/public/landing/face-1.jpg'),
    ring: '#00FF00',
  },
  {
    logo: require('../../../../web/public/landing/logo-2.png'),
    face: require('../../../../web/public/landing/face-2.png'),
    ring: '#FFFF00',
  },
  {
    logo: require('../../../../web/public/landing/logo-3.png'),
    face: require('../../../../web/public/landing/face-3.png'),
    ring: '#00FFFF',
  },
  {
    logo: require('../../../../web/public/landing/logo-4.png'),
    face: require('../../../../web/public/landing/face-4.png'),
    ring: '#FF00FF',
  },
  {
    logo: require('../../../../web/public/landing/logo-5.png'),
    face: require('../../../../web/public/landing/face-5.jpg'),
    ring: '#2E5CFF',
  },
];

type JoiningStepProps = {
  appName: string;
  onDone: () => void;
};

/**
 * The HTML joining beat. Tiles pop from the center every 1.6s, and the
 * checklist advances on the same clock. The fifth tick opens the paywall.
 */
export function JoiningStep({ appName, onDone }: JoiningStepProps) {
  const insets = useSafeAreaInsets();
  const done = useRef(false);
  const [joinT, setJoinT] = useState(0);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone();
  };

  useEffect(() => {
    let t = 0;
    const id = setInterval(() => {
      t += 1;
      if (t > 4) {
        clearInterval(id);
        finish();
        return;
      }
      setJoinT(t);
    }, STEP_MS);
    return () => clearInterval(id);
  }, []);

  const lines = [
    `Publishing ${appName}`,
    'Joining other builders',
    'Finding relevant users',
    'Suggesting apps',
  ];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Tap to skip"
      onPress={finish}
      style={{ flex: 1, backgroundColor: BG, paddingTop: insets.top }}
    >
      <StatusBar style="light" />
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          paddingHorizontal: 30,
          paddingBottom: 40,
          gap: 34,
        }}
      >
        <View
          style={{
            marginHorizontal: -18,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'flex-start',
            paddingTop: 6,
            paddingBottom: 10,
          }}
        >
          {TILES.map((tile, index) => (
            <JoinTile
              key={index}
              logo={tile.logo}
              face={tile.face}
              ring={tile.ring}
              rotate={['-24deg', '-12deg', '0deg', '12deg', '24deg'][index]}
              lift={[22, 8, 0, 8, 22][index]}
              visible={joinT >= Math.abs(2 - index) * 0.6}
            />
          ))}
        </View>
        <View style={{ gap: 16 }}>
          {lines.map((title, index) => (
            <JoinLine
              key={title}
              title={title}
              done={joinT > index}
              current={joinT === index}
            />
          ))}
        </View>
        <Txt font="mono" size={12} weight={500} color="rgba(255,255,255,0.6)" center>
          Tap to skip
        </Txt>
      </View>
    </Pressable>
  );
}

function JoinTile({
  logo,
  face,
  ring,
  rotate,
  lift,
  visible,
}: {
  logo: number;
  face: number;
  ring: string;
  rotate: string;
  lift: number;
  visible: boolean;
}) {
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: 600,
      easing: POP,
      useNativeDriver: true,
    }).start();
  }, [progress, visible]);

  return (
    <Animated.View
      style={{
        width: TILE,
        height: TILE,
        marginHorizontal: 3,
        opacity: progress,
        transform: [
          { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [30 + lift, lift] }) },
          { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
          { rotate },
        ],
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 5,
          bottom: -5,
          borderRadius: 17,
          backgroundColor: '#000000',
        }}
      />
      <Image
        source={logo}
        contentFit="cover"
        style={{
          width: TILE,
          height: TILE,
          borderRadius: 17,
          borderWidth: 2,
          borderColor: INK,
          backgroundColor: INK,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: -7,
          bottom: -7,
          width: 26,
          height: 26,
          borderRadius: 13,
          borderWidth: 2,
          borderColor: INK,
          backgroundColor: ring,
          overflow: 'hidden',
        }}
      >
        <Image source={face} contentFit="cover" style={{ width: 22, height: 22 }} />
      </View>
    </Animated.View>
  );
}

function JoinLine({ title, done, current }: { title: string; done: boolean; current: boolean }) {
  const shown = done || current;
  const opacity = useRef(new Animated.Value(shown ? 1 : 0.35)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: shown ? 1 : 0.35,
      duration: 400,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [opacity, shown]);

  return (
    <Animated.View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, opacity }}>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          borderWidth: 2,
          borderColor: done ? INK : current ? LIME : 'rgba(255,255,255,0.4)',
          backgroundColor: done ? LIME : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {done ? (
          <Txt size={14} weight={700} color={INK}>
            ✓
          </Txt>
        ) : null}
      </View>
      <Txt font="mono" size={19} weight={600} tracking={-0.76} color="#FFFFFF" style={{ flex: 1 }} numberOfLines={1}>
        {title}
      </Txt>
    </Animated.View>
  );
}
