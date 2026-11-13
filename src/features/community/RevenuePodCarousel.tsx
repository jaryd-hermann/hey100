import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Glyph } from '@/components/brand/Glyph';
import { Label, Txt } from '@/components/ui/Txt';
import { inRevenueBand, type CommunityGroup } from '@/data/repo/community';

const SQUAD = '#3C3C3B';
const LOCKED = '#FF0000';
const UNLOCKED = '#2E5CFF';
const LOCK_SOLID = require('../../../assets/images/glyphs/lock-solid.png');
const LOCK_OPEN = require('../../../assets/images/glyphs/lock-open.png');

export function RevenuePodCarousel({
  pods,
  verifiedMrr,
  onPress,
}: {
  pods: CommunityGroup[];
  verifiedMrr: number | null;
  onPress: (group: CommunityGroup) => void;
}) {
  if (!pods.length) return null;

  return (
    <View style={{ gap: 10, padding: 12, borderRadius: 18, backgroundColor: SQUAD }}>
      <View style={{ gap: 2 }}>
        <Label color="#FFFFFF">Revenue Squads</Label>
        <Txt size={13} color="rgba(255,255,255,0.88)">
          Group chats for similar stage builders
        </Txt>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingRight: 2 }}
      >
        {pods.map((group) => {
          const joined = group.membership === 'active';
          const open =
            joined || inRevenueBand(verifiedMrr, group.revenueMin ?? 0, group.revenueMax);
          return (
            <Pressable
              key={group.id}
              onPress={() => onPress(group)}
              accessibilityRole="button"
              style={({ pressed }) => ({
                width: 176,
                gap: 8,
                padding: 14,
                borderRadius: 16,
                backgroundColor: '#FFFFFF',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Txt size={12} weight={600} color="#5E5E5E">
                  {joined ? 'Joined' : open ? 'Open' : 'Locked'}
                </Txt>
                <Glyph source={open ? LOCK_OPEN : LOCK_SOLID} size={16} color={open ? UNLOCKED : LOCKED} />
              </View>
              <Txt size={18} weight={700} color="#141414" numberOfLines={2}>
                {group.name}
              </Txt>
              <Txt size={13} color="#5E5E5E">
                {group.memberCount.toLocaleString()} member{group.memberCount === 1 ? '' : 's'}
              </Txt>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
