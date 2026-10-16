import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';

import {
  AppsIcon,
  ChatIcon,
  DiscoverIcon,
  FeedbackIcon,
  HeysIcon,
  type TabIconProps,
} from '@/components/brand/TabIcons';
import { Glass } from '@/components/ui/Glass';
import { Txt } from '@/components/ui/Txt';
import { useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radii } from '@/theme/tokens';

/** The selected sticker sits on a white pill, so its label is sticker black. */
const STICKER = '#111111';

const PADDING = 6;
const PILL_INSET = 3;
const PILL_HEIGHT = 54;

const TABS: { name: string; label: string; Icon: React.FC<TabIconProps> }[] = [
  { name: 'discover', label: 'Discover', Icon: DiscoverIcon },
  { name: 'heys', label: 'Heys', Icon: HeysIcon },
  { name: 'chat', label: 'Chat', Icon: ChatIcon },
  { name: 'feedback', label: 'Feedback', Icon: FeedbackIcon },
  { name: 'apps', label: 'Apps', Icon: AppsIcon },
];

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.label }} />
      ))}
    </Tabs>
  );
}

function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const { c } = useTheme();
  const { heys } = useStore();
  const [rowWidth, setRowWidth] = useState(0);
  const slide = useRef(new Animated.Value(state.index)).current;

  useEffect(() => {
    Animated.spring(slide, {
      toValue: state.index,
      useNativeDriver: true,
      damping: 18,
      stiffness: 190,
      mass: 0.9,
    }).start();
  }, [slide, state.index]);

  const slot = rowWidth > 0 ? (rowWidth - PADDING * 2) / state.routes.length : 0;

  return (
    <View
      style={{
        position: 'absolute',
        left: layout.tabBarInset,
        right: layout.tabBarInset,
        bottom: layout.tabBarBottom,
      }}
    >
      <Glass radius={radii.pill} intensity={55}>
        <View
          onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}
          style={{
            height: layout.tabBarHeight,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: PADDING,
          }}
        >
          <SelectionPill slide={slide} slot={slot} />

          {state.routes.map((route, index) => {
            const tab = TABS.find((t) => t.name === route.name);
            if (!tab) return null;

            const focused = state.index === index;
            const badge = tab.name === 'heys' ? heys.length : 0;

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={tab.label}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  if (!focused) navigation.navigate(route.name);
                }}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }}
              >
                <View style={{ alignItems: 'center', gap: 1 }}>
                  <View>
                    <tab.Icon size={24} active={focused} />
                    {badge > 0 ? (
                      <View
                        style={{
                          position: 'absolute',
                          top: -3,
                          right: -10,
                          minWidth: 18,
                          height: 18,
                          paddingHorizontal: 4,
                          borderRadius: 9,
                          backgroundColor: c.accent,
                          borderWidth: 1.5,
                          borderColor: STICKER,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Txt font="mono" size={10} weight={700} color={STICKER}>
                          {badge}
                        </Txt>
                      </View>
                    ) : null}
                  </View>
                  <Txt
                    font="mono"
                    size={9}
                    weight={600}
                    color={focused ? STICKER : c.muted}
                    numberOfLines={1}
                  >
                    {tab.label}
                  </Txt>
                </View>
              </Pressable>
            );
          })}
        </View>
      </Glass>
    </View>
  );
}

/** The white indicator slides between tabs with a glass sheen over it. */
function SelectionPill({ slide, slot }: { slide: Animated.Value; slot: number }) {
  if (slot === 0) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: PADDING + PILL_INSET,
        top: (layout.tabBarHeight - PILL_HEIGHT) / 2,
        width: slot - PILL_INSET * 2,
        height: PILL_HEIGHT,
        borderRadius: radii.pill,
        backgroundColor: '#FFFFFF',
        transform: [{ translateX: Animated.multiply(slide, slot) }],
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 3 },
      }}
    >
      <View style={{ flex: 1, borderRadius: radii.pill, overflow: 'hidden' }}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={14} tint="light" style={StyleSheet.absoluteFill} />
        ) : null}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 10,
            right: 10,
            height: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
          }}
        />
      </View>
    </Animated.View>
  );
}
