import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Btn } from '@/components/ui/Btn';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { Txt } from '@/components/ui/Txt';
import { shortName } from '@/data/mock';
import { LegalRow } from '@/features/legal/LegalLinks';
import { captureEvent } from '@/lib/analytics';
import { getMonthlyPrice, purchaseMonthly, restorePurchases } from '@/lib/purchases';
import {
  FREE_AUDIENCE_LIMIT,
  FREE_DAILY_HEYS,
  FREE_DAILY_VIEWS,
  FREE_MATCH_LIMIT,
  PRO_PRICE,
  useStore,
} from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radii } from '@/theme/tokens';

const PERKS: [string, string][] = [
  ['Join premium groups', 'Get into groups with the strongest group power.'],
  ['Speed up your matches', `Unlimited heys, keep chatting past ${FREE_MATCH_LIMIT}/day`],
  ['Extra visibility. More audiences', 'Shown to more builders who fit your ideal users.'],
  ['No daily cooldowns', `Skip the ${FREE_DAILY_VIEWS} views per day.`],
  ['List unlimited products', 'Free accounts can list one product.'],
  ['Pro insights & analytics', 'Fit sentiment, scroll depth, and an AI listing coach.'],
  ['AI assistant', 'Tips & advice based on top apps and builders'],
];

export default function Paywall() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const toast = useToast();
  const store = useStore();

  const { from, reason, next, appId } = useLocalSearchParams<{
    from?: string;
    reason?: string;
    next?: string;
    appId?: string;
  }>();

  const atMatchLimit = reason === 'match5';
  const [price, setPrice] = useState(PRO_PRICE);
  const [buying, setBuying] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    captureEvent('paywall_viewed', {
      reason: reason ?? from ?? 'unknown',
      from: from ?? null,
    });
  }, [reason, from]);

  useEffect(() => {
    void getMonthlyPrice().then((next) => {
      if (next) setPrice(next);
    });
  }, []);

  const dismiss = () => {
    if (from === 'onboarding' || from === 'audiences') {
      const interests = (store.primaryApp.ideal?.interests ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      if (from === 'onboarding' && !store.isPro && interests.length > FREE_AUDIENCE_LIMIT) {
        router.replace('/setup/audiences');
        return;
      }
      router.replace({
        pathname: '/setup/notifications',
        params: { appId: store.primaryApp.id },
      });
      return;
    }
    if (next === 'chat' && appId) {
      router.replace({ pathname: '/chat/[id]', params: { id: appId } });
      return;
    }
    router.back();
  };

  const restore = async () => {
    if (buying || restoring) return;
    setRestoring(true);
    try {
      const result = await restorePurchases();
      if ('message' in result) {
        toast(result.message);
        return;
      }
      store.setPlan(result.pro ? 'pro' : 'free');
      toast(result.pro ? 'Pro restored' : 'No Pro subscription on this Apple ID');
      if (result.pro) dismiss();
    } finally {
      setRestoring(false);
    }
  };

  const purchase = async () => {
    if (buying) return;
    setBuying(true);
    try {
      const result = await purchaseMonthly();
      if (result.status === 'cancelled') return;
      if (result.status === 'unavailable') {
        toast(result.message);
        return;
      }
      if (result.pro) store.setPlan('pro');
      captureEvent('pro_started', { plan: 'monthly', reason: reason ?? from ?? 'unknown' });
      toast('Hey100 Pro started');
      dismiss();
    } finally {
      setBuying(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          paddingHorizontal: layout.gutter,
          paddingTop: 6,
        }}
      >
        <Pressable onPress={dismiss} hitSlop={12} accessibilityLabel="Close">
          <Ionicons name="close" size={26} color={c.muted} />
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: layout.gutter, paddingBottom: 8 }}>
        {atMatchLimit ? (
          <>
            <Txt font="mono" size={64} weight={700} color={c.accentText}>
              {FREE_MATCH_LIMIT}
            </Txt>
            <Txt font="mono" size={25} weight={500} lh={1.25} style={{ marginTop: 10 }}>
              You&apos;ve made {FREE_MATCH_LIMIT} builder connections.
            </Txt>
            <Txt size={15.5} lh={1.5} muted style={{ marginTop: 12 }}>
              List {shortName(store.primaryApp.name)} to keep matching. Your existing chats stay
              open either way.
            </Txt>
            <Card tone="soft" padding={16} style={{ marginTop: 16, gap: 10 }}>
              <Txt size={15} weight={600} color={c.accentText}>
                Or invite a builder to keep going
              </Txt>
              <Txt size={13.5} lh={1.45} color={c.accentText}>
                Free · you both get +3 matches when they publish a listing.
              </Txt>
              <Btn
                label="Share invite"
                variant="surface"
                size="sm"
                onPress={() =>
                  router.push({
                    pathname: '/share',
                    params: { kind: 'invite' },
                  })
                }
                style={{ alignSelf: 'flex-start', marginTop: 4 }}
              />
            </Card>
          </>
        ) : (
          <>
            <Txt font="mono" size={28} weight={500} lh={1.15} style={{ marginTop: 4 }}>
              Join the Pro Community.
            </Txt>
            <Txt font="mono" size={28} weight={500} lh={1.15} color={c.accentText}>
              Find your users faster
            </Txt>
            <Txt font="mono" size={28} weight={500} lh={1.15}>
              Meet the top builders
            </Txt>
          </>
        )}
      </View>

      <View style={{ flex: 1 }}>
        <LoopingPerks />
        <LinearGradient
          pointerEvents="none"
          colors={[c.bg, `${c.bg}00`]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 28 }}
        />
        <LinearGradient
          pointerEvents="none"
          colors={[`${c.bg}00`, c.bg]}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 28 }}
        />
      </View>

      <View
        style={{
          backgroundColor: c.bg,
          paddingHorizontal: layout.gutter,
          paddingTop: 8,
          paddingBottom: insets.bottom + 16,
          gap: 10,
        }}
      >
        <Card padding={16} radius={radii.cardLg} style={{ gap: 6 }}>
          <Txt size={15} weight={600}>
            One plan only. Cancel whenever
          </Txt>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Txt font="mono" size={40} weight={700}>
              {price}
            </Txt>
            <Txt size={16} weight={600}>
              a month
            </Txt>
          </View>
        </Card>
        <Btn
          label={buying ? 'Starting Pro…' : `Start Pro · ${price}/mo`}
          variant="accent"
          size="lg"
          full
          disabled={buying}
          onPress={() => void purchase()}
        />
        <Btn
          label={
            atMatchLimit
              ? 'Not now'
              : `Start free · ${FREE_DAILY_HEYS} heys a day, ${FREE_MATCH_LIMIT} matches`
          }
          variant="ghost"
          size="md"
          full
          onPress={dismiss}
        />
        <LegalRow
          restoreLabel={restoring ? 'Restoring…' : 'Restore'}
          onRestore={() => void restore()}
        />
      </View>
    </View>
  );
}

const LOOP_COPIES = 3;

function LoopingPerks() {
  const { c } = useTheme();
  const scroll = useRef<ScrollView>(null);
  const cycle = useRef(0);
  const wrapping = useRef(false);
  const lastTick = useRef(-1);
  const primed = useRef(false);

  const tick = (y: number) => {
    const height = cycle.current;
    if (!height || wrapping.current || !primed.current) return;
    const row = height / PERKS.length;
    const index = Math.floor((y + row / 2) / row);
    if (index === lastTick.current) return;
    lastTick.current = index;
    Haptics.selectionAsync().catch(() => {});
  };

  const wrap = (y: number) => {
    const height = cycle.current;
    if (!height || wrapping.current) return;
    tick(y);
    if (y < height) {
      wrapping.current = true;
      scroll.current?.scrollTo({ y: y + height, animated: false });
      wrapping.current = false;
    } else if (y >= height * 2) {
      wrapping.current = true;
      scroll.current?.scrollTo({ y: y - height, animated: false });
      wrapping.current = false;
    }
  };

  return (
    <ScrollView
      ref={scroll}
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={(event) => wrap(event.nativeEvent.contentOffset.y)}
      onMomentumScrollEnd={(event) => wrap(event.nativeEvent.contentOffset.y)}
      contentContainerStyle={{
        paddingHorizontal: layout.gutter,
        paddingVertical: 28,
        gap: 16,
      }}
    >
      {Array.from({ length: LOOP_COPIES }, (_, copy) => (
        <View
          key={copy}
          style={{ gap: 16 }}
          onLayout={
            copy === 0
              ? (event) => {
                  const next = event.nativeEvent.layout.height + 16;
                  const first = cycle.current === 0;
                  cycle.current = next;
                  if (first) {
                    lastTick.current = PERKS.length;
                    scroll.current?.scrollTo({ y: next, animated: false });
                    requestAnimationFrame(() => {
                      primed.current = true;
                    });
                  }
                }
              : undefined
          }
        >
          {PERKS.map(([title, body]) => (
            <View key={`${copy}-${title}`} style={{ flexDirection: 'row', gap: 12 }}>
              <Ionicons name="checkmark-circle" size={19} color={c.accentText} />
              <View style={{ flex: 1 }}>
                <Txt size={15.5} weight={600}>
                  {title}
                </Txt>
                <Txt size={13.5} lh={1.45} muted style={{ marginTop: 2 }}>
                  {body}
                </Txt>
              </View>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}
