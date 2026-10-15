import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Pressable, View } from 'react-native';

import { Glass } from '@/components/ui/Glass';
import { Txt } from '@/components/ui/Txt';
import { useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radii } from '@/theme/tokens';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; label: string; icon: IconName; active: IconName }[] = [
  { name: 'discover', label: 'Discover', icon: 'compass-outline', active: 'compass' },
  { name: 'heys', label: 'Heys', icon: 'hand-left-outline', active: 'hand-left' },
  { name: 'chat', label: 'Chat', icon: 'chatbubble-outline', active: 'chatbubble' },
  { name: 'feedback', label: 'Feedback', icon: 'reader-outline', active: 'reader' },
  { name: 'apps', label: 'Apps', icon: 'grid-outline', active: 'grid' },
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
          style={{
            height: layout.tabBarHeight,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 6,
          }}
        >
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
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: radii.pill,
                    backgroundColor: focused ? c.soft : 'transparent',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <View>
                    <Ionicons
                      name={focused ? tab.active : tab.icon}
                      size={21}
                      color={focused ? c.accentText : c.muted}
                    />
                    {badge > 0 ? (
                      <View
                        style={{
                          position: 'absolute',
                          top: -5,
                          right: -9,
                          minWidth: 17,
                          height: 17,
                          paddingHorizontal: 4,
                          borderRadius: 9,
                          backgroundColor: c.accent,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Txt font="mono" size={10} weight={700} color={c.accentInk}>
                          {badge}
                        </Txt>
                      </View>
                    ) : null}
                  </View>
                  <Txt
                    font="mono"
                    size={9}
                    weight={600}
                    color={focused ? c.accentText : c.muted}
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
