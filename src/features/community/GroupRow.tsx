import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, View } from 'react-native';

import { Txt } from '@/components/ui/Txt';
import { isOfficialGroup, type CommunityGroup } from '@/data/repo/community';
import { useTheme } from '@/theme/ThemeProvider';

import { GroupCover } from './GroupCover';
import { OfficialMark } from './OfficialMark';
import { firstName, shortWhen } from './time';

export function GroupRow({
  group,
  onPress,
}: {
  group: CommunityGroup;
  onPress: () => void;
}) {
  const { c } = useTheme();
  const waiting = group.membership === 'pending';
  const preview = waiting
    ? 'Request pending'
    : group.lastPreview
      ? `${group.lastAuthor ? `${firstName(group.lastAuthor)}: ` : ''}${group.lastPreview.replace(/\s+/g, ' ')}`
      : group.bio || `${group.memberCount} member${group.memberCount === 1 ? '' : 's'}`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 12,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {group.unread ? (
        <View
          style={{
            position: 'absolute',
            left: -14,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: c.accentText,
          }}
        />
      ) : null}

      <GroupCover group={group} size={58} badge />

      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Txt size={16.5} weight={600} style={{ flex: 1 }} numberOfLines={1}>
            {group.name}
          </Txt>
          {isOfficialGroup(group) ? <OfficialMark label /> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {group.muted ? <Txt size={13}>🔕</Txt> : null}
            {group.joinMode === 'request' ? <Ionicons name="lock-closed" size={11} color={c.muted} /> : null}
            <Txt size={13} muted>
              {shortWhen(group.lastAt)}
            </Txt>
          </View>
        </View>
        <Txt size={14.5} muted={!group.unread} numberOfLines={1}>
          {preview}
        </Txt>
      </View>
    </Pressable>
  );
}
