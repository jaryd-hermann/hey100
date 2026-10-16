import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Btn } from '@/components/ui/Btn';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { Label, Txt } from '@/components/ui/Txt';
import { shortName } from '@/data/mock';
import { captureEvent } from '@/lib/analytics';
import { FREE_MATCH_LIMIT, useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radii } from '@/theme/tokens';

type PlanId = 'monthly' | 'season';

const PLANS: { id: PlanId; name: string; price: string; note: string }[] = [
  { id: 'monthly', name: 'Monthly', price: '$9.99', note: 'per month' },
  { id: 'season', name: 'Launch season', price: '$24.99', note: '90 days' },
];

const PERKS: [string, string][] = [
  [
    'Unlimited heys',
    'Say hey to as many apps as you want each day, so matches come faster.',
  ],
  ['Better visibility', 'Shown to more builders who fit your ideal users.'],
  [
    'More analytics',
    'Views, skips, hey ratio and which part of your page gets the most heys.',
  ],
  ['Unlimited matches', 'Keep trading past the 5 free matches.'],
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

  const [plan, setPlan] = useState<PlanId>('season');
  const atMatchLimit = reason === 'match5';

  const dismiss = () => {
    if (from === 'onboarding') {
      router.replace({ pathname: '/my-app/[id]', params: { id: 'tide', setup: '1' } });
      return;
    }
    if (next === 'chat' && appId) {
      router.replace({ pathname: '/chat/[id]', params: { id: appId } });
      return;
    }
    router.back();
  };

  const purchase = () => {
    // Apple IAP via RevenueCat replaces this once the native module is wired.
    store.setPlan('pro');
    captureEvent('pro_started', { plan, reason: reason ?? from ?? 'unknown' });
    toast(plan === 'season' ? 'Launch season started' : 'Hey100 Pro started');
    dismiss();
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
              You&apos;ve made 5 builder connections.
            </Txt>
            <Txt size={15.5} lh={1.5} muted style={{ marginTop: 12 }}>
              List {shortName(store.primaryApp.name)} to keep matching. Your existing chats stay
              open either way.
            </Txt>
          </>
        ) : (
          <>
            <Label>Hey100 Pro</Label>
            <Txt font="mono" size={27} weight={500} lh={1.22} style={{ marginTop: 10 }}>
              Find your first 100 users faster.
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

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 26 }}>
          {PLANS.map((option) => {
            const active = plan === option.id;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                onPress={() => setPlan(option.id)}
                style={{
                  flex: 1,
                  borderRadius: radii.cardLg,
                  padding: 16,
                  gap: 4,
                  backgroundColor: active ? c.raised : c.surface,
                  borderWidth: 1.5,
                  borderColor: active ? c.ink : c.line,
                }}
              >
                <Label size={10}>{option.name}</Label>
                <Txt font="mono" size={20} weight={500}>
                  {option.price}
                </Txt>
                <Txt size={12.5} muted>
                  {option.note}
                </Txt>
              </Pressable>
            );
          })}
        </View>

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
          label={
            plan === 'season' ? 'Start launch season · $24.99' : 'Start Pro · $9.99/mo'
          }
          variant="accent"
          size="lg"
          full
          onPress={purchase}
        />
        <Btn
          label={atMatchLimit ? 'Not now' : 'Start free · 8 heys a day, 5 matches'}
          variant="ghost"
          size="md"
          full
          onPress={dismiss}
        />
      </View>
    </View>
  );
}
