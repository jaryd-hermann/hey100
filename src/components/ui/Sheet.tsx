import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { layout, radii } from '@/theme/tokens';

export type SheetProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Falls back to a scroll view when content can overflow. */
  scroll?: boolean;
};

/** Slides up over a scrim with a grab handle. Tapping the scrim dismisses. */
export function Sheet({ visible, onClose, children, scroll = true }: SheetProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const anim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(anim, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }
    Animated.timing(anim, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [anim, visible]);

  const Content = scroll ? ScrollView : View;

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={{ flex: 1, backgroundColor: c.scrim, opacity: anim }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Dismiss" />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
      >
        <Animated.View
          style={{
            backgroundColor: c.surface,
            borderTopLeftRadius: radii.sheet,
            borderTopRightRadius: radii.sheet,
            borderTopWidth: 1,
            borderColor: c.line,
            // A percentage has no definite parent height to resolve against
            // here, since the wrapper is positioned absolutely.
            maxHeight: height * 0.88,
            transform: [
              { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] }) },
            ],
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 2 }}>
            <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: c.muted, opacity: 0.5 }} />
          </View>
          <Content
            style={{ flexGrow: 0 }}
            contentContainerStyle={
              scroll
                ? {
                    paddingHorizontal: layout.gutter,
                    paddingTop: 10,
                    paddingBottom: insets.bottom + 20,
                  }
                : undefined
            }
            keyboardShouldPersistTaps="handled"
          >
            {scroll ? (
              children
            ) : (
              <View
                style={{
                  paddingHorizontal: layout.gutter,
                  paddingTop: 10,
                  paddingBottom: insets.bottom + 20,
                }}
              >
                {children}
              </View>
            )}
          </Content>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
