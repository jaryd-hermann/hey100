import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, View } from 'react-native';

import { Txt } from '@/components/ui/Txt';
import { isOfficialGroup, type CommunityGroup } from '@/data/repo/community';
import { useTheme } from '@/theme/ThemeProvider';

import { GroupCover, RatingLabel } from './GroupCover';
import { OfficialMark } from './OfficialMark';

export function DiscoverCard({
  group,
  onPress,
}: {
  group: CommunityGroup;
  onPress: () => void;
}) {
  const { c } = useTheme();
  const members = `${group.memberCount.toLocaleString()} member${group.memberCount === 1 ? '' : 's'}`;
  const active = group.weeklyActive ? `${group.weeklyActive} this week` : null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        gap: 12,
        padding: 16,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: c.line,
        backgroundColor: c.surface,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <GroupCover group={group} size={48} />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Txt size={16} weight={600} numberOfLines={1} style={{ flexShrink: 1 }}>
              {group.name}
            </Txt>
            {isOfficialGroup(group) ? <OfficialMark size={15} /> : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {group.joinMode !== 'open' ? <Ionicons name="lock-closed" size={11} color={c.muted} /> : null}
            <Txt size={13} muted>
              {active ? `${members} · ${active}` : members}
            </Txt>
            <RatingLabel avg={group.ratingAvg} count={group.ratingCount} />
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={c.muted} />
      </View>
      {group.bio ? (
        <Txt size={14.5} lh={1.45} muted>
          {group.bio}
        </Txt>
      ) : null}
    </Pressable>
  );
}
