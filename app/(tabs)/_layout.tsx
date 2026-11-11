import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Glyph, glyphs } from '@/components/brand/Glyph';
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
import { TEAM_ID } from '@/features/chat/chatMeta';
import { teamUnreadCount, useTeamReadAt } from '@/features/chat/teamUnread';
import { useAuth } from '@/features/auth/AuthProvider';
import { useCoach } from '@/features/feedback/CoachHost';
import { useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { layout } from '@/theme/tokens';

/** Icon ink when it sits on the pink selected tile. */
const STICKER = '#111111';
const SELECTED = '#FF1C6F';

const PADDING = 6;
const TILE = 40;
const LIME = '#C6F24E';
const AnimatedPath = Animated.createAnimatedComponent(Path);

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
  const { heys, matches, messages, deletedChats } = useStore();
  const { userId } = useAuth();
  const teamReadAt = useTeamReadAt(userId);
  const teamUnread = deletedChats.includes(TEAM_ID)
    ? 0
    : teamUnreadCount(messages[TEAM_ID] ?? [], teamReadAt);
  const chatUnread =
    teamUnread +
    matches
      .filter((match) => !deletedChats.includes(match.id))
      .reduce((sum, match) => sum + (match.unread ?? 0), 0);
  const coach = useCoach();
  const routeName = state.routes[state.index]?.name;
  const [trace, setTrace] = useState(0);
  const traced = useRef<string | null>(null);
  useEffect(() => {
    if (routeName !== 'apps' && routeName !== 'feedback') {
      traced.current = null;
      return;
    }
    if (traced.current === routeName) return;
    traced.current = routeName;
    setTrace((n) => n + 1);
  }, [routeName]);
  const slots = state.routes.length;
  const [rowWidth, setRowWidth] = useState(0);
  const slide = useRef(new Animated.Value(state.index)).current;
  const metrics = useRef({ width: 0, slots: TABS.length, routes: TABS.length });
  const navRef = useRef(navigation);
  const routesRef = useRef(state.routes);
  navRef.current = navigation;
  routesRef.current = state.routes;
  metrics.current = { width: rowWidth, slots, routes: state.routes.length };

  useEffect(() => {
    Animated.spring(slide, {
      toValue: state.index,
      useNativeDriver: true,
      damping: 18,
      stiffness: 190,
      mass: 0.9,
    }).start();
  }, [slide, state.index]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
      onPanResponderMove: (e) => {
        const { width, slots: slotCount, routes } = metrics.current;
        if (!width || !slotCount) return;
        const slotWidth = (width - PADDING * 2) / slotCount;
        const x = e.nativeEvent.locationX - PADDING;
        slide.setValue(Math.max(0, Math.min(routes - 1, x / slotWidth)));
      },
      onPanResponderRelease: (e) => {
        const { width, slots: slotCount, routes } = metrics.current;
        if (!width || !slotCount) return;
        const slotWidth = (width - PADDING * 2) / slotCount;
        const x = e.nativeEvent.locationX - PADDING;
        const next = Math.max(0, Math.min(routes - 1, Math.round(x / slotWidth)));
        const route = routesRef.current[next];
        if (route) {
          Haptics.selectionAsync().catch(() => {});
          navRef.current.navigate(route.name);
        }
        Animated.spring(slide, {
          toValue: next,
          useNativeDriver: true,
          damping: 18,
          stiffness: 190,
          mass: 0.9,
        }).start();
      },
    }),
  ).current;

  const slot = rowWidth > 0 ? (rowWidth - PADDING * 2) / slots : 0;

  return (
    <View
      style={{
        position: 'absolute',
        left: layout.tabBarInset,
        right: layout.tabBarInset,
        bottom: layout.tabBarBottom,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <Glass radius={18} intensity={55} style={{ flex: 1 }}>
        <View
          onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}
          {...pan.panHandlers}
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
            const badge = tab.name === 'heys' ? heys.length : tab.name === 'chat' ? chatUnread : 0;

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
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <tab.Icon size={22} active={focused} />
                  {badge > 0 ? (
                    <View
                      style={{
                        position: 'absolute',
                        top: -4,
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
              </Pressable>
            );
          })}
        </View>
      </Glass>

      <View style={{ width: layout.tabBarHeight, height: layout.tabBarHeight }}>
        <Glass radius={18} intensity={55}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="AI chat"
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              coach.open();
            }}
            style={{
              width: layout.tabBarHeight,
              height: layout.tabBarHeight,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Glyph source={glyphs.sparkles} size={22} color={c.ink} />
          </Pressable>
        </Glass>
        {trace > 0 ? <MenuTrace key={trace} size={layout.tabBarHeight} /> : null}
      </View>
    </View>
  );
}

/**
 * A lime stroke that starts at the top center of the assistant button, runs
 * once around its edge, and disappears. Played when Apps or Feedback opens.
 */
function MenuTrace({ size }: { size: number }) {
  const radius = 18;
  const stroke = 2.5;
  const inset = stroke / 2;
  const left = inset;
  const top = inset;
  const right = size - inset;
  const bottom = size - inset;
  const r = radius - inset;
  const mid = size / 2;
  const straight = right - left - 2 * r;
  const length = straight * 4 + 2 * Math.PI * r;
  const d = [
    `M ${mid} ${top}`,
    `H ${right - r}`,
    `A ${r} ${r} 0 0 1 ${right} ${top + r}`,
    `V ${bottom - r}`,
    `A ${r} ${r} 0 0 1 ${right - r} ${bottom}`,
    `H ${left + r}`,
    `A ${r} ${r} 0 0 1 ${left} ${bottom - r}`,
    `V ${top + r}`,
    `A ${r} ${r} 0 0 1 ${left + r} ${top}`,
    `H ${mid}`,
  ].join(' ');
  const offset = useRef(new Animated.Value(length)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const run = Animated.sequence([
      Animated.timing(offset, {
        toValue: 0,
        duration: 720,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: false,
      }),
    ]);
    run.start();
    return () => run.stop();
  }, [length, offset, opacity]);

  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, opacity }}>
      <Svg width={size} height={size}>
        <AnimatedPath
          d={d}
          fill="none"
          stroke={LIME}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${length} ${length}`}
          strokeDashoffset={offset}
        />
      </Svg>
    </Animated.View>
  );
}

/** Pink rounded tile behind the selected icon. It slides between tabs. */
function SelectionPill({ slide, slot }: { slide: Animated.Value; slot: number }) {
  if (slot === 0) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: PADDING + (slot - TILE) / 2,
        top: (layout.tabBarHeight - TILE) / 2,
        width: TILE,
        height: TILE,
        borderRadius: 12,
        backgroundColor: SELECTED,
        transform: [{ translateX: Animated.multiply(slide, slot) }],
      }}
    />
  );
}
