import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, Avatar } from '@/components/ui/AppIcon';
import { Chip } from '@/components/ui/Chip';
import { useToast } from '@/components/ui/Toast';
import { Txt } from '@/components/ui/Txt';
import { LISTINGS, MATCH_APPS } from '@/data/mock';
import { useCommunityGroup, useCommunityMembers, type CommunityMember } from '@/data/repo/community';
import { MemberProfileSheet } from '@/features/community/MemberProfileSheet';
import { copyGroupLink } from '@/features/community/shareGroup';
import { isSeedId, seedGroup, seedMembers } from '@/features/community/seed';
import { useTheme } from '@/theme/ThemeProvider';
import { layout } from '@/theme/tokens';

export default function GroupMembersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const seeded = isSeedId(id);
  const remoteGroup = useCommunityGroup(seeded ? null : id);
  const remoteMembers = useCommunityMembers(seeded ? null : id);
  const group = seeded ? seedGroup(id) : remoteGroup.data;
  const members = seeded ? seedMembers(id) : (remoteMembers.data ?? []);
  const toast = useToast();
  const [profile, setProfile] = useState<CommunityMember | null>(null);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: layout.gutter,
          paddingBottom: 10,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color={c.ink} />
        </Pressable>
        <Txt font="mono" size={17} weight={500} style={{ flex: 1 }} numberOfLines={1}>
          Members
        </Txt>
        {group ? (
          <Pressable
            onPress={() => copyGroupLink(group, toast)}
            hitSlop={12}
            accessibilityLabel="Copy group link"
          >
            <Ionicons name="link-outline" size={22} color={c.ink} />
          </Pressable>
        ) : null}
        <Txt size={13} muted>
          {members.length}
        </Txt>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingBottom: insets.bottom + 24,
          gap: 14,
        }}
      >
        <Txt size={13} muted>
          {group?.name}
        </Txt>
        {members.map((member) => (
          <Pressable
            key={member.userId}
            onPress={() => setProfile(member)}
            style={{
              gap: 10,
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderColor: c.line,
            }}
          >
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Avatar name={member.name} uri={member.photo} size={44} />
              <View style={{ flex: 1, gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Txt size={15} weight={600} style={{ flex: 1 }} numberOfLines={1}>
                    {member.name}
                  </Txt>
                  {member.role === 'owner' ? <Chip label="Owner" size="sm" /> : null}
                </View>
                <Txt size={12.5} muted>
                  {member.apps} app{member.apps === 1 ? '' : 's'} ·{' '}
                  {member.commits != null ? `${member.commits.toLocaleString()} commits` : 'commits —'} ·{' '}
                  {member.revenue}
                </Txt>
              </View>
            </View>
            <AppCarousel member={member} />
          </Pressable>
        ))}
      </ScrollView>

      <MemberProfileSheet member={profile} onClose={() => setProfile(null)} />
    </View>
  );
}

function AppCarousel({ member }: { member: CommunityMember }) {
  const apps = (member.listings?.length
    ? member.listings
    : member.appIds.map((id) => LISTINGS[id] ?? MATCH_APPS[id]).filter(Boolean)
  ).slice(0, 8);
  if (!apps.length) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingLeft: 56 }}>
      {apps.map((app) => (
        <AppIcon
          key={'id' in app && app.id ? app.id : app.name}
          hue={app.hue}
          name={app.name}
          uri={'icon' in app ? app.icon : undefined}
          size={32}
        />
      ))}
    </ScrollView>
  );
}
