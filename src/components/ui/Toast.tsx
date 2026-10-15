import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

import { Txt } from './Txt';

const DURATION = 1800;

const ToastContext = createContext<(message: string) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((next: string) => {
    setMessage(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(''), DURATION);
  }, []);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const value = useMemo(() => flash, [flash]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastPill message={message} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

function ToastPill({ message }: { message: string }) {
  const { c, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState('');

  useEffect(() => {
    if (message) setShown(message);
    Animated.timing(anim, {
      toValue: message ? 1 : 0,
      duration: message ? 220 : 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [anim, message]);

  if (!shown) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: insets.top + 8,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 999,
        opacity: anim,
        transform: [
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) },
        ],
      }}
    >
      <View
        style={[
          {
            backgroundColor: c.ink,
            borderRadius: radii.pill,
            paddingHorizontal: 16,
            paddingVertical: 10,
            maxWidth: '88%',
          },
          shadow,
        ]}
      >
        <Txt size={14} weight={600} color={c.bg} numberOfLines={2}>
          {shown}
        </Txt>
      </View>
    </Animated.View>
  );
}
