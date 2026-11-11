import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Glyph, glyphs } from '@/components/brand/Glyph';
import { AppIcon } from '@/components/ui/AppIcon';
import { Card } from '@/components/ui/Card';
import { Label, Txt } from '@/components/ui/Txt';
import { queryKeys } from '@/data/repo/keys';
import { fetchListingCooldowns } from '@/data/repo/insights';
import type { OwnedApp } from '@/data/types';
import { ConnectSheets, useIntegrationActions } from '@/features/apps/connect/ConnectSheets';
import { listingStrength, verifiedListingStats } from '@/features/apps/listingStrength';
import { useAuth } from '@/features/auth/AuthProvider';
import { useDevMode } from '@/lib/devMode';
import { FREE_DAILY_VIEWS, FREE_MATCH_LIMIT, useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

export type AppCardProps = {
  app: OwnedApp;
  onShare: () => void;
  onBadges: () => void;
  onEdit: () => void;
};

/** The owner's listing card: stats, strength, and the three actions. */
export function AppCard({ app, onShare, onBadges, onEdit }: AppCardProps) {
  const { c } = useTheme();
  const router = useRouter();
  const store = useStore();
  const { userId } = useAuth();
  const { simulateCooldown } = useDevMode();
  const { data: cooldowns } = useQuery({
    queryKey: queryKeys.listingCooldowns(userId),
    queryFn: fetchListingCooldowns,
    enabled: !!userId && !store.isPro,
  });
  const cooldown = cooldowns?.find((row) => row.listingId === app.id);
  const onCooldown =
    simulateCooldown ||
    (!store.isPro && cooldown != null && cooldown.viewsToday >= FREE_DAILY_VIEWS);
  const resetsAt = simulateCooldown
    ? new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString()
    : cooldown?.resetsAt;
  const integrations = useIntegrationActions(app.id);
  const connections = integrations.connected;
  const strength = listingStrength(app, connections);
  const verified = verifiedListingStats(app, connections);
  const inbox = store.inbox[app.id];
  const views = inbox?.funnel.views ?? (app.views ? String(app.views) : '0');
  const heys = inbox?.funnel.heys ?? (app.likes !== '—' ? app.likes : '0');
  const matches = store.matches.filter((match) => match.viaAppId === app.id).length;
  const status = app.listedUntilDays
    ? `listed · ${app.listedUntilDays} days left`
    : store.isPro
      ? 'listed · Pro'
      : `${app.primary ? 'Primary · ' : ''}free · ${store.matches.length} of ${FREE_MATCH_LIMIT + store.user.bonusMatches} matches`;

  return (
    <Card padding={16} radius={radii.cardLg} style={{ gap: 14, overflow: 'hidden' }}>
      {onCooldown ? (
        <Pressable
          onPress={() => router.push('/paywall')}
          style={{
            marginHorizontal: -16,
            marginTop: -16,
            paddingHorizontal: 16,
            paddingVertical: 10,
            backgroundColor: '#FF0000',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Glyph source={glyphs.flame} size={16} color="#FFFF00" />
          <CooldownTick resetsAt={resetsAt} active={onCooldown} />
          <Txt size={12.5} weight={700} color="#FFFF00" style={{ flex: 1 }}>
            Daily views used · back in {countdownLabel(resetsAt)}
          </Txt>
          <Txt size={12.5} weight={700} color="#FFFF00">
            Get visible now
          </Txt>
        </Pressable>
      ) : null}
      <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel={`View and edit ${app.name}`}>
        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
            <AppIcon hue={app.hue} name={app.name} uri={app.icon} size={52} />
            <View style={{ flex: 1 }}>
              <Txt font="mono" size={15} weight={500} numberOfLines={1}>
                {app.name}
              </Txt>
              <Txt size={12.5} muted numberOfLines={1}>
                {status}
              </Txt>
            </View>
          </View>

          <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: c.line, paddingTop: 13 }}>
            {(
              [
                ['Views', views],
                ['Heys', heys],
                ['Matches', String(matches)],
              ] as const
            ).map(([label, value]) => (
              <View key={label} style={{ flex: 1, gap: 2 }}>
                <Txt font="mono" size={17} weight={500}>
                  {value}
                </Txt>
                <Label size={10}>{label}</Label>
              </View>
            ))}
          </View>

          <View style={{ gap: 6 }}>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: c.raised, overflow: 'hidden' }}>
              <View
                style={{
                  width: `${Math.round(strength.ratio * 100)}%`,
                  height: 6,
                  backgroundColor: c.accent,
                }}
              />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <Txt size={11.5} muted style={{ flexGrow: 1 }}>
                Listing strength · {strength.done}/{strength.total}
              </Txt>
              {verified.revenue || verified.customers ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  {verified.revenue ? <VerifiedStat value={verified.revenue} /> : null}
                  {verified.customers ? <VerifiedStat value={verified.customers} /> : null}
                </View>
              ) : null}
            </View>
          </View>
        </View>
        </Pressable>

      <View style={{ gap: 8 }}>
        {(
          [
            ['stripe', 'Stripe', 'Verify revenue'],
            ['revenuecat', 'RevenueCat', 'Verify customers'],
            ['github', 'GitHub', 'Verify commits'],
            ['posthog', 'PostHog', 'Verify usage'],
          ] as const
        ).map(([key, label, detail]) => {
          const on = !!connections[key];
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              onPress={() => void integrations.run(key)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
            >
              <Ionicons
                name={on ? 'checkmark-circle' : 'ellipse-outline'}
                size={18}
                color={on ? c.accentText : c.muted}
              />
              <Txt size={13.5} weight={600} style={{ flex: 1 }}>
                {label}
              </Txt>
              <Txt size={12.5} muted>
                {on ? 'Verified' : detail}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(
          [
            ['Share', onShare],
            ['Badges', onBadges],
            ['View/Edit', onEdit],
          ] as const
        ).map(([label, onPress]) => (
          <Pressable
            key={label}
            onPress={onPress}
            style={({ pressed }) => ({
              flex: 1,
              height: 40,
              borderRadius: radii.pill,
              borderWidth: 1.5,
              borderColor: c.line,
              backgroundColor: c.raised,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Txt size={13} weight={600}>
              {label}
            </Txt>
          </Pressable>
        ))}
      </View>
      <ConnectSheets
        appId={app.id}
        appName={app.name}
        storeUrl={app.storeUrl}
        appIcon={app.icon}
        appHue={app.hue}
        sheet={integrations.sheet}
        onClose={() => integrations.setSheet(null)}
      />
    </Card>
  );
}

function countdownLabel(iso?: string): string {
  if (!iso) return 'a few hours';
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'a moment';
  const hours = Math.floor(ms / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  if (hours >= 1) return `${hours}h ${mins}m`;
  return `${Math.max(1, mins)}m`;
}

function CooldownTick({ resetsAt, active }: { resetsAt?: string; active: boolean }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, [active, resetsAt]);
  return null;
}

function VerifiedStat({ value }: { value: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <Txt size={11.5} weight={600}>
        {value}
      </Txt>
      <Ionicons name="checkmark-circle" size={13} color={c.accentText} />
    </View>
  );
}
