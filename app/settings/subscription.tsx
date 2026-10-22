import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Btn } from '@/components/ui/Btn';
import { Card } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { useToast } from '@/components/ui/Toast';
import { Label, Txt } from '@/components/ui/Txt';
import {
  FREE_DAILY_HEYS,
  FREE_MATCH_LIMIT,
  PRO_PRICE,
  PRO_PRICE_NOTE,
  useStore,
} from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radii } from '@/theme/tokens';

/** Section 10 gives free accounts one listed app. The store has no constant for it yet. */
const FREE_LISTING_LIMIT = 1;

const PRO_INCLUDES: [string, string][] = [
  ['Unlimited heys', 'Say hey to as many apps as you want each day.'],
  ['Unlimited matches', 'Keep trading past the free match limit.'],
  ['Better visibility', 'Shown to more builders who fit your ideal users.'],
  ['Full analytics', 'Views, skips, hey ratio and your most-heyed section.'],
  ['Multiple listed apps', 'Every app you ship gets its own listing.'],
];

const FREE_INCLUDES: [string, string][] = [
  [`${FREE_DAILY_HEYS} heys a day`, 'Resets every morning.'],
  [`${FREE_MATCH_LIMIT} matches`, 'Plus +3 for every builder you invite, up to +15.'],
  ['1 listed app', 'With full feedback on it.'],
];

export default function Subscription() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const toast = useToast();
  const store = useStore();

  const matchLimit = FREE_MATCH_LIMIT + store.user.bonusMatches;
  const heysUsed = Math.max(0, FREE_DAILY_HEYS - store.heysLeftToday);
  const includes = store.isPro ? PRO_INCLUDES : FREE_INCLUDES;

  const openPaywall = () => router.push({ pathname: '/paywall', params: { from: 'settings' } });

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: layout.gutter,
          paddingBottom: 10,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Back to Settings">
          <Ionicons name="chevron-back" size={26} color={c.ink} />
        </Pressable>
        <Txt font="mono" size={17} weight={500} style={{ flex: 1 }}>
          Subscription
        </Txt>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingBottom: 60, gap: 16 }}
      >
        <Card
          tone={store.isPro ? 'soft' : 'surface'}
          padding={16}
          radius={radii.cardLg}
          style={{ gap: 8 }}
        >
          <Label>Current plan</Label>
          <Txt font="mono" size={24} weight={500} color={store.isPro ? c.accentText : c.ink}>
            {store.isPro ? 'Hey100 Pro' : 'Free'}
          </Txt>
          <Txt size={13.5} lh={1.45} color={store.isPro ? c.accentText : c.muted}>
            {store.isPro
              ? `${PRO_PRICE} ${PRO_PRICE_NOTE}. Renews automatically through the App Store. Cancel any time.`
              : 'Everything you need to start trading, with limits on heys and matches.'}
          </Txt>
        </Card>

        <View style={{ gap: 12 }}>
          <Label>{store.isPro ? 'What Pro includes' : 'What free includes'}</Label>

          {includes.map(([title, body]) => (
            <View key={title} style={{ flexDirection: 'row', gap: 12 }}>
              <Ionicons name="checkmark-circle" size={19} color={c.accentText} />
              <View style={{ flex: 1 }}>
                <Txt size={15} weight={600}>
                  {title}
                </Txt>
                <Txt size={13} lh={1.45} muted style={{ marginTop: 2 }}>
                  {body}
                </Txt>
              </View>
            </View>
          ))}
        </View>

        <Card padding={16} radius={radii.cardLg} style={{ gap: 18 }}>
          <Label>Usage</Label>

          <Meter
            label="Heys today"
            used={heysUsed}
            limit={FREE_DAILY_HEYS}
            unlimited={store.isPro}
          />
          <Meter
            label="Matches"
            used={store.matches.length}
            limit={matchLimit}
            unlimited={store.isPro}
            note={
              store.user.bonusMatches
                ? `Includes +${store.user.bonusMatches} from invites`
                : undefined
            }
          />
          <Meter
            label="Listed apps"
            used={store.ownedApps.length}
            limit={FREE_LISTING_LIMIT}
            unlimited={store.isPro}
          />
        </Card>

        {store.isPro ? (
          <Card padding={16} radius={radii.cardLg} style={{ gap: 12 }}>
            <Label>Manage</Label>
            <Txt size={13.5} lh={1.45} muted>
              Billing is handled by Apple. Cancel from your App Store subscriptions.
            </Txt>
            <Btn
              label="Manage subscription"
              variant="surface"
              size="md"
              onPress={() => toast('Opens App Store subscriptions once billing is live')}
              style={{ alignSelf: 'flex-start' }}
            />
          </Card>
        ) : (
          <>
            <View style={{ gap: 11 }}>
              <Label>Go Pro</Label>

              <Pressable
                accessibilityRole="button"
                onPress={openPaywall}
                style={({ pressed }) => ({
                  borderRadius: radii.cardLg,
                  padding: 16,
                  gap: 4,
                  backgroundColor: c.surface,
                  borderWidth: 1.5,
                  borderColor: c.line,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Label size={10}>Hey100 Pro</Label>
                <Txt font="mono" size={24} weight={500}>
                  {PRO_PRICE}
                </Txt>
                <Txt size={13.5} muted>
                  {PRO_PRICE_NOTE}
                </Txt>
              </Pressable>

              <Btn
                label={`Start Pro · ${PRO_PRICE}/mo`}
                variant="accent"
                size="lg"
                full
                onPress={openPaywall}
              />
            </View>

            <Card tone="soft" padding={16} radius={radii.cardLg} style={{ gap: 10 }}>
              <Txt size={15} weight={600} color={c.accentText}>
                Or invite a builder
              </Txt>
              <Txt size={13.5} lh={1.45} color={c.accentText}>
                Free · you both get +3 matches when they publish a listing, up to +15.
              </Txt>
              <Btn
                label="Share invite"
                variant="surface"
                size="sm"
                onPress={() => router.push({ pathname: '/share', params: { kind: 'invite' } })}
                style={{ alignSelf: 'flex-start' }}
              />
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

/** Usage against a free limit. Pro reads as unlimited rather than a full bar. */
function Meter({
  label,
  used,
  limit,
  unlimited,
  note,
}: {
  label: string;
  used: number;
  limit: number;
  unlimited?: boolean;
  note?: string;
}) {
  const { c } = useTheme();

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <Txt size={14.5} weight={500} style={{ flex: 1 }}>
          {label}
        </Txt>
        <Txt font="mono" size={13} color={unlimited ? c.accentText : c.muted}>
          {unlimited ? `${used} · unlimited` : `${used} of ${limit}`}
        </Txt>
      </View>

      {unlimited ? null : <Progress value={limit ? Math.min(1, used / limit) : 0} />}

      {note ? (
        <Txt size={12} muted>
          {note}
        </Txt>
      ) : null}
    </View>
  );
}
