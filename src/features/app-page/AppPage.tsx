import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { AppIcon, Avatar } from '@/components/ui/AppIcon';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { HeyPill } from '@/components/ui/HeyPill';
import { MediaPlaceholder } from '@/components/ui/MediaPlaceholder';
import { Label, Txt } from '@/components/ui/Txt';
import { shortName } from '@/data/mock';
import type { AppListing, HeyTargetType, OwnedApp, SectionKey } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radii } from '@/theme/tokens';

/** Where the page is being rendered, which changes stats and affordances. */
export type AppPageMode = 'discover' | 'liker' | 'owner' | 'web';

export type HeyTarget = { type: HeyTargetType; id: string; label: string };

export type AppPageProps = {
  listing: AppListing | OwnedApp;
  mode: AppPageMode;
  onHey?: (target: HeyTarget) => void;
  onOpenBuilder?: () => void;
  onOpenLink?: (kind: string, value: string) => void;
  /** Section reorder controls, shown by the owner's Edit layout mode. */
  editLayout?: boolean;
  onMoveSection?: (index: number, direction: -1 | 1) => void;
  /** Pinned above the page, e.g. a liker's note. */
  banner?: React.ReactNode;
};

const COVER_RATIO = 16 / 9;
const SHOT_WIDTH = 168;

export function AppPage({
  listing,
  mode,
  onHey,
  onOpenBuilder,
  onOpenLink,
  editLayout,
  onMoveSection,
  banner,
}: AppPageProps) {
  const { c } = useTheme();

  const isOwner = mode === 'owner';
  const layoutOrder: SectionKey[] =
    'layout' in listing && listing.layout?.length
      ? listing.layout
      : ['shots', 'p0', 'builder', 'p1', 'looking', 'p2', 'p3', 'stats', 'verified', 'p4'];

  const cover = listing.media[0];

  return (
    <View style={{ gap: 18 }}>
      {banner}

      {cover ? (
        <MediaPlaceholder
          label={cover.label}
          hue={listing.hue}
          video={cover.video}
          radius={radii.cardLg}
          style={{ aspectRatio: COVER_RATIO }}
        />
      ) : null}

      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <AppIcon hue={listing.hue} name={listing.name} size={62} />
          <View style={{ flex: 1 }}>
            <Txt font="mono" size={18} weight={500} numberOfLines={1}>
              {listing.name}
            </Txt>
            <Txt size={14.5} muted numberOfLines={1}>
              {listing.sub}
            </Txt>
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
          {[listing.cat, listing.plat, listing.stage].filter(Boolean).map((value) => (
            <Chip key={value} label={value} size="sm" />
          ))}
        </View>

        {listing.links.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
            {listing.links
              .filter(([, value]) => !!value)
              .map(([kind, value]) => (
                <Chip
                  key={kind}
                  label={kind}
                  size="sm"
                  tone="accent"
                  onPress={() => onOpenLink?.(kind, value)}
                  right={<Ionicons name="open-outline" size={12} color={c.accentText} />}
                />
              ))}
          </View>
        ) : null}

        {listing.fit && mode !== 'owner' ? (
          <Txt size={12.5} lh={1.4} muted>
            {listing.fit}
          </Txt>
        ) : null}
      </View>

      {layoutOrder.map((section, index) => (
        <View key={`${section}-${index}`} style={{ gap: 8 }}>
          {editLayout ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Label style={{ flex: 1 }}>
                {String(index + 1).padStart(2, '0')} · {sectionName(section)}
              </Label>
              {([-1, 1] as const).map((direction) => (
                <Pressable
                  key={direction}
                  accessibilityLabel={direction === -1 ? 'Move up' : 'Move down'}
                  onPress={() => onMoveSection?.(index, direction)}
                  hitSlop={6}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: c.line,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons
                    name={direction === -1 ? 'arrow-up' : 'arrow-down'}
                    size={15}
                    color={c.ink}
                  />
                </Pressable>
              ))}
            </View>
          ) : null}

          <Section
            section={section}
            listing={listing}
            mode={mode}
            isOwner={isOwner}
            onHey={onHey}
            onOpenBuilder={onOpenBuilder}
          />
        </View>
      ))}
    </View>
  );
}

function sectionName(section: SectionKey): string {
  if (section.startsWith('p')) return `Prompt ${Number(section.slice(1)) + 1}`;
  return (
    {
      shots: 'Screenshots',
      builder: 'Builder',
      looking: 'Ideal users',
      stats: 'Stats',
      verified: 'Verified',
    } as Record<string, string>
  )[section] ?? section;
}

type SectionProps = {
  section: SectionKey;
  listing: AppListing | OwnedApp;
  mode: AppPageMode;
  isOwner: boolean;
  onHey?: (target: HeyTarget) => void;
  onOpenBuilder?: () => void;
};

function Section({ section, listing, mode, isOwner, onHey, onOpenBuilder }: SectionProps) {
  const { c } = useTheme();
  const canHey = mode === 'discover' || mode === 'liker' || mode === 'web';

  if (section === 'shots') {
    const shots = listing.media.slice(1);
    if (!shots.length) return null;

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SHOT_WIDTH + 10}
        decelerationRate="fast"
        contentContainerStyle={{ gap: 10, paddingRight: layout.gutter }}
        style={{ marginHorizontal: -layout.gutter, paddingHorizontal: layout.gutter }}
      >
        {shots.map((item, index) => (
          <MediaPlaceholder
            key={`${item.label}-${index}`}
            label={item.label}
            hue={listing.hue}
            video={item.video}
            style={{ width: SHOT_WIDTH, aspectRatio: 9 / 19.5 }}
          >
            {canHey ? (
              <HeyPill
                size={40}
                label="Hey"
                onPress={() =>
                  onHey?.({ type: 'media', id: String(index + 1), label: item.label })
                }
                style={{ position: 'absolute', bottom: 10, right: 10 }}
              />
            ) : null}
          </MediaPlaceholder>
        ))}
      </ScrollView>
    );
  }

  if (section.startsWith('p')) {
    const promptIndex = Number(section.slice(1));
    const prompt = listing.prompts[promptIndex];
    if (!prompt) return null;

    return (
      <Card padding={18} radius={radii.cardLg} style={{ gap: 12 }}>
        <Label>{prompt[0]}</Label>
        <Txt size={20} lh={1.38}>
          {prompt[1]}
        </Txt>
        {canHey ? (
          <View style={{ alignItems: 'flex-end' }}>
            <HeyPill
              size={40}
              onPress={() => onHey?.({ type: 'prompt', id: section, label: prompt[0] })}
            />
          </View>
        ) : null}
      </Card>
    );
  }

  if (section === 'builder') {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onOpenBuilder}
        style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
      >
        <Card padding={16} radius={radii.cardLg}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
            <Avatar name={listing.builder} size={48} />
            <View style={{ flex: 1 }}>
              <Txt size={15.5} weight={600}>
                {listing.builder}
              </Txt>
              <Txt size={13} muted numberOfLines={1}>
                {listing.role}
              </Txt>
              <Txt size={12.5} muted numberOfLines={1} style={{ marginTop: 3 }}>
                {listing.style}
              </Txt>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.muted} />
          </View>
        </Card>
      </Pressable>
    );
  }

  if (section === 'looking') {
    const rows: [string, string][] = [
      ['Age', listing.ideal.age],
      ['Gender', listing.ideal.gender],
      ['Into', listing.ideal.interests],
      ['On', listing.ideal.plat],
      ['Wants feedback on', listing.ideal.wants],
    ];

    return (
      <Card padding={18} radius={radii.cardLg} style={{ gap: 12 }}>
        <Label>Ideal users</Label>
        <View style={{ gap: 9 }}>
          {rows.map(([label, value]) => (
            <View key={label} style={{ flexDirection: 'row', gap: 12 }}>
              <Txt size={13.5} muted style={{ width: 132 }}>
                {label}
              </Txt>
              <Txt size={14.5} weight={500} style={{ flex: 1 }}>
                {value || '—'}
              </Txt>
            </View>
          ))}
        </View>
      </Card>
    );
  }

  if (section === 'stats') {
    const owned = 'views' in listing ? (listing as OwnedApp) : null;

    // Owners see exact numbers; everyone else sees bands.
    const stats: [string, string][] = [
      ['Heys', isOwner && owned ? String(owned.views) : listing.likes],
      ['Trades', String(listing.trades)],
      ['Replies', listing.reply],
    ];

    return (
      <Card padding={18} radius={radii.cardLg} style={{ gap: 14 }}>
        <Label>{isOwner ? 'Your stats' : 'Stats'}</Label>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {stats.map(([label, value]) => (
            <View key={label} style={{ flex: 1, gap: 3 }}>
              <Txt font="mono" size={21} weight={500}>
                {value}
              </Txt>
              <Label size={10}>{label}</Label>
            </View>
          ))}
        </View>
      </Card>
    );
  }

  if (section === 'verified') {
    if (!listing.badges.length) return null;

    return (
      <Card padding={18} radius={radii.cardLg} style={{ gap: 12 }}>
        <Label>Verified</Label>
        <View style={{ gap: 10 }}>
          {listing.badges.map((badge) => (
            <View key={badge} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="checkmark-circle" size={17} color={c.accentText} />
              <Txt size={14} style={{ flex: 1 }}>
                {badge}
              </Txt>
            </View>
          ))}
        </View>
        <Txt size={11.5} muted>
          Verified as of today · re-synced daily
        </Txt>
      </Card>
    );
  }

  return null;
}

/** The glass bar that appears once the user scrolls past an app's header. */
export function CompactAppBar({
  listing,
  visible,
  top,
}: {
  listing: AppListing | OwnedApp;
  visible: boolean;
  top: number;
}) {
  const { c } = useTheme();
  if (!visible) return null;

  return (
    <View
      style={{
        position: 'absolute',
        top,
        left: 0,
        right: 0,
        paddingHorizontal: layout.gutter,
        paddingVertical: 9,
        backgroundColor: c.glass,
        borderBottomWidth: 1,
        borderColor: c.line,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
        zIndex: 20,
      }}
    >
      <AppIcon hue={listing.hue} name={listing.name} size={36} />
      <View style={{ flex: 1 }}>
        <Txt font="mono" size={14} weight={500} numberOfLines={1}>
          {shortName(listing.name)}
        </Txt>
        <Txt size={12} muted numberOfLines={1}>
          {listing.sub}
        </Txt>
      </View>
    </View>
  );
}

/** Threshold past the header at which the compact bar takes over. */
export const COMPACT_BAR_OFFSET = 260;

export function useCompactBar() {
  const [compact, setCompact] = useState(false);

  return {
    compact,
    onScroll: (y: number) => {
      const next = y > COMPACT_BAR_OFFSET;
      setCompact((prev) => (prev === next ? prev : next));
    },
    reset: () => setCompact(false),
  };
}
