import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
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
  /** Fires after the dismiss animation, when the modal is gone. */
  onClosed?: () => void;
  children: React.ReactNode;
  /** Falls back to a scroll view when content can overflow. */
  scroll?: boolean;
  /** When false, the sheet still scrolls in layout but ignores drags. */
  scrollEnabled?: boolean;
  /** Nearly full-height, for join previews and member profiles. */
  tall?: boolean;
  /** Full-bleed block at the top. The grab handle and close sit over it. */
  header?: React.ReactNode;
};

/** Slides up over a scrim with a grab handle. Tapping the scrim dismisses. */
export function Sheet({
  visible,
  onClose,
  onClosed,
  children,
  scroll = true,
  scrollEnabled = true,
  tall,
  header,
}: SheetProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const anim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  const onClosedRef = useRef(onClosed);
  onClosedRef.current = onClosed;
  const wasOpen = useRef(visible);
  const [mounted, setMounted] = useState(visible);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => setKeyboardHeight(event.endCoordinates.height),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      wasOpen.current = true;
      setMounted(true);
      Animated.timing(anim, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }
    if (!wasOpen.current) return;
    wasOpen.current = false;
    Animated.timing(anim, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setMounted(false);
      onClosedRef.current?.();
    });
  }, [anim, visible]);

  useEffect(() => {
    if (!visible) setKeyboardHeight(0);
  }, [visible]);

  useEffect(() => {
    if (keyboardHeight === 0) return;
    const id = requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
    return () => cancelAnimationFrame(id);
  }, [keyboardHeight]);

  const Content = scroll ? ScrollView : View;
  const sheetMax = keyboardHeight > 0 ? Math.max(240, height - keyboardHeight - 12) : height * 0.92;
  const overlay = !!header;
  const padBottom = keyboardHeight > 0 ? 16 : insets.bottom + 20;

  if (!mounted) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <Animated.View style={{ flex: 1, backgroundColor: c.scrim, opacity: anim }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Dismiss" />
      </Animated.View>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: keyboardHeight }}>
        <Animated.View
          style={{
            backgroundColor: c.surface,
            borderTopLeftRadius: radii.sheet,
            borderTopRightRadius: radii.sheet,
            borderTopWidth: overlay ? 0 : 1,
            borderColor: c.line,
            overflow: 'hidden',
            // A percentage has no definite parent height to resolve against
            // here, since the wrapper is positioned absolutely.
            maxHeight: sheetMax,
            minHeight: tall && keyboardHeight === 0 ? height * 0.78 : undefined,
            transform: [
              { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] }) },
            ],
          }}
        >
          <View
            pointerEvents="box-none"
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: 10,
              paddingBottom: 2,
              minHeight: 36,
              ...(overlay
                ? { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 4 }
                : null),
            }}
          >
            <View
              style={{
                width: 38,
                height: 4,
                borderRadius: 2,
                backgroundColor: overlay ? 'rgba(255,255,255,0.55)' : c.muted,
                opacity: overlay ? 1 : 0.5,
              }}
            />
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={{
                position: 'absolute',
                right: 10,
                top: 6,
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: overlay ? 'rgba(255,255,255,0.16)' : c.raised,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="close" size={18} color={overlay ? '#FFFFFF' : c.ink} />
            </Pressable>
          </View>
          <Content
            ref={scroll ? scrollRef : undefined}
            style={{ flexGrow: overlay ? 1 : 0, flex: overlay ? 1 : undefined, maxHeight: sheetMax - (overlay ? 0 : 16) }}
            {...(scroll
              ? {
                  scrollEnabled,
                  keyboardShouldPersistTaps: 'handled' as const,
                  contentContainerStyle: overlay
                    ? { flexGrow: 1 }
                    : {
                        paddingHorizontal: layout.gutter,
                        paddingTop: 10,
                        paddingBottom: padBottom,
                      },
                }
              : {})}
          >
            {scroll ? (
              <View style={overlay ? { flexGrow: 1 } : undefined}>
                {header}
                {overlay ? (
                  <View
                    style={{
                      flexGrow: 1,
                      backgroundColor: c.surface,
                      paddingHorizontal: layout.gutter,
                      paddingBottom: padBottom,
                    }}
                  >
                    {children}
                  </View>
                ) : (
                  children
                )}
              </View>
            ) : (
              <View
                style={{
                  paddingHorizontal: overlay ? 0 : layout.gutter,
                  paddingTop: overlay ? 0 : 10,
                  paddingBottom: padBottom,
                }}
              >
                {header}
                {overlay ? (
                  <View
                    style={{
                      backgroundColor: c.surface,
                      paddingHorizontal: layout.gutter,
                    }}
                  >
                    {children}
                  </View>
                ) : (
                  children
                )}
              </View>
            )}
          </Content>
        </Animated.View>
      </View>
    </Modal>
  );
}
