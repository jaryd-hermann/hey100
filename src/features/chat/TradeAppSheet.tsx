import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, View } from 'react-native';

import { AppIcon, Avatar } from '@/components/ui/AppIcon';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Sheet } from '@/components/ui/Sheet';
import { Label, Txt } from '@/components/ui/Txt';
import type { AppListing } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

import { avatarName } from './chatMeta';

export type TradeAppSheetProps = {
  visible: boolean;
  /** The app being traded. Matched apps are stored as lighter records. */
  listing: AppListing;
  onClose: () => void;
  onOpenLink: (kind: string, value: string) => void;
  onOpenProfile: () => void;
  /** Set when the app has a full listing to open as a page. */
  onOpenFullListing?: () => void;
};

/** The traded app's listing, reached from the thread's ··· menu. */
export function TradeAppSheet({
  visible,
  listing,
  onClose,
  onOpenLink,
  onOpenProfile,
  onOpenFullListing,
}: TradeAppSheetProps) {
  const { c } = useTheme();

  // Matched apps are stubs, so every list here can be missing at runtime.
  const links = listing.links ?? [];
  const tags = [listing.cat, listing.plat, listing.stage].filter(
    (value): value is string => !!value,
  );

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <AppIcon hue={listing.hue} name={listing.name} uri={listing.icon} size={58} />
          <View style={{ flex: 1 }}>
            <Txt font="mono" size={16.5} weight={500} numberOfLines={2}>
              {listing.name}
            </Txt>
            <Txt size={13.5} muted numberOfLines={2}>
              {listing.sub}
            </Txt>
          </View>
        </View>

        {tags.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
            {tags.map((tag) => (
              <Chip key={tag} label={tag} size="sm" />
            ))}
          </View>
        ) : null}

        {listing.asked ? (
          <Card tone="soft" padding={14} radius={radii.cardLg}>
            <Txt size={14} lh={1.45} color={c.accentText}>
              {avatarName(listing.builder)} asked for feedback on {listing.asked}.
            </Txt>
          </Card>
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={onOpenProfile}
          style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
        >
          <Card padding={14} radius={radii.cardLg}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Avatar name={avatarName(listing.builder)} size={42} />
              <View style={{ flex: 1 }}>
                <Label size={10}>Builder</Label>
                <Txt size={15} weight={600} numberOfLines={1}>
                  {listing.builder}
                </Txt>
              </View>
              <Ionicons name="chevron-forward" size={17} color={c.muted} />
            </View>
          </Card>
        </Pressable>

        {links.length ? (
          <View style={{ gap: 8 }}>
            <Label>Links</Label>
            {links.map(([kind, value]) => (
              <Pressable
                key={`${kind}-${value}`}
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
                <Ionicons name="open-outline" size={18} color={c.ink} />
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
        ) : null}

        {onOpenFullListing ? (
          <Pressable
            accessibilityRole="button"
            onPress={onOpenFullListing}
            style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1, paddingVertical: 4 })}
          >
            <Txt size={14} weight={600} color={c.accentText}>
              See the full listing →
            </Txt>
          </Pressable>
        ) : (
          <Txt size={12.5} lh={1.45} muted>
            Matched apps keep a short record in chat. The full listing page is still being wired up
            for trades.
          </Txt>
        )}
      </View>
    </Sheet>
  );
}
