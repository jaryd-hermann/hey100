import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, View } from 'react-native';

import { Avatar } from '@/components/ui/AppIcon';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Sheet } from '@/components/ui/Sheet';
import { Label, Txt } from '@/components/ui/Txt';
import { shortName } from '@/data/mock';
import type { AppListing, OwnedApp } from '@/data/types';
import { builderFromUser } from '@/features/profile/builderCard';
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

  if (!listing) return <Sheet visible={false} onClose={onClose} children={null} />;

  const mine = store.ownedApps.some((app) => app.id === listing.id);
  const card = mine ? { ...listing, ...builderFromUser(store.user) } : listing;
  const socials: SocialRow[] = (mine ? store.user.socials : (listing.builderSocials ?? []))
    .filter(([, value]) => !!value)
    .map(([kind, value]) => [kind, value, SOCIAL_ICONS[kind] ?? 'globe-outline']);

  const commits = mine ? store.user.githubCommits : listing.githubCommits;
  const stats: [string, string][] = mine
    ? [
        ['Heys given', String(store.sentHeys.length)],
        ['Feedback given', String(store.user.feedbackGiven)],
        ['GitHub', commits != null ? commits.toLocaleString() : '—'],
      ]
    : [
        ['Feedback given', '—'],
        ['Trades', listing.trades ? String(listing.trades) : '—'],
        ['GitHub', commits != null ? commits.toLocaleString() : '—'],
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
            {stats.map(([label, value]) => (
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
