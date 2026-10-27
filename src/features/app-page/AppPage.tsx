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
import {
  SHOT_RATIO,
  type AppListing,
  type HeyTargetType,
  type MediaItem,
  type OwnedApp,
  type SectionKey,
  type ShotLayout,
} from '@/data/types';
import { builderFromUser } from '@/features/profile/builderCard';
import { useStore, withDefaultSections } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radii } from '@/theme/tokens';

/** Where the page is being rendered, which changes stats and affordances. */
export type AppPageMode = 'discover' | 'liker' | 'owner' | 'web';

export type HeyTarget = {
  type: HeyTargetType;
  id: string;
  label: string;
  /** The prompt answer (or other context) shown under the title in the hey sheet. */
  body?: string;
};

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
  /** Owner only: tapping the name/icon block opens the listing editor. */
  onEditListing?: () => void;
  /** Owner only: the listing banner is its own image, not a screenshot. */
  onEditCover?: () => void;
  /** Pinned above the page, e.g. a liker's note. */
  banner?: React.ReactNode;
};

/** Carousel card width per orientation. Every shot in one listing shares it. */
const SHOT_WIDTH: Record<ShotLayout, number> = { vertical: 168, horizontal: 272 };

const PROMPT_SLOTS: SectionKey[] = ['p0', 'p1', 'p2', 'p3', 'p4'];


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
  onEditListing,
  banner,
}: AppPageProps) {
  const { c } = useTheme();
  const [viewer, setViewer] = useState<Viewer | null>(null);

  const isOwner = mode === 'owner';
  const layoutOrder: SectionKey[] = withDefaultSections(
    'layout' in listing ? listing.layout : undefined,
  ).filter((section) => section !== 'pitch');

  // Match-app stubs arrive without media, prompts or an orientation.
  const media = listing.media ?? [];
  const shotLayout: ShotLayout = listing.shotLayout ?? 'vertical';
  const prompts = listing.prompts ?? [];
  const links = (listing.links ?? []).filter(([, value]) => !!value);

  const shots = media;

  // Content editing is the owner's alone, and never while reordering.
  const editSection = isOwner && !editLayout ? onEditSection : undefined;

  /** Owner sees every unused prompt slot, not just the next one. */
  const emptyPromptSlots = new Set(
    editSection ? PROMPT_SLOTS.filter((_, index) => !prompts[index]) : [],
  );

  // The links block belongs under the carousel, or under the header without one.
  const linksAfter = shots.length && layoutOrder.includes('shots') ? 'shots' : null;

  /** Empty sections render nothing, so they must not take a gap either. */
  const hasContent = (section: SectionKey): boolean => {
    if (section === 'shots') return shots.length > 0 || !!editSection;
    if (section === 'problem') return !!(listing.problemOf || listing.problemFor) || !!editSection;
    if (section === 'pricing') return !!listing.pricingModel || !!editSection;
    if (section === 'pitch') return !!listing.pitchUri || !!editSection;
    if (section === 'onboarding') return !!listing.onboarding;
    if (section === 'verified') return (listing.badges ?? []).length > 0;
    if (/^p\d+$/.test(section)) {
      return !!prompts[Number(section.slice(1))] || emptyPromptSlots.has(section);
    }
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

      {hasContent('pitch') ? (
        <Section
          section="pitch"
          listing={listing}
          mode={mode}
          isOwner={isOwner}
          shots={shots}
          shotLayout={shotLayout}
          prompts={prompts}
          onHey={onHey}
          onOpenBuilder={onOpenBuilder}
          onEdit={editSection ? () => editSection('pitch') : undefined}
          addPrompt={false}
          onOpenShots={(shotIndex) =>
            setViewer({ items: shots, index: shotIndex, layout: shotLayout })
          }
          onOpenPitch={
            listing.pitchUri
              ? () =>
                  setViewer({
                    items: [{ label: 'Quick pitch', uri: listing.pitchUri, video: true }],
                    index: 0,
                    layout: 'vertical',
                  })
              : undefined
          }
        />
      ) : null}

      <View style={{ gap: 12 }}>
        <Pressable
          disabled={!onEditListing || editLayout}
          onPress={onEditListing}
          accessibilityRole={onEditListing && !editLayout ? 'button' : undefined}
          accessibilityLabel={onEditListing && !editLayout ? 'Edit listing' : undefined}
          style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}
        >
          <AppIcon hue={listing.hue} name={listing.name} uri={listing.icon} size={62} />
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
          {onEditListing && !editLayout ? (
            <Ionicons name="create-outline" size={18} color={c.muted} />
          ) : null}
        </Pressable>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
          {[listing.cat, listing.plat, listing.stage].filter(Boolean).map((value) => (
            <Chip key={value} label={value} size="sm" />
          ))}
          {listing.storeRating != null ? (
            <Chip
              label={`${listing.storeRating.toFixed(1)}${listing.storeRatingCount ? ` (${listing.storeRatingCount.toLocaleString()})` : ''}`}
              size="sm"
              left={<Ionicons name="star" size={12} color="#FFCC00" />}
            />
          ) : null}
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
              addPrompt={emptyPromptSlots.has(section)}
              onOpenShots={(shotIndex) =>
                setViewer({ items: shots, index: shotIndex, layout: shotLayout })
              }
              onOpenPitch={
                listing.pitchUri
                  ? () =>
                      setViewer({
                        items: [{ label: 'Quick pitch', uri: listing.pitchUri, video: true }],
                        index: 0,
                        layout: 'vertical',
                      })
                  : undefined
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
        onHey={
          onHey
            ? (item, shotIndex) => {
                setViewer(null);
                const pitch = /pitch/i.test(item.label);
                onHey({
                  type: 'media',
                  id: pitch ? 'pitch' : String(shotIndex + 1),
                  label: item.label,
                  body: pitch ? item.label : undefined,
                });
              }
            : undefined
        }
      />
    </View>
  );
}

function builderFirstName(listing: AppListing | OwnedApp): string {
  const raw = (listing.builder || '').replace(/^@/, '').trim();
  return raw.split(/[\s·]/)[0] || 'them';
}

function listingRevenue(listing: AppListing | OwnedApp): string {
  const badge = (listing.badges ?? []).find((row) =>
    /mrr|revenue|stripe|revenuecat/i.test(row),
  );
  if (!badge) return '—';
  const money = badge.match(/\$[\d.,]+(?:\s*[–-]\s*\$?[\d.,]+)?[kKmM]?/);
  return money?.[0].replace(/\s+/g, '') ?? '—';
}

export function sectionName(section: SectionKey): string {
  if (/^p\d+$/.test(section)) return `Prompt ${Number(section.slice(1)) + 1}`;
  return (
    (
      {
        shots: 'Screenshots',
        problem: 'The problem',
        builder: 'Builder',
        pricing: 'Pricing',
        pitch: 'Quick pitch',
        onboarding: 'Onboarding',
        looking: 'Ideal users',
        stats: 'Stats',
        verified: 'Verified',
      } as Record<string, string>
    )[section] ?? section
  );
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
  onOpenPitch?: () => void;
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
  onOpenPitch,
}: SectionProps) {
  const { c } = useTheme();
  const store = useStore();
  const card = isOwner ? { ...listing, ...builderFromUser(store.user) } : listing;
  const canHey = mode === 'discover' || mode === 'liker' || mode === 'web';

  if (section === 'shots') {
    if (!shots.length) {
      return onEdit ? <AddTile label="+ Add screenshots" onPress={onEdit} /> : null;
    }

    const width = SHOT_WIDTH[shotLayout];
    const height = Math.round(width / SHOT_RATIO[shotLayout]);

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={width + 10}
        decelerationRate="fast"
        contentContainerStyle={{ gap: 10, paddingRight: layout.gutter }}
        style={{ marginHorizontal: -layout.gutter, paddingHorizontal: layout.gutter }}
      >
        {shots.map((item, index) => (
          <View
            key={`${item.label}-${index}`}
            // Explicit height, so an absolutely filled video can't fight the ratio.
            style={{ width, height }}
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

  if (section === 'problem') {
    const of = listing.problemOf?.trim();
    const forWho = listing.problemFor?.trim();
    if (!of && !forWho && onEdit) {
      return <AddTile label="+ This solves the problem of… for…" onPress={onEdit} />;
    }
    if (!of && !forWho) return null;

    const problemLabel = of
      ? `This solves the problem of ${of}`
      : 'This solves the problem of';

    return (
      <View>
        <EditTarget label="Edit the problem" onPress={onEdit}>
          <Card
            padding={18}
            radius={radii.cardLg}
            style={{ gap: 10, paddingBottom: canHey ? 64 : 18 }}
          >
            <Label>This solves the problem of</Label>
            <Txt size={16} weight={500} lh={1.35}>
              {of || '—'}
            </Txt>
            <Label>For</Label>
            <Txt size={16} weight={500} lh={1.35}>
              {forWho || '—'}
            </Txt>
          </Card>
        </EditTarget>
        {canHey ? (
          <HeyPill
            size={40}
            label={problemLabel}
            onPress={() =>
              onHey?.({
                type: 'prompt',
                id: 'problem',
                label: problemLabel,
                body: [of, forWho ? `For ${forWho}` : null].filter(Boolean).join('\n'),
              })
            }
            style={{ position: 'absolute', right: 14, bottom: 14 }}
          />
        ) : null}
      </View>
    );
  }

  if (section === 'pricing') {
    if (!listing.pricingModel && onEdit) {
      return <AddTile label="+ Add pricing" onPress={onEdit} />;
    }
    if (!listing.pricingModel) return null;

    const from =
      listing.pricingModel !== 'Free' && listing.priceFrom
        ? `From ${listing.priceFrom}`
        : null;

    return (
      <EditTarget label="Edit pricing" onPress={onEdit}>
        <Card padding={18} radius={radii.cardLg} style={{ gap: 10 }}>
          <Label>Pricing</Label>
          <Txt size={16} weight={500}>
            {listing.pricingModel}
          </Txt>
          {from ? (
            <Txt size={14.5} muted>
              {from}
            </Txt>
          ) : null}
        </Card>
      </EditTarget>
    );
  }

  if (/^p\d+$/.test(section)) {
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
            onPress={() =>
              onHey?.({ type: 'prompt', id: section, label: prompt[0], body: prompt[1] })
            }
            style={{ position: 'absolute', right: 14, bottom: 14 }}
          />
        ) : null}
      </View>
    );
  }

  if (section === 'pitch') {
    if (!listing.pitchUri) {
      return onEdit ? (
        <AddTile label="+ Record a quick pitch" icon="videocam" onPress={onEdit} />
      ) : null;
    }

    const seconds = listing.pitchSeconds ?? 0;
    const length = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    const who = (card.builder || 'this builder').replace(/^@/, '').split(/[\s·]/)[0] || 'this builder';
    const title = `Watch ${who}'s quick pitch`;

    return (
      <Card padding={12} radius={radii.cardLg}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={title}
            onPress={onOpenPitch}
            style={({ pressed }) => ({
              opacity: pressed ? 0.85 : 1,
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
            })}
          >
            <InlineVideo
              item={{ label: 'Quick pitch', uri: listing.pitchUri, video: true }}
              hue={listing.hue}
              layout="vertical"
              radius={14}
              style={{ width: 118, aspectRatio: 3 / 4 }}
            />
            <View style={{ flex: 1, gap: 6 }}>
              <Label>Quick pitch</Label>
              <Txt size={17} weight={600} lh={1.3}>
                {title}
              </Txt>
              <Txt size={13} muted>
                {length}
              </Txt>
              {onEdit ? (
                <Pressable
                  onPress={onEdit}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Retake quick pitch"
                >
                  <Txt size={13} weight={600} color={c.accentText}>
                    Retake
                  </Txt>
                </Pressable>
              ) : null}
            </View>
          </Pressable>
          {canHey ? (
            <HeyPill
              size={40}
              label="Quick pitch"
              onPress={() =>
                onHey?.({
                  type: 'media',
                  id: 'pitch',
                  label: 'Quick pitch',
                  body: title,
                })
              }
            />
          ) : null}
        </View>
      </Card>
    );
  }

  if (section === 'builder') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={onEdit ? 'Edit builder card' : `About ${card.builder}`}
        onPress={onEdit ?? onOpenBuilder}
        style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
      >
        <Card padding={18} radius={radii.cardLg} style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 16 }}>
            <Avatar name={card.builder} uri={card.builderPhoto} size={64} />
            <View style={{ flex: 1, gap: 5, paddingTop: 2 }}>
              <Txt size={18} weight={700} numberOfLines={2}>
                {card.builder}
              </Txt>
              {card.role ? (
                <Txt size={14} muted>
                  {card.role}
                </Txt>
              ) : null}
              {card.githubCommits != null || listing.reply ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 2 }}>
                  {card.githubCommits != null ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="logo-github" size={14} color={c.ink} />
                      <Txt size={13} weight={600}>
                        {card.githubCommits.toLocaleString()} commits
                      </Txt>
                    </View>
                  ) : null}
                  {listing.reply ? (
                    <Txt size={13} muted>
                      {listing.reply} reply rate
                    </Txt>
                  ) : null}
                </View>
              ) : null}
            </View>
            <Ionicons
              name={onEdit ? 'create-outline' : 'chevron-forward'}
              size={18}
              color={c.muted}
              style={{ marginTop: 6 }}
            />
          </View>
          {card.style ? (
            <Txt size={14.5} lh={1.45}>
              {card.style}
            </Txt>
          ) : isOwner ? (
            <Txt size={14} color={c.accentText}>
              Add a bio
            </Txt>
          ) : null}
          {(card.skills ?? []).length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {card.skills!.slice(0, 8).map((skill) => (
                <Chip key={skill} label={skill} size="sm" />
              ))}
            </View>
          ) : null}
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
      ['Revenue', listingRevenue(listing)],
      ['Commits', listing.githubCommits != null ? listing.githubCommits.toLocaleString() : '—'],
      ['Trades', String(listing.trades)],
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
function AddTile({
  label,
  onPress,
  icon,
}: {
  label: string;
  onPress: () => void;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}) {
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
        gap: 10,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {icon ? <Ionicons name={icon} size={28} color={c.ink} /> : null}
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
      <AppIcon hue={listing.hue} name={listing.name} uri={listing.icon} size={36} />
      <View style={{ flex: 1 }}>
        <Txt font="mono" size={14} weight={500} numberOfLines={1}>
          {shortName(listing.name)}
        </Txt>
        <Txt size={12} muted numberOfLines={1}>
          {listing.sub}
        </Txt>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 3 }}>
        <Avatar name={listing.builder} uri={listing.builderPhoto} size={28} />
        <Txt size={11} muted numberOfLines={1}>
          by {builderFirstName(listing)}
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
