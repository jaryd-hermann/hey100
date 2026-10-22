import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { AppIcon, Avatar } from '@/components/ui/AppIcon';
import { Btn } from '@/components/ui/Btn';
import { Card } from '@/components/ui/Card';
import { Label, Txt } from '@/components/ui/Txt';
import { MILESTONES } from '@/data/mock';
import { listingStrength } from '@/features/apps/listingStrength';
import type { OwnedApp } from '@/data/types';
import { BadgesSheet } from '@/features/apps/BadgesSheet';
import { ShareListingSheet } from '@/features/apps/ShareListingSheet';
import { useDevMode } from '@/lib/devMode';
import { FREE_MATCH_LIMIT, useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

export default function AppsScreen() {
  const router = useRouter();
  const { c, isDark } = useTheme();
  const store = useStore();
  const { devMode } = useDevMode();
  const [shareApp, setShareApp] = useState<OwnedApp | null>(null);
  const [badgeApp, setBadgeApp] = useState<OwnedApp | null>(null);

  return (
    <Screen
      title="My apps"
      headerRight={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Pressable onPress={() => router.push('/settings')} hitSlop={8} accessibilityLabel="Settings">
            <Ionicons name="settings-outline" size={22} color={c.ink} />
          </Pressable>
          <Pressable onPress={() => router.push('/profile')} hitSlop={8} accessibilityLabel="Profile">
            <Avatar name={store.user.realName} uri={store.user.photo} size={30} />
          </Pressable>
        </View>
      }
    >
      <View style={{ gap: 12 }}>
        {store.ownedApps.map((app) => (
          <AppCard
            key={app.id}
            app={app}
            onShare={() => setShareApp(app)}
            onBadges={() => setBadgeApp(app)}
            onEdit={() => router.push({ pathname: '/my-app/[id]', params: { id: app.id } })}
          />
        ))}

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/add-app')}
          style={({ pressed }) => ({
            height: 58,
            borderRadius: radii.cardLg,
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: c.muted,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 9,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Ionicons name="add" size={19} color={c.muted} />
          <Txt size={15} weight={600} muted>
            List another app
          </Txt>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/tools')}
          style={({ pressed }) => ({
            minHeight: 58,
            borderRadius: radii.cardLg,
            borderWidth: 1.5,
            borderColor: c.line,
            backgroundColor: c.surface,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Txt size={14.5} weight={600}>
              Explore top products used by builders
            </Txt>
            <Txt size={12} muted>
              Tools we recommend — and sometimes sponsor
            </Txt>
          </View>
          <Ionicons name="chevron-forward" size={20} color={c.muted} />
        </Pressable>

        <View style={{ marginTop: 18, gap: 12 }}>
          <Label>Milestones</Label>

          {devMode
            ? MILESTONES.map((milestone) => (
                <MilestoneCard
                  key={milestone.id}
                  title={milestone.title}
                  sub={milestone.sub}
                  badge={milestone.badge}
                  onShare={() =>
                    router.push({
                      pathname: '/share',
                      params: { kind: 'milestone', milestoneId: milestone.id },
                    })
                  }
                />
              ))
            : (
                <View style={{ gap: 10 }}>
                  <LockedMilestone
                    title="First match"
                    sub="You and another builder agreed to trade apps"
                    badge="🎉"
                    caption="Unlocks after your first match"
                    dim={isDark}
                  />
                  <LockedMilestone
                    title="First completed trade"
                    sub="Both of you sent feedback"
                    badge="🤝"
                    caption="Unlocks after your first completed trade"
                    dim={isDark}
                  />
                </View>
              )}
        </View>
      </View>

      <ShareListingSheet visible={!!shareApp} app={shareApp} onClose={() => setShareApp(null)} />
      <BadgesSheet visible={!!badgeApp} app={badgeApp} onClose={() => setBadgeApp(null)} />
    </Screen>
  );
}

function LockedMilestone({
  title,
  sub,
  badge,
  caption,
  dim,
}: {
  title: string;
  sub: string;
  badge: string;
  caption: string;
  dim: boolean;
}) {
  return (
    <View style={{ borderRadius: radii.cardLg, overflow: 'hidden' }}>
      <MilestoneCard title={title} sub={sub} badge={badge} />
      <BlurView
        intensity={26}
        tint="dark"
        style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}
      >
        <View
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: dim ? 'rgba(14, 16, 15, 0.28)' : 'rgba(242, 243, 239, 0.28)',
          }}
        />
        <Txt size={13} weight={600}>
          {caption}
        </Txt>
      </BlurView>
    </View>
  );
}

function MilestoneCard({
  title,
  sub,
  badge,
  onShare,
}: {
  title: string;
  sub: string;
  badge: string;
  onShare?: () => void;
}) {
  const { c } = useTheme();

  return (
    <Card padding={14} radius={radii.cardLg}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 13,
            backgroundColor: c.soft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Txt size={19}>{badge}</Txt>
        </View>
        <View style={{ flex: 1 }}>
          <Txt size={14.5} weight={600} lh={1.3}>
            {title}
          </Txt>
          <Txt size={12.5} muted numberOfLines={2} style={{ marginTop: 2 }}>
            {sub}
          </Txt>
        </View>
        <Btn label="Share" variant="surface" size="sm" dim={!onShare} onPress={onShare} />
      </View>
    </Card>
  );
}

function AppCard({
  app,
  onShare,
  onBadges,
  onEdit,
}: {
  app: OwnedApp;
  onShare: () => void;
  onBadges: () => void;
  onEdit: () => void;
}) {
  const { c } = useTheme();
  const store = useStore();
  const strength = listingStrength(app, store.connections[app.id] ?? {});
  const status = app.listedUntilDays
    ? `listed · ${app.listedUntilDays} days left`
    : store.isPro
      ? 'listed · Pro'
      : `${app.primary ? 'Primary · ' : ''}free · ${store.matches.length} of ${FREE_MATCH_LIMIT + store.user.bonusMatches} matches`;

  return (
    <Card padding={16} radius={radii.cardLg} style={{ gap: 14 }}>
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
                ['Views', String(app.views)],
                ['Heys', app.likes],
                ['Matches', String(app.matches)],
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
            <Txt size={11.5} muted>
              Listing strength · {strength.done}/{strength.total}
              {strength.items.find((item) => item.key === 'verified')?.done ? ' · verified' : ''}
            </Txt>
          </View>
        </View>
      </Pressable>

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
    </Card>
  );
}
