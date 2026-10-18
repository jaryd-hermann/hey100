import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { AppIcon, Avatar } from '@/components/ui/AppIcon';
import { Btn } from '@/components/ui/Btn';
import { Card } from '@/components/ui/Card';
import { Label, Txt } from '@/components/ui/Txt';
import { INTEGRATIONS, MILESTONES, shortName } from '@/data/mock';
import type { OwnedApp } from '@/data/types';
import { FREE_MATCH_LIMIT, useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

export default function AppsScreen() {
  const router = useRouter();
  const { c } = useTheme();
  const store = useStore();

  return (
    <Screen
      title="Apps"
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
          <AppCard key={app.id} app={app} />
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

        <View style={{ marginTop: 18, gap: 12 }}>
          <Label>Milestones</Label>

          {MILESTONES.map((milestone) => (
            <Card key={milestone.id} padding={14} radius={radii.cardLg}>
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
                  <Txt size={19}>{milestone.badge}</Txt>
                </View>

                <View style={{ flex: 1 }}>
                  <Txt size={14.5} weight={600} lh={1.3}>
                    {milestone.title}
                  </Txt>
                  <Txt size={12.5} muted numberOfLines={2} style={{ marginTop: 2 }}>
                    {milestone.sub}
                  </Txt>
                </View>

                <Btn
                  label="Share"
                  variant="surface"
                  size="sm"
                  onPress={() =>
                    router.push({
                      pathname: '/share',
                      params: { kind: 'milestone', milestoneId: milestone.id },
                    })
                  }
                />
              </View>
            </Card>
          ))}
        </View>
      </View>
    </Screen>
  );
}

function AppCard({ app }: { app: OwnedApp }) {
  const router = useRouter();
  const { c } = useTheme();
  const store = useStore();

  const connected = Object.values(store.connections[app.id] ?? {}).filter(Boolean).length;

  const status = app.listedUntilDays
    ? `listed · ${app.listedUntilDays} days left`
    : store.isPro
      ? 'listed · Pro'
      : `${app.primary ? 'Primary · ' : ''}free · ${store.matches.length} of ${FREE_MATCH_LIMIT + store.user.bonusMatches} matches`;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/my-app/[id]', params: { id: app.id } })}
      style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
    >
      <Card padding={16} radius={radii.cardLg} style={{ gap: 14 }}>
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
          <Ionicons name="chevron-forward" size={18} color={c.muted} />
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
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {INTEGRATIONS.map((integration, index) => (
              <View
                key={integration.key}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: index < connected ? c.accent : c.raised,
                }}
              />
            ))}
          </View>
          <Txt size={11.5} muted>
            {connected}/4 verified
          </Txt>
        </View>
      </Card>
    </Pressable>
  );
}
