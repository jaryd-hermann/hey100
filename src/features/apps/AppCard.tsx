import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { Card } from '@/components/ui/Card';
import { Label, Txt } from '@/components/ui/Txt';
import type { OwnedApp } from '@/data/types';
import { listingStrength, verifiedListingStats } from '@/features/apps/listingStrength';
import { FREE_MATCH_LIMIT, useStore } from '@/store/AppStore';
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
  const store = useStore();
  const connections = store.connections[app.id] ?? {};
  const strength = listingStrength(app, connections);
  const verified = verifiedListingStats(app, connections);
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
