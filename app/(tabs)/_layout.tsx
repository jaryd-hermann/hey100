import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BootScreen } from '@/components/brand/BootScreen';
import { ChatsIcon, TldrIcon, type TabIconProps } from '@/components/brand/TabIcons';
import { Txt } from '@/components/ui/Txt';
import { nextRoute, useMe } from '@/features/account/useMe';
import { useAuth } from '@/features/auth/AuthProvider';
import { htg } from '@/theme/tokens';

const TABS: { name: string; label: string; Icon: React.FC<TabIconProps> }[] = [
  { name: 'chats', label: 'Chats', Icon: ChatsIcon },
  { name: 'tldr', label: 'TLDR', Icon: TldrIcon },
];

/** Signed in, onboarded and on a plan; anything else goes back through the gates. */
export default function TabsLayout() {
  const { session, restoring } = useAuth();
  const me = useMe();

  if (restoring) return <BootScreen />;
  if (!session) return <Redirect href="/welcome" />;
  if (me.isError) return <BootScreen onRetry={() => void me.refetch()} />;
  if (me.data === undefined) return <BootScreen />;
  if (me.data === null) return <Redirect href="/welcome" />;
  const gate = nextRoute(me.data);
  if (gate !== '/(tabs)/chats') return <Redirect href={gate} />;

  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      {TABS.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.label }} />
      ))}
    </Tabs>
  );
}

function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingTop: 8,
        paddingBottom: Math.max(insets.bottom, 12),
        paddingHorizontal: 24,
        backgroundColor: 'rgba(14,16,15,0.96)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(232,236,231,0.08)',
        flexDirection: 'row',
        justifyContent: 'space-around',
      }}
    >
      {state.routes.map((route, index) => {
        const tab = TABS.find((t) => t.name === route.name);
        if (!tab) return null;
        const focused = state.index === index;

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={tab.label}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              if (!focused) navigation.navigate(route.name);
            }}
            style={{ width: 80, alignItems: 'center', gap: 4 }}
          >
            <View
              style={{
                width: 52,
                height: 32,
                borderRadius: 16,
                backgroundColor: focused ? htg.yours : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <tab.Icon active={focused} />
            </View>
            <Txt size={11} weight={focused ? 700 : 500} color={focused ? '#FFFFFF' : '#8E968F'}>
              {tab.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}
