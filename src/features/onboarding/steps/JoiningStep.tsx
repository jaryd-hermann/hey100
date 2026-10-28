import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { Txt } from '@/components/ui/Txt';
import { fonts } from '@/theme/tokens';

const DURATION = 7000;
const STEP = 1350;
const CELL_W = 13;
const CELL_H = 18;
const LIME = '#C6F24E';
const BG = '#0A0A0A';

type JoiningStepProps = {
  appName: string;
  onDone: () => void;
};

/** 7-second post-publish beat before the paywall. Tap anywhere to skip. */
export function JoiningStep({ appName, onDone }: JoiningStepProps) {
  const done = useRef(false);
  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone();
  };

  const lines = [
    { title: `Publishing ${appName}`, cap: '1 / 4' },
    { title: 'Joining other builders', cap: '2 / 4' },
    { title: 'Finding relevant users', cap: '3 / 4' },
    { title: 'Suggesting apps', cap: '4 / 4' },
  ];

  const [index, setIndex] = useState(0);
  const fill = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timers = [1, 2, 3, 4].map((n) => setTimeout(() => setIndex(n), n * STEP));
    const end = setTimeout(finish, DURATION);
    Animated.timing(fill, {
      toValue: 1,
      duration: DURATION,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(end);
    };
  }, [fill]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Welcome to Hey100. Tap to continue."
      onPress={finish}
      style={{ flex: 1, backgroundColor: BG }}
    >
      <StatusBar style="light" />
      <BinaryGrid />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          backgroundColor: 'transparent',
        }}
      >
        <View
          style={{
            position: 'absolute',
            left: '19%',
            right: '19%',
            top: '35%',
            bottom: '35%',
            borderRadius: 200,
            backgroundColor: BG,
            opacity: 0.88,
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: 24,
            right: 24,
            top: '50%',
            height: 120,
            marginTop: -60,
          }}
        >
          {lines.map((line, i) => (
            <CopyLine
              key={line.cap}
              active={index === i}
              past={index > i}
              title={line.title}
              cap={line.cap}
            />
          ))}
          <WelcomeLine active={index === 4} />
        </View>
        <View
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 64,
            width: 140,
            marginLeft: -70,
            height: 3,
            borderRadius: 2,
            backgroundColor: 'rgba(255,255,255,0.12)',
            overflow: 'hidden',
          }}
        >
          <Animated.View
            style={{
              height: '100%',
              backgroundColor: LIME,
              width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            }}
          />
        </View>
      </View>
    </Pressable>
  );
}

function CopyLine({
  active,
  past,
  title,
  cap,
}: {
  active: boolean;
  past: boolean;
  title: string;
  cap: string;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: active ? 1 : 0,
        duration: 450,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(y, {
        toValue: active ? 0 : past ? -14 : 14,
        duration: 450,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [active, opacity, past, y]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        opacity,
        transform: [{ translateY: y }],
      }}
    >
      <Txt font="mono" size={23} weight={500} lh={1.25} tracking={-0.7} color="#fff" center>
        {title}
        <Txt font="mono" size={23} weight={500} color={LIME}>
          …
        </Txt>
      </Txt>
      <Txt font="mono" size={11} weight={500} tracking={1.1} upper color="#8E968F">
        {cap}
      </Txt>
    </Animated.View>
  );
}

function WelcomeLine({ active }: { active: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: active ? 1 : 0,
        duration: 450,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(y, {
        toValue: active ? 0 : 14,
        duration: 450,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [active, opacity, y]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        opacity,
        transform: [{ translateY: y }],
      }}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'baseline', gap: 10 }}>
        <Txt font="mono" size={27} weight={500} lh={1.2} tracking={-0.8} color="#fff">
          Welcome to
        </Txt>
        <Txt font="logo" size={30} color={LIME}>
          Hey100
        </Txt>
      </View>
      <Txt font="mono" size={11} weight={500} tracking={1.1} upper color="#8E968F">
        You're in
      </Txt>
    </Animated.View>
  );
}

function BinaryGrid() {
  const { width, height } = useWindowDimensions();
  // JetBrains 12 is ~7.2px wide; extra columns + clip beat a short last row.
  const cols = Math.ceil(width / CELL_W) + 6;
  const rows = Math.ceil(height / CELL_H) + 2;
  const total = cols * rows;
  const cells = useRef(Array.from({ length: total }, () => (Math.random() < 0.5 ? '0' : '1')));
  const started = useRef(Date.now());
  const lastFlip = useRef(0);
  const [head, setHead] = useState(0);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduce)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (reduce) return;
    let frame = 0;
    const tick = () => {
      const now = Date.now();
      const elapsed = now - started.current;
      const progress = Math.min(1, elapsed / (DURATION - 700));
      if (now - lastFlip.current > 55) {
        lastFlip.current = now;
        const flips = Math.max(1, Math.floor(cells.current.length / 9));
        for (let k = 0; k < flips; k++) {
          const i = (Math.random() * cells.current.length) | 0;
          cells.current[i] = cells.current[i] === '0' ? '1' : '0';
        }
        setHead(progress * total);
      }
      if (elapsed < DURATION) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduce, total]);

  if (reduce) return null;

  const lines: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    const rowStart = r * cols;
    const visible = Math.min(cols, Math.max(0, Math.ceil(head) - rowStart));
    if (visible <= 0) continue;

    const chunks: { text: string; color: string }[] = [];
    let buf = '';
    let color = '';
    for (let col = 0; col < visible; col++) {
      const i = rowStart + col;
      const d = head - i;
      const next =
        d < 6
          ? `rgba(198,242,78,${Math.max(0.15, 1 - d / 7).toFixed(2)})`
          : d < cols * 0.5
            ? 'rgba(220,224,220,0.34)'
            : 'rgba(220,224,220,0.16)';
      if (color && next !== color) {
        chunks.push({ text: buf, color });
        buf = '';
      }
      color = next;
      buf += cells.current[i] ?? '0';
    }
    if (buf) chunks.push({ text: buf, color });

    lines.push(
      <Text
        key={r}
        style={{
          fontFamily: fonts.monoMedium,
          fontSize: 12,
          lineHeight: CELL_H,
          letterSpacing: CELL_W - 7.2,
          height: CELL_H,
        }}
      >
        {chunks.map((chunk, i) => (
          <Text key={i} style={{ color: chunk.color }}>
            {chunk.text}
          </Text>
        ))}
      </Text>,
    );
  }

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        overflow: 'hidden',
        paddingLeft: 2,
        paddingTop: 2,
      }}
    >
      {lines}
    </View>
  );
}
