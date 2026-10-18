import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HandMark } from '@/components/brand/Logo';
import { AppIcon } from '@/components/ui/AppIcon';
import { Btn } from '@/components/ui/Btn';
import { Glow } from '@/components/ui/Glow';
import { Txt } from '@/components/ui/Txt';
import { shortName } from '@/data/mock';
import { useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { layout } from '@/theme/tokens';

export default function MatchOverlay() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const store = useStore();

  const { appId, viaAppId, matchId, paywall } = useLocalSearchParams<{
    appId: string;
    viaAppId: string;
    /** Absent without a backend, where the thread is keyed by the app. */
    matchId?: string;
    paywall?: string;
  }>();

  const threadId = matchId || appId;

  const theirs = store.listing(appId);
  const mine = store.apps[viaAppId] ?? store.primaryApp;

  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(pop, {
      toValue: 1,
      friction: 7,
      tension: 70,
      useNativeDriver: true,
    }).start();
  }, [pop]);

  const leave = (destination?: 'chat') => {
    if (paywall === '1') {
      router.replace(`/paywall?reason=match5&next=${destination ?? 'discover'}&appId=${threadId}`);
      return;
    }
    if (destination === 'chat') {
      router.replace({ pathname: '/chat/[id]', params: { id: threadId } });
      return;
    }
    router.back();
  };

  if (!theirs) {
    return null;
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.bg,
        paddingTop: insets.top,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: layout.gutter,
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: '22%',
          left: 0,
          right: 0,
          alignItems: 'center',
        }}
      >
        <Glow size={400} style={{ position: 'relative' }} />
      </View>

      <Animated.View
        style={{
          alignItems: 'center',
          gap: 26,
          transform: [
            {
              scale: pop.interpolate({
                inputRange: [0, 1],
                outputRange: [0.86, 1],
              }),
            },
          ],
          opacity: pop,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <AppIcon
            hue={mine.hue}
            name={mine.name}
            uri={mine.icon}
            size={88}
            style={{ marginRight: -16 }}
          />
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: c.accent,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2,
              borderWidth: 3,
              borderColor: c.bg,
            }}
          >
            <HandMark size={22} />
          </View>
          <AppIcon
            hue={theirs.hue}
            name={theirs.name}
            uri={theirs.icon}
            size={88}
            style={{ marginLeft: -16 }}
          />
        </View>

        <Txt font="mono" size={27} weight={500} center>
          It&apos;s a trade
        </Txt>

        <Txt size={16} lh={1.5} center muted style={{ maxWidth: 300 }}>
          You and {theirs.builder.split(' ')[0]} agreed to use each other&apos;s apps. Test links
          and codes are unlocked.
        </Txt>

        <View style={{ alignItems: 'center', gap: 4 }}>
          <Txt font="mono" size={12} muted upper tracking={0.9}>
            via {shortName(mine.name)}
          </Txt>
        </View>
      </Animated.View>

      <View
        style={{
          position: 'absolute',
          left: layout.gutter,
          right: layout.gutter,
          bottom: insets.bottom + 24,
          gap: 10,
        }}
      >
        <Btn label="Say hi" variant="accent" size="lg" full onPress={() => leave('chat')} />
        <Btn label="Keep browsing" variant="ghost" size="lg" full onPress={() => leave()} />
      </View>
    </View>
  );
}
