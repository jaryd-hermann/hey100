import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Txt } from '@/components/ui/Txt';
import { useToast } from '@/components/ui/Toast';
import { FlowButton } from '@/features/onboarding/FlowButton';
import { openLegal } from '@/lib/legal';
import { captureEvent } from '@/lib/analytics';
import { getMonthlyPrice, purchaseMonthly, restorePurchases } from '@/lib/purchases';
import { FREE_AUDIENCE_LIMIT, PRO_PRICE, useStore } from '@/store/AppStore';

const CHECK = require('../assets/images/octagon-check.png');
const INK = '#111111';
const NAVY = '#0020A1';
const GREEN = '#00FF00';

const GAINS: [string, string][] = [
  ['Unlimited matches', '3 matches'],
  ['Unlimited views', '6 a day'],
  ['Pro Analytics', 'Basic stats'],
  ['Unlimited apps', '1 app'],
  ['Verified badge', 'Blocks'],
  ['Premium Groups', 'Free groups'],
  ['6 target audiences', '1'],
];

const LOSSES: [string, string][] = [
  ['3 free matches', 'Unlimited'],
  ['6 views a day', 'Unlimited'],
  ['Basic stats', 'Pro Analytics'],
  ['1 app', 'Unlimited'],
  ['Blocks', 'Verified badge'],
  ['Free groups', 'Premium'],
  ['1 target audience', '6'],
];

export default function Paywall() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const store = useStore();

  const { from, reason, next, appId } = useLocalSearchParams<{
    from?: string;
    reason?: string;
    next?: string;
    appId?: string;
  }>();

  const [price, setPrice] = useState(PRO_PRICE);
  const [buying, setBuying] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [plan, setPlan] = useState<'pro' | 'free'>('pro');
  const pro = plan === 'pro';

  useEffect(() => {
    captureEvent('paywall_viewed', {
      reason: reason ?? from ?? 'unknown',
      from: from ?? null,
    });
  }, [reason, from]);

  useEffect(() => {
    void getMonthlyPrice().then((nextPrice) => {
      if (nextPrice) setPrice(nextPrice);
    });
  }, []);

  const membership = price.includes('/') ? price : `${price}/m`;
  const bg = pro ? '#0E100F' : '#FFFFFF';
  const ink = pro ? '#FFFFFF' : INK;
  const muted = pro ? 'rgba(255,255,255,0.78)' : 'rgba(17,17,17,0.72)';

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
        pathname: '/setup/bio',
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
    <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top }}>
      <StatusBar style={pro ? 'light' : 'dark'} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 22, paddingTop: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {pro ? (
          <View style={{ gap: 20 }}>
            <Txt font="mono" size={32} weight={600} lh={1.15} tracking={-1.6} color={ink}>
              Join Builder Pro{'\n'}
              <Txt font="mono" size={32} weight={600} lh={1.15} tracking={-1.6} color={GREEN}>
                Find users faster
              </Txt>
              {'\n'}Get more feedback
            </Txt>
            <View style={{ gap: 14 }}>
              {GAINS.map(([keep, drop]) => (
                <View key={keep} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Image source={CHECK} contentFit="contain" style={{ width: 28, height: 28 }} />
                  <Txt size={17} weight={700} color={ink} numberOfLines={1}>
                    {keep}{' '}
                    <Txt
                      size={15}
                      color={ink}
                      style={{ textDecorationLine: 'line-through', opacity: 0.6 }}
                    >
                      {drop}
                    </Txt>
                  </Txt>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={{ gap: 20 }}>
            <Txt font="mono" size={32} weight={600} lh={1.12} tracking={-1.6} color={ink}>
              Switching to Builder, you'll lose some stuff
            </Txt>
            <View style={{ gap: 14 }}>
              {LOSSES.map(([keep, drop]) => (
                <View key={keep} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: '#FF0000',
                      borderWidth: 2,
                      borderColor: INK,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Txt size={14} weight={700} color="#FFFF00">
                      ✕
                    </Txt>
                  </View>
                  <Txt size={17} weight={700} color={ink} numberOfLines={1}>
                    {keep}{' '}
                    <Txt
                      size={15}
                      color={ink}
                      style={{ textDecorationLine: 'line-through', opacity: 0.7 }}
                    >
                      {drop}
                    </Txt>
                  </Txt>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ flex: 1, minHeight: 36 }} />
        <View style={{ gap: 10 }}>
          <PlanRow
            name="Monthly"
            note="Builder Pro, cancel anytime"
            price={membership}
            selected={pro}
            tone="pro"
            onPress={() => setPlan('pro')}
          />
          <PlanRow
            name="Hey Basic (free)"
            note="3 matches, 6 views a day"
            price="$0"
            selected={!pro}
            tone="free"
            onPress={() => setPlan('free')}
          />
        </View>
        <View style={{ flex: 1, minHeight: 36 }} />
      </ScrollView>

      <View
        style={{
          paddingHorizontal: 20,
          paddingBottom: Math.max(insets.bottom, 16),
          gap: 12,
          backgroundColor: bg,
        }}
      >
        <FlowButton
          label={
            pro ? (buying ? 'Starting…' : `Start Pro Membership · ${membership}`) : 'Continue with Builder'
          }
          bg={pro ? '#FFFFFF' : INK}
          fg={pro ? INK : '#FFFFFF'}
          shadow={pro ? '#000000' : INK}
          dim={buying}
          onPress={pro ? () => void purchase() : dismiss}
        />
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18 }}>
          <Txt
            size={12.5}
            weight={600}
            color={muted}
            style={{ textDecorationLine: 'underline' }}
            onPress={() => openLegal('terms')}
          >
            Terms
          </Txt>
          <Txt
            size={12.5}
            weight={600}
            color={muted}
            style={{ textDecorationLine: 'underline' }}
            onPress={() => openLegal('privacy')}
          >
            Privacy
          </Txt>
          <Txt
            size={12.5}
            weight={600}
            color={muted}
            style={{ textDecorationLine: 'underline' }}
            onPress={() => void restore()}
          >
            {restoring ? 'Restoring…' : 'Restore'}
          </Txt>
        </View>
      </View>
    </View>
  );
}

function PlanRow({
  name,
  note,
  price,
  selected,
  tone,
  onPress,
}: {
  name: string;
  note: string;
  price: string;
  selected: boolean;
  tone: 'pro' | 'free';
  onPress: () => void;
}) {
  const pro = tone === 'pro';
  const fg = pro ? NAVY : '#FFFFFF';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: pro ? GREEN : '#3C3C3B',
        opacity: selected ? 1 : 0.55,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 2,
          borderColor: pro ? INK : '#FFFFFF',
          backgroundColor: selected ? (pro ? INK : '#FFFFFF') : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected ? (
          <Txt size={11} weight={700} color={pro ? GREEN : INK}>
            ✓
          </Txt>
        ) : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt size={16} weight={700} color={fg} style={{ fontFamily: 'Inter_700Bold' }}>
          {name}
        </Txt>
        <Txt size={12.5} color={fg}>
          {note}
        </Txt>
      </View>
      <Txt font="mono" size={17} weight={700} color={fg}>
        {price}
      </Txt>
    </Pressable>
  );
}
