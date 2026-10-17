import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppIcon, Avatar } from '@/components/ui/AppIcon';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { HeyPill } from '@/components/ui/HeyPill';
import { InlineVideo } from '@/components/ui/InlineVideo';
import { Lightbox } from '@/components/ui/Lightbox';
import { MediaPlaceholder } from '@/components/ui/MediaPlaceholder';
import { Label, Txt } from '@/components/ui/Txt';
import { shortName } from '@/data/mock';
import type {
  AppListing,
  HeyTargetType,
  MediaItem,
  OwnedApp,
  SectionKey,
  ShotLayout,
} from '@/data/types';
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
  /**
   * Owner only: tapping a section opens its content editor. Reordering the
   * layout and editing the content are deliberately separate modes.
   */
  onEditSection?: (section: SectionKey) => void;
  /** Pinned above the page, e.g. a liker's note. */
  banner?: React.ReactNode;
};

const COVER_RATIO = 16 / 9;

/** Carousel card size per orientation. Every shot in one listing shares it. */
const SHOT: Record<ShotLayout, { width: number; ratio: number }> = {
  vertical: { width: 168, ratio: 9 / 19.5 },
  horizontal: { width: 272, ratio: 16 / 9 },
};

const PROMPT_SLOTS: SectionKey[] = ['p0', 'p1', 'p2', 'p3', 'p4'];

const DEFAULT_ORDER: SectionKey[] = [
  'shots',
  'p0',
  'builder',
  'p1',
  'looking',
  'p2',
  'p3',
  'stats',
  'verified',
  'p4',
];

/** What the full-screen viewer is showing, if anything. */
type Viewer = { items: MediaItem[]; index: number; layout: ShotLayout };

export function AppPage({
  listing,
  mode,
  onHey,
  onOpenBuilder,
  onOpenLink,
  editLayout,
  onMoveSection,
  onEditSection,
  banner,
}: AppPageProps) {
  const { c } = useTheme();
  const [viewer, setViewer] = useState<Viewer | null>(null);

  const isOwner = mode === 'owner';
  const layoutOrder: SectionKey[] =
    'layout' in listing && listing.layout?.length ? listing.layout : DEFAULT_ORDER;

  // Match-app stubs arrive without media, prompts or an orientation.
  const media = listing.media ?? [];
  const shotLayout: ShotLayout = listing.shotLayout ?? 'vertical';
  const prompts = listing.prompts ?? [];
  const links = (listing.links ?? []).filter(([, value]) => !!value);

  const cover = media[0];
  const shots = media.slice(1);

  // Content editing is the owner's alone, and never while reordering.
  const editSection = isOwner && !editLayout ? onEditSection : undefined;

  /** The first empty prompt slot, so one "Add prompt" tile shows, not five. */
  const nextPromptSlot =
    editSection && prompts.length < PROMPT_SLOTS.length ? PROMPT_SLOTS[prompts.length] : null;

  // The links block belongs under the carousel, or under the header without one.
  const linksAfter = shots.length && layoutOrder.includes('shots') ? 'shots' : null;

  /** Empty sections render nothing, so they must not take a gap either. */
  const hasContent = (section: SectionKey): boolean => {
    if (section === 'shots') return shots.length > 0 || !!editSection;
    if (section.startsWith('p')) {
      return !!prompts[Number(section.slice(1))] || section === nextPromptSlot;
    }
    if (section === 'verified') return (listing.badges ?? []).length > 0;
    return true;
  };

  const linkBlock = links.length ? (
    <View style={{ gap: 9 }}>
      <Label>Links</Label>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
        {links.map(([kind, value]) => (
          <Chip
            key={kind}
            label={kind}
            size="sm"
            tone="accent"
            onPress={() => onOpenLink?.(kind, value)}
            right={
              <>
                <Txt size={12} color={c.accentText}>
                  {value}
                </Txt>
                <Ionicons name="open-outline" size={12} color={c.accentText} />
              </>
            }
          />
        ))}
      </View>
    </View>
  ) : null;

  return (
    <View style={{ gap: 18 }}>
      {banner}

      {cover ? (
        cover.video ? (
          <InlineVideo
            item={cover}
            hue={listing.hue}
            layout="horizontal"
            radius={radii.cardLg}
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={editSection ? 'Edit screenshots' : 'View cover full screen'}
            onPress={() =>
              editSection
                ? editSection('shots')
                : setViewer({ items: [cover], index: 0, layout: 'horizontal' })
            }
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          >
            <MediaPlaceholder
              label={cover.label}
              hue={listing.hue}
              uri={cover.uri}
              radius={radii.cardLg}
              style={{ aspectRatio: COVER_RATIO }}
            />
          </Pressable>
        )
      ) : null}

      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <AppIcon hue={listing.hue} name={listing.name} size={62} />
          <View style={{ flex: 1 }}>
            {/* The full name always fits on one line, shrinking rather than clipping. */}
            <Txt
              font="mono"
              size={18}
              weight={500}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
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

        {listing.fit && mode !== 'owner' ? (
          <Txt size={12.5} lh={1.4} muted>
            {listing.fit}
          </Txt>
        ) : null}

        {linksAfter === null ? linkBlock : null}
      </View>

      {layoutOrder.map((section, index) => {
        // Reorder mode lists every slot, so the index it hands back stays true.
        if (!editLayout && !hasContent(section)) return null;

        return (
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
              shots={shots}
              shotLayout={shotLayout}
              prompts={prompts}
              onHey={onHey}
              onOpenBuilder={onOpenBuilder}
              onEdit={editSection ? () => editSection(section) : undefined}
              addPrompt={section === nextPromptSlot}
              onOpenShots={(shotIndex) =>
                setViewer({ items: shots, index: shotIndex, layout: shotLayout })
              }
            />

            {linksAfter === section ? linkBlock : null}
          </View>
        );
      })}

      <Lightbox
        visible={!!viewer}
        items={viewer?.items ?? []}
        index={viewer?.index ?? 0}
        hue={listing.hue}
        layout={viewer?.layout ?? shotLayout}
        onClose={() => setViewer(null)}
      />
    </View>
  );
}

export function sectionName(section: SectionKey): string {
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
  /** Everything after the cover, already split out by the page. */
  shots: MediaItem[];
  shotLayout: ShotLayout;
  prompts: [label: string, answer: string][];
  onHey?: (target: HeyTarget) => void;
  onOpenBuilder?: () => void;
  /** Set only when the owner can edit this section's content. */
  onEdit?: () => void;
  /** This is the first empty prompt slot, so it offers to add one. */
  addPrompt?: boolean;
  onOpenShots: (index: number) => void;
};

function Section({
  section,
  listing,
  mode,
  isOwner,
  shots,
  shotLayout,
  prompts,
  onHey,
  onOpenBuilder,
  onEdit,
  addPrompt,
  onOpenShots,
}: SectionProps) {
  const { c } = useTheme();
  const canHey = mode === 'discover' || mode === 'liker' || mode === 'web';

  if (section === 'shots') {
    if (!shots.length) {
      return onEdit ? <AddTile label="+ Add screenshots" onPress={onEdit} /> : null;
    }

    const size = SHOT[shotLayout];

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={size.width + 10}
        decelerationRate="fast"
        contentContainerStyle={{ gap: 10, paddingRight: layout.gutter }}
        style={{ marginHorizontal: -layout.gutter, paddingHorizontal: layout.gutter }}
      >
        {shots.map((item, index) => (
          <View
            key={`${item.label}-${index}`}
            // Explicit height, so an absolutely filled video can't fight the ratio.
            style={{ width: size.width, height: Math.round(size.width / size.ratio) }}
          >
            {item.video ? (
              // Absolute fill, so the card's shape wins over the video's own ratio.
              <InlineVideo
                item={item}
                hue={listing.hue}
                layout={shotLayout}
                radius={radii.cardLg}
                style={StyleSheet.absoluteFill}
              />
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={onEdit ? 'Edit screenshots' : `View ${item.label} full screen`}
                onPress={() => (onEdit ? onEdit() : onOpenShots(index))}
                style={({ pressed }) => [StyleSheet.absoluteFill, { opacity: pressed ? 0.85 : 1 }]}
              >
                <MediaPlaceholder
                  label={item.label}
                  hue={listing.hue}
                  uri={item.uri}
                  radius={radii.cardLg}
                  style={{ flex: 1 }}
                />
              </Pressable>
            )}

            {/* The Hey pill sits outside the card's press target, so it wins the tap. */}
            {canHey ? (
              <HeyPill
                size={40}
                label={item.label}
                onPress={() => onHey?.({ type: 'media', id: String(index + 1), label: item.label })}
                style={{ position: 'absolute', bottom: 10, right: 10 }}
              />
            ) : null}
          </View>
        ))}
      </ScrollView>
    );
  }

  if (section.startsWith('p')) {
    const prompt = prompts[Number(section.slice(1))];

    if (!prompt) {
      return addPrompt && onEdit ? <AddTile label="+ Add prompt" onPress={onEdit} /> : null;
    }

    return (
      <View>
        <EditTarget label={`Edit ${sectionName(section)}`} onPress={onEdit}>
          {/* The pill overlays the card, so the answer reserves room for it. */}
          <Card
            padding={18}
            radius={radii.cardLg}
            style={{ gap: 12, paddingBottom: canHey ? 64 : 18 }}
          >
            <Label>{prompt[0]}</Label>
            <Txt size={20} lh={1.38}>
              {prompt[1]}
            </Txt>
          </Card>
        </EditTarget>

        {/* Outside the card's press target, so the Hey pill always wins the tap. */}
        {canHey ? (
          <HeyPill
            size={40}
            label={prompt[0]}
            onPress={() => onHey?.({ type: 'prompt', id: section, label: prompt[0] })}
            style={{ position: 'absolute', right: 14, bottom: 14 }}
          />
        ) : null}
      </View>
    );
  }

  if (section === 'builder') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={onEdit ? 'Edit builder card' : `About ${listing.builder}`}
        onPress={onEdit ?? onOpenBuilder}
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
            <Ionicons name={onEdit ? 'create-outline' : 'chevron-forward'} size={18} color={c.muted} />
          </View>
        </Card>
      </Pressable>
    );
  }

  if (section === 'looking') {
    const ideal = listing.ideal;
    const rows: [string, string][] = [
      ['Age', ideal?.age ?? ''],
      ['Gender', ideal?.gender ?? ''],
      ['Into', ideal?.interests ?? ''],
      ['On', ideal?.plat ?? ''],
      ['Wants feedback on', ideal?.wants ?? ''],
    ];

    return (
      <EditTarget label="Edit ideal users" onPress={onEdit}>
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
      </EditTarget>
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
      <EditTarget label="About your stats" onPress={onEdit}>
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
      </EditTarget>
    );
  }

  if (section === 'verified') {
    const badges = listing.badges ?? [];
    if (!badges.length) return null;

    return (
      <EditTarget label="About your badges" onPress={onEdit}>
        <Card padding={18} radius={radii.cardLg} style={{ gap: 12 }}>
          <Label>Verified</Label>
          <View style={{ gap: 10 }}>
            {badges.map((badge) => (
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
      </EditTarget>
    );
  }

  return null;
}

/** Wraps a section in a press target, but only when the owner can edit it. */
function EditTarget({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress?: () => void;
  children: React.ReactNode;
}) {
  if (!onPress) return <>{children}</>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
    >
      {children}
    </Pressable>
  );
}

/** The dashed "add one" tile the owner sees where a section is still empty. */
function AddTile({ label, onPress }: { label: string; onPress: () => void }) {
  const { c } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 96,
        borderRadius: radii.cardLg,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: c.muted,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Txt size={15} weight={500} muted>
        {label}
      </Txt>
    </Pressable>
  );
}

/** The bar that appears once the user scrolls past an app's header. */
export function CompactAppBar({
  listing,
  visible,
  top,
}: {
  listing: AppListing | OwnedApp;
  visible: boolean;
  /** The safe-area inset; the bar fills the space above it too. */
  top: number;
}) {
  const { c } = useTheme();
  if (!visible) return null;

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingHorizontal: layout.gutter,
        // Solid, not glass: the screen header behind it must not bleed through.
        paddingTop: top + 9,
        paddingBottom: 9,
        backgroundColor: c.bg,
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
