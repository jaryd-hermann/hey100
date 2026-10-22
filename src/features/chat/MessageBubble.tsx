import { Image } from 'expo-image';
import React from 'react';
import { Pressable, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { InlineVideo } from '@/components/ui/InlineVideo';
import { MediaPlaceholder } from '@/components/ui/MediaPlaceholder';
import { Label, Txt } from '@/components/ui/Txt';
import type { MediaItem, Message } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

/** Attachments are shown portrait, like the screenshots on a listing. */
const SHOT_RATIO = 9 / 16;
const SOLO_WIDTH = 186;
const TILE_WIDTH = 128;

export type MessageBubbleProps = {
  message: Message;
  /** Sits at the bottom left of their bubbles. The Team thread passes Jaryd. */
  avatar?: React.ReactNode;
  /** Tints attachment placeholders with the app's generated colour. */
  hue: number;
  /** Arrived while the user was away, so it carries a highlight. */
  unread?: boolean;
  onOpenMedia?: (items: MediaItem[], index: number) => void;
  onLongPress?: () => void;
  onToggleReaction?: (emoji: string) => void;
};

export function MessageBubble({
  message,
  avatar,
  hue,
  unread,
  onOpenMedia,
  onLongPress,
  onToggleReaction,
}: MessageBubbleProps) {
  const { c } = useTheme();

  if (message.kind === 'system') {
    return (
      <Txt font="mono" size={11} muted center upper tracking={0.8} lh={1.5}>
        {message.body}
      </Txt>
    );
  }

  if (message.kind === 'announcement') {
    return (
      <View>
        <Card tone="soft" padding={14} radius={radii.cardLg} style={{ gap: 8 }}>
          <Pressable onLongPress={onLongPress} delayLongPress={280} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Label size={10}>Announcement · all builders</Label>
              <Txt size={11} color={c.accentText}>
                {message.when}
              </Txt>
            </View>
            {message.reply ? (
              <View style={{ borderLeftWidth: 2, borderLeftColor: c.accent, paddingLeft: 8 }}>
                <Txt size={12} muted numberOfLines={2}>
                  {message.reply.body}
                </Txt>
              </View>
            ) : null}
            {message.media?.length ? (
              <View style={{ flexDirection: 'row', gap: 5 }}>
                {message.media.map((item, index) => (
                  <Attachment
                    key={`${item.label}-${index}`}
                    item={item}
                    hue={hue}
                    width={SOLO_WIDTH}
                    onPress={onOpenMedia ? () => onOpenMedia(message.media!, index) : undefined}
                  />
                ))}
              </View>
            ) : null}
            {message.body ? (
              <Txt size={15} lh={1.5} color={c.accentText}>
                {message.body}
              </Txt>
            ) : null}
          </Pressable>
        </Card>
        {message.reactions?.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {message.reactions.map((reaction) => (
              <Pressable
                key={reaction.emoji}
                onPress={() => onToggleReaction?.(reaction.emoji)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 8,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: reaction.mine ? c.soft : c.raised,
                  borderWidth: 1,
                  borderColor: reaction.mine ? c.accent : c.line,
                }}
              >
                <Txt size={13}>{reaction.emoji}</Txt>
                <Txt size={11} weight={600}>
                  {reaction.count}
                </Txt>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    );
  }

  if (message.kind === 'feedback') {
    const mine = message.from === 'me';
    return (
      <View
        style={{
          borderRadius: radii.cardLg,
          borderWidth: 1.5,
          borderColor: c.accent,
          backgroundColor: c.surface,
          padding: 15,
          gap: 9,
          maxWidth: '92%',
          alignSelf: mine ? 'flex-end' : 'flex-start',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Label size={10} style={{ flex: 1 }}>
            {mine ? 'Feedback you sent' : 'Feedback received'}
          </Label>
          <Txt font="mono" size={13} weight={600} color={c.accentText}>
            {message.stars}
          </Txt>
        </View>
        <Txt size={15} lh={1.45}>
          {message.body}
        </Txt>
        <Txt size={12} muted>
          {message.meta}
        </Txt>
      </View>
    );
  }

  const mine = message.kind === 'me';
  const media = message.media ?? [];
  const hasBody = !!message.body;

  const bubble = (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={280}
      style={{
        backgroundColor: mine ? c.ink : c.surface,
        borderWidth: mine ? 0 : 1,
        borderColor: unread ? c.accent : c.line,
        borderRadius: 18,
        borderBottomRightRadius: mine ? 6 : 18,
        borderBottomLeftRadius: mine ? 18 : 6,
        // Attachments sit close to the edge; text keeps the usual inset.
        paddingHorizontal: media.length ? 5 : 14,
        paddingVertical: media.length ? 5 : 11,
        gap: 8,
      }}
    >
      {message.reply ? (
        <View
          style={{
            borderLeftWidth: 2,
            borderLeftColor: mine ? c.bg : c.accent,
            paddingLeft: 8,
            marginHorizontal: media.length ? 8 : 0,
            marginTop: media.length ? 6 : 0,
            opacity: 0.8,
          }}
        >
          <Txt size={12} color={mine ? c.bg : c.muted} numberOfLines={2}>
            {message.reply.body}
          </Txt>
        </View>
      ) : null}
      {media.length ? (
        <View style={{ flexDirection: 'row', gap: 5 }}>
          {media.map((item, index) => (
            <Attachment
              key={`${item.label}-${index}`}
              item={item}
              hue={hue}
              width={media.length === 1 ? SOLO_WIDTH : TILE_WIDTH}
              onPress={onOpenMedia ? () => onOpenMedia(media, index) : undefined}
            />
          ))}
        </View>
      ) : null}

      {hasBody ? (
        <Txt
          size={15.5}
          lh={1.4}
          color={mine ? c.bg : c.ink}
          style={media.length ? { paddingHorizontal: 9, paddingBottom: 4 } : undefined}
        >
          {message.body}
        </Txt>
      ) : null}
    </Pressable>
  );

  const chips = message.reactions?.length ? (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
      {message.reactions.map((reaction) => (
        <Pressable
          key={reaction.emoji}
          onPress={() => onToggleReaction?.(reaction.emoji)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 8,
            height: 26,
            borderRadius: 13,
            backgroundColor: reaction.mine ? c.soft : c.raised,
            borderWidth: 1,
            borderColor: reaction.mine ? c.accent : c.line,
          }}
        >
          <Txt size={13}>{reaction.emoji}</Txt>
          <Txt size={11} weight={600}>
            {reaction.count}
          </Txt>
        </Pressable>
      ))}
    </View>
  ) : null;

  if (mine) {
    return (
      <View style={{ maxWidth: '82%', alignSelf: 'flex-end' }}>
        {bubble}
        {chips}
      </View>
    );
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 7,
        maxWidth: '88%',
        alignSelf: 'flex-start',
      }}
    >
      {avatar}
      <View style={{ flexShrink: 1 }}>
        {bubble}
        {chips}
      </View>
    </View>
  );
}

function Attachment({
  item,
  hue,
  width,
  onPress,
}: {
  item: MediaItem;
  hue: number;
  width: number;
  onPress?: () => void;
}) {
  const { c } = useTheme();
  const frame = { width, aspectRatio: SHOT_RATIO, borderRadius: 14 } as const;

  // A video plays in place, so it owns its own press.
  if (item.video) {
    return <InlineVideo item={item} hue={hue} layout="vertical" radius={14} style={{ width }} />;
  }

  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel={item.label}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      {item.uri ? (
        <Image
          source={{ uri: item.uri }}
          contentFit="cover"
          style={{ ...frame, backgroundColor: c.raised }}
        />
      ) : (
        <MediaPlaceholder label={item.label} hue={hue} radius={14} style={frame} />
      )}
    </Pressable>
  );
}
