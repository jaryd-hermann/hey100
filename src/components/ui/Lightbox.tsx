import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MediaItem, ShotLayout } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';
import { layout as layoutTokens, radii } from '@/theme/tokens';

import { InlineVideo } from './InlineVideo';
import { MediaPlaceholder } from './MediaPlaceholder';
import { Txt } from './Txt';

/** Controls sit on a dark scrim, so they are sticker white regardless of theme. */
const OVER_SCRIM = '#FFFFFF';

/** Past this drop the viewer closes instead of springing back. */
const DISMISS_DISTANCE = 110;

export type LightboxProps = {
  visible: boolean;
  items: MediaItem[];
  index: number;
  hue: number;
  layout: ShotLayout;
  onClose: () => void;
};

/** Full-screen viewer for a listing's carousel: swipe across, swipe down to close. */
export function Lightbox({ visible, items, index, hue, layout, onClose }: LightboxProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  // A percentage can't resolve against the absolutely positioned modal content.
  const { width, height } = useWindowDimensions();

  const scroller = useRef<ScrollView>(null);
  const [page, setPage] = useState(index);
  const drop = useRef(new Animated.Value(0)).current;

  // The pan responder is created once, so it reads the latest handler by ref.
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (!visible) return;
    setPage(index);
    drop.setValue(0);
    // The list is laid out by the time the modal has mounted.
    requestAnimationFrame(() => scroller.current?.scrollTo({ x: index * width, animated: false }));
  }, [drop, index, visible, width]);

  const pan = useRef(
    PanResponder.create({
      // Capture only a clearly vertical drag, so horizontal paging still works.
      onMoveShouldSetPanResponderCapture: (_, g) =>
        Math.abs(g.dy) > 14 && Math.abs(g.dy) > Math.abs(g.dx) * 1.6,
      onPanResponderMove: (_, g) => drop.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > DISMISS_DISTANCE || g.vy > 0.8) {
          close.current();
          return;
        }
        Animated.spring(drop, {
          toValue: 0,
          useNativeDriver: true,
          damping: 18,
          stiffness: 200,
        }).start();
      },
    }),
  ).current;

  const scrimOpacity = drop.interpolate({
    inputRange: [0, height * 0.5],
    outputRange: [1, 0.2],
    extrapolate: 'clamp',
  });

  // Portrait shots are tall and narrow; landscape ones fill the width.
  const wide = width - layoutTokens.gutter * 2;
  const tall = height * 0.56;
  const box =
    layout === 'horizontal'
      ? { width: wide, height: (wide * 9) / 16 }
      : { width: Math.min(wide, (tall * 9) / 16), height: tall };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={{ flex: 1, backgroundColor: c.scrim, opacity: scrimOpacity }}>
        <Animated.View style={{ flex: 1, transform: [{ translateY: drop }] }} {...pan.panHandlers}>
          <ScrollView
            ref={scroller}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
            style={{ flex: 1 }}
          >
            {items.map((item, i) => (
              <Pressable
                key={`${item.label}-${i}`}
                onPress={onClose}
                accessibilityLabel="Close media"
                style={{ width, alignItems: 'center', justifyContent: 'center' }}
              >
                {item.video ? (
                  <InlineVideo item={item} hue={hue} layout={layout} style={box} />
                ) : item.uri ? (
                  <Image
                    source={{ uri: item.uri }}
                    contentFit="contain"
                    style={[box, { borderRadius: radii.cardLg }]}
                  />
                ) : (
                  <MediaPlaceholder
                    label={item.label}
                    hue={hue}
                    radius={radii.cardLg}
                    style={box}
                  />
                )}
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>

        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={{
            position: 'absolute',
            top: insets.top + 8,
            right: layoutTokens.gutter,
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="close" size={22} color={OVER_SCRIM} />
        </Pressable>

        {items.length > 1 ? (
          <View
            style={{
              position: 'absolute',
              bottom: insets.bottom + 24,
              alignSelf: 'center',
              paddingHorizontal: 12,
              paddingVertical: 5,
              borderRadius: radii.pill,
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
            }}
          >
            <Txt font="mono" size={12} weight={500} color={OVER_SCRIM}>
              {page + 1}/{items.length}
            </Txt>
          </View>
        ) : null}
      </Animated.View>
    </Modal>
  );
}
