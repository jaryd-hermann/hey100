import { Image } from 'expo-image';
import React from 'react';
import { Pressable, View } from 'react-native';

import { AppIcon, Avatar } from '@/components/ui/AppIcon';
import { Txt } from '@/components/ui/Txt';
import { LISTINGS, MATCH_APPS } from '@/data/mock';
import type { CommunityReaction } from '@/data/repo/community';
import type { MediaItem } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';

export type BubbleAuthor = {
  id: string;
  name: string;
  photo?: string;
  listingId?: string;
  owner?: boolean;
};

export function ThreadBubble({
  author,
  body,
  media,
  reactions,
  replies,
  replyAvatars,
  onPress,
  onLongPress,
  onReact,
  onAuthorPress,
}: {
  author: BubbleAuthor;
  body: string;
  media?: MediaItem[];
  reactions?: CommunityReaction[];
  replies?: number;
  replyAvatars?: { name: string; photo?: string }[];
  onPress?: () => void;
  onLongPress?: () => void;
  onReact?: (emoji: string) => void;
  onAuthorPress?: () => void;
}) {
  const { c } = useTheme();
  const stack = (replyAvatars ?? []).slice(0, 6);
  const listing = author.listingId
    ? (LISTINGS[author.listingId] ?? MATCH_APPS[author.listingId])
    : undefined;

  return (
    <View style={{ gap: 4, paddingBottom: 10 }}>
      <Pressable
        onPress={onAuthorPress}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 40 }}
      >
        <Txt size={12} muted>
          {author.name}
        </Txt>
        {author.owner ? (
          <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: c.accent }}>
            <Txt size={10.5} weight={600} color={c.accentInk}>
              Admin
            </Txt>
          </View>
        ) : null}
      </Pressable>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
        <Pressable onPress={onAuthorPress}>
          <View>
            <Avatar name={author.name} uri={author.photo} size={32} />
            {listing ? (
              <View style={{ position: 'absolute', right: -3, bottom: -3 }}>
                <AppIcon hue={listing.hue} name={listing.name} uri={listing.icon} size={14} />
              </View>
            ) : null}
          </View>
        </Pressable>

        <View style={{ flex: 1, minWidth: 0, maxWidth: 304 }}>
          <Pressable
            onPress={onPress}
            onLongPress={onLongPress}
            delayLongPress={280}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 13,
              borderRadius: 18,
              borderBottomLeftRadius: 6,
              backgroundColor: c.surface,
            }}
          >
            {media?.length ? (
              <View style={{ gap: 6, marginBottom: body.trim() ? 8 : 0 }}>
                {media.map((item, index) =>
                  item.uri ? (
                    <Image
                      key={`${item.uri}-${index}`}
                      source={{ uri: item.uri }}
                      style={{ width: '100%', aspectRatio: 1.2, borderRadius: 12, backgroundColor: c.raised }}
                    />
                  ) : null,
                )}
              </View>
            ) : null}
            {body.trim() ? (
              <Txt size={14} lh={1.4}>
                {body}
              </Txt>
            ) : null}
          </Pressable>

          {reactions?.length ? (
            <View style={{ position: 'absolute', top: -15, right: 10, flexDirection: 'row', gap: 4 }}>
              {reactions.map((reaction) => (
                <Pressable
                  key={reaction.emoji}
                  onPress={() => onReact?.(reaction.emoji)}
                  style={{
                    height: 28,
                    paddingHorizontal: 9,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: reaction.mine ? c.ink : c.line,
                    backgroundColor: reaction.mine ? c.raised : c.surface,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Txt size={13} weight={600}>
                    {reaction.emoji}
                  </Txt>
                  {reaction.count > 1 ? (
                    <Txt size={13} weight={600}>
                      {reaction.count}
                    </Txt>
                  ) : null}
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </View>

      {onPress ? (
        <Pressable
          onPress={onPress}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 40, marginTop: 2 }}
        >
          {replies ? (
            <>
              <View style={{ flexDirection: 'row' }}>
                {stack.map((avatar, index) => (
                  <View key={`${avatar.name}-${index}`} style={{ marginLeft: index ? -6 : 0 }}>
                    <Avatar name={avatar.name} uri={avatar.photo} size={18} />
                  </View>
                ))}
              </View>
              <Txt size={12.5} muted>
                {replies} {replies === 1 ? 'reply' : 'replies'}
              </Txt>
            </>
          ) : (
            <Txt size={12.5} muted>
              Reply
            </Txt>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}
