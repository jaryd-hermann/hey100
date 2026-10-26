import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Btn } from '@/components/ui/Btn';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { Txt } from '@/components/ui/Txt';
import { shortName } from '@/data/mock';
import { captureEvent } from '@/lib/analytics';
import { getMonthlyPrice, purchaseMonthly } from '@/lib/purchases';
import {
  FREE_DAILY_HEYS,
  FREE_MATCH_LIMIT,
  PRO_PRICE,
  useStore,
} from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radii } from '@/theme/tokens';

const PERKS: [string, string][] = [
  ['Join premium groups', 'Get into groups with the strongest group power.'],
  ['Speed up your matches', 'Say hey to as many apps as you want each day, so matches come faster.'],
  ['Better visibility', 'Shown to more builders who fit your ideal users.'],
  ['More analytics', 'View, skips, hey ratio, and other key insights'],
  ['Unlimited matches', `Keep trading past the ${FREE_MATCH_LIMIT} free matches.`],
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
    if (from === 'onboarding') {
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

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingBottom: 200,
          paddingTop: 8,
        }}
      >
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
          </>
        ) : (
          <>
            <Txt font="mono" size={28} weight={500} lh={1.15} style={{ marginTop: 4 }}>
              Join the Pro Community.
            </Txt>
            <Txt font="mono" size={28} weight={500} lh={1.15}>
              Find your users faster
            </Txt>
            <Txt font="mono" size={28} weight={500} lh={1.15}>
              Meet the top builders
            </Txt>
          </>
        )}

        <View style={{ gap: 16, marginTop: 26 }}>
          {PERKS.map(([title, body]) => (
            <View key={title} style={{ flexDirection: 'row', gap: 12 }}>
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

        <Card padding={16} radius={radii.cardLg} style={{ marginTop: 26, gap: 6 }}>
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

        {atMatchLimit ? (
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
        ) : null}
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: layout.gutter,
          right: layout.gutter,
          bottom: insets.bottom + 16,
          gap: 10,
        }}
      >
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
      </View>
    </View>
  );
}
