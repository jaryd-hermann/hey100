import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';

import { Avatar } from '@/components/ui/AppIcon';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Sheet } from '@/components/ui/Sheet';
import { Label, Txt } from '@/components/ui/Txt';
import { shortName } from '@/data/mock';
import type { AppConnection, AppListing, OwnedApp } from '@/data/types';
import { recordProfileView } from '@/data/repo/notifications';
import { builderFromUser } from '@/features/profile/builderCard';
import { isServerId } from '@/lib/supabase';
import { useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

type SocialRow = [kind: string, value: string, icon: React.ComponentProps<typeof Ionicons>['name']];

const SOCIAL_ICONS: Record<string, SocialRow[2]> = {
  X: 'logo-twitter',
  GitHub: 'logo-github',
  LinkedIn: 'logo-linkedin',
  Instagram: 'logo-instagram',
  TikTok: 'logo-tiktok',
  YouTube: 'logo-youtube',
  Discord: 'logo-discord',
  Web: 'globe-outline',
};

export type BuilderSheetProps = {
  visible: boolean;
  listing: AppListing | OwnedApp | null;
  onClose: () => void;
  onOpenLink: (kind: string, value: string) => void;
};

/**
 * The developer sheet. Before a match this shows whatever the builder chose to
 * display in Discover, which may be a username rather than their real name.
 */
export function BuilderSheet({ visible, listing, onClose, onOpenLink }: BuilderSheetProps) {
  const { c } = useTheme();
  const store = useStore();
  const mine = !!listing && store.ownedApps.some((app) => app.id === listing.id);

  useEffect(() => {
    if (!visible || !listing || mine || !isServerId(listing.id)) return;
    void recordProfileView(listing.id);
  }, [listing, mine, visible]);

  if (!listing) return <Sheet visible={false} onClose={onClose} children={null} />;
  const card = mine ? { ...listing, ...builderFromUser(store.user) } : listing;
  const socials: SocialRow[] = (mine ? store.user.socials : (listing.builderSocials ?? []))
    .filter(([, value]) => !!value)
    .map(([kind, value]) => [kind, value, SOCIAL_ICONS[kind] ?? 'globe-outline']);

  const commits = mine ? store.user.githubCommits : listing.githubCommits;
  const verified = verifiedStats(
    listing,
    mine
      ? store.ownedApps.flatMap((app) => Object.values(store.connections[app.id] ?? {}))
      : [],
  );
  const stats: [string, string][] = [
    [verified.revenue, 'Verified revenue'],
    [verified.customers, 'Verified customers'],
    [commits != null ? commits.toLocaleString() : '—', 'GitHub'],
  ];

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Avatar name={card.builder} uri={card.builderPhoto} size={60} />
          <View style={{ flex: 1 }}>
            <Txt size={19} weight={700}>
              {card.builder}
            </Txt>
            {card.role ? (
              <Txt size={13.5} muted>
                {card.role}
              </Txt>
            ) : null}
            <Txt size={13.5} muted style={{ marginTop: 2 }}>
              Building {shortName(listing.name)}
            </Txt>
          </View>
        </View>

        <Card padding={16}>
          <View style={{ flexDirection: 'row' }}>
            {stats.map(([value, label]) => (
              <View key={label} style={{ flex: 1, gap: 3 }}>
                <Txt font="mono" size={19} weight={500}>
                  {value}
                </Txt>
                <Label size={10}>{label}</Label>
              </View>
            ))}
          </View>
        </Card>

        {card.style ? (
          <Card tone="soft" padding={14}>
            <Txt size={14} lh={1.45} color={c.accentText}>
              {card.style}
            </Txt>
          </Card>
        ) : null}

        {(card.skills ?? []).length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {card.skills!.slice(0, 8).map((skill) => (
              <Chip key={skill} label={skill} size="sm" />
            ))}
          </View>
        ) : null}

        <View style={{ gap: 8 }}>
          {socials.map(([kind, value, icon]) => (
            <Pressable
              key={kind}
              accessibilityRole="button"
              onPress={() => onOpenLink(kind, value)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 15,
                height: 52,
                borderRadius: radii.option,
                backgroundColor: c.surface,
                borderWidth: 1,
                borderColor: c.line,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Ionicons name={icon} size={18} color={c.ink} />
              <Txt size={14.5} weight={500} style={{ flex: 1 }}>
                {kind}
              </Txt>
              <Txt size={13} muted numberOfLines={1} style={{ maxWidth: 150 }}>
                {value}
              </Txt>
              <Ionicons name="chevron-forward" size={16} color={c.muted} />
            </Pressable>
          ))}
        </View>
      </View>
    </Sheet>
  );
}

function connectionLines(row?: AppConnection): string[] {
  if (!row) return [];
  return [row.badge, row.on, row.detail, ...(row.badges ?? [])].filter(
    (line): line is string => !!line,
  );
}

function bandFrom(lines: string[], pattern: RegExp): string | null {
  for (const line of lines) {
    const match = line.match(pattern);
    if (match?.[1]) return match[1].replace(/\s+/g, '');
  }
  return null;
}

function verifiedStats(
  listing: AppListing | OwnedApp,
  extra: (AppConnection | undefined)[],
): { revenue: string; customers: string } {
  const lines = [
    ...(listing.badges ?? []),
    ...extra.flatMap((row) => connectionLines(row)),
  ];
  const revenueBand = bandFrom(lines, /(\$[\d.,]+(?:\s*[–-]\s*\$?[\d.,]+)?[kKmM]?)/i);
  const customerBand = bandFrom(
    lines,
    /([\d.,]+(?:\s*[–-]\s*[\d.,]+)?[kKmM]?)\s+(?:customers|subscribers)/i,
  );
  const hasRevenue = lines.some((line) => /stripe|revenuecat|\bmrr\b|revenue/i.test(line));
  const hasCustomers = lines.some((line) => /customer|subscriber|revenuecat/i.test(line));
  return {
    revenue: revenueBand ?? (hasRevenue ? 'Verified' : '—'),
    customers: customerBand ?? (hasCustomers ? 'Verified' : '—'),
  };
}
