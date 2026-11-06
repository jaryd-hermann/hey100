import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

import { Txt } from './Txt';

const DURATION = 1800;
const ACTION_DURATION = 5200;

export type ToastInput =
  | string
  | {
      message: string;
      action?: string;
      onAction?: () => void;
    };

type ToastState = {
  message: string;
  action?: string;
  onAction?: () => void;
};

const ToastContext = createContext<(input: ToastInput) => void>(() => {});

function toState(input: ToastInput): ToastState {
  if (typeof input === 'string') return { message: input };
  return { message: input.message, action: input.action, onAction: input.onAction };
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((next: ToastInput) => {
    const state = toState(next);
    setToast(state);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), state.action ? ACTION_DURATION : DURATION);
  }, []);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const value = useMemo(() => flash, [flash]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastPill
        toast={toast}
        onDismiss={() => {
          if (timer.current) clearTimeout(timer.current);
          setToast(null);
        }}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

function ToastPill({ toast, onDismiss }: { toast: ToastState | null; onDismiss: () => void }) {
  const { c, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState<ToastState | null>(null);

  useEffect(() => {
    if (toast) setShown(toast);
    Animated.timing(anim, {
      toValue: toast ? 1 : 0,
      duration: toast ? 220 : 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [anim, toast]);

  if (!shown) return null;

  return (
    <Animated.View
      pointerEvents={shown.action ? 'box-none' : 'none'}
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
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          },
          shadow,
        ]}
      >
        <Txt size={14} weight={600} color={c.bg} style={{ flexShrink: 1 }} numberOfLines={3}>
          {shown.message}
        </Txt>
        {shown.action ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              shown.onAction?.();
              onDismiss();
            }}
            hitSlop={8}
          >
            <Txt size={14} weight={700} color={c.bg} style={{ textDecorationLine: 'underline' }}>
              {shown.action}
            </Txt>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}
