import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, View } from 'react-native';

import { Avatar } from '@/components/ui/AppIcon';
import { Card } from '@/components/ui/Card';
import { Sheet } from '@/components/ui/Sheet';
import { Label, Txt } from '@/components/ui/Txt';
import { shortName } from '@/data/mock';
import type { AppListing, OwnedApp } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

type SocialRow = [kind: string, value: string, icon: React.ComponentProps<typeof Ionicons>['name']];

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

  if (!listing) return <Sheet visible={false} onClose={onClose} children={null} />;

  const socials: SocialRow[] = [
    ['X', `@${shortName(listing.name).toLowerCase()}`, 'logo-twitter'],
    ['GitHub', shortName(listing.name).toLowerCase(), 'logo-github'],
    ['LinkedIn', listing.builder, 'logo-linkedin'],
    ...listing.links
      .filter(([kind]) => kind === 'Web')
      .map(([kind, value]) => [kind, value, 'globe-outline'] as SocialRow),
  ];

  const stats: [string, string][] = [
    ['Feedback given', String(listing.trades * 2)],
    ['Reply rate', listing.reply],
    ['Trades', String(listing.trades)],
  ];

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Avatar name={listing.builder} size={60} />
          <View style={{ flex: 1 }}>
            <Txt size={19} weight={700}>
              {listing.builder}
            </Txt>
            <Txt size={13.5} muted>
              {listing.role}
            </Txt>
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

        <Card tone="soft" padding={14}>
          <Txt size={14} lh={1.45} color={c.accentText}>
            {listing.style}
          </Txt>
        </Card>

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
