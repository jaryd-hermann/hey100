import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, View } from 'react-native';

import { Glass } from '@/components/ui/Glass';
import { Txt } from '@/components/ui/Txt';
import { isOfficialGroup, type CommunityGroup } from '@/data/repo/community';
import { useTheme } from '@/theme/ThemeProvider';

import { GroupCover } from './GroupCover';
import { OfficialMark } from './OfficialMark';

export function GroupHeader({
  group,
  title,
  subtitle,
  onBack,
  onOpenInfo,
  onMute,
  extra,
}: {
  group?: CommunityGroup | null;
  title: string;
  subtitle: string;
  onBack: () => void;
  onOpenInfo?: () => void;
  onMute?: () => void;
  extra?: React.ReactNode;
}) {
  const { c } = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <GlassCircle onPress={onBack} label="Back">
        <Ionicons name="chevron-back" size={22} color={c.ink} />
      </GlassCircle>

      <Pressable onPress={onOpenInfo} style={{ flex: 1, minWidth: 0 }}>
        <Glass radius={26} intensity={55} style={{ height: 52, flex: 1 }}>
          <View
            style={{
              height: 52,
              paddingLeft: 11,
              paddingRight: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {group ? <GroupCover group={group} size={30} /> : null}
            <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Txt size={15} weight={600} numberOfLines={1} style={{ flexShrink: 1 }}>
                  {title}
                </Txt>
                {isOfficialGroup(group) ? <OfficialMark size={15} /> : null}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {group?.joinMode === 'request' ? (
                  <Ionicons name="lock-closed" size={10} color={c.muted} />
                ) : null}
                <Txt size={12.5} muted numberOfLines={1}>
                  {subtitle}
                </Txt>
              </View>
            </View>
          </View>
        </Glass>
      </Pressable>

      {onMute ? (
        <GlassCircle onPress={onMute} label={group?.muted ? 'Unmute' : 'Mute'}>
          <Ionicons name={group?.muted ? 'notifications-off' : 'notifications'} size={18} color={c.ink} />
        </GlassCircle>
      ) : null}
      {extra}
    </View>
  );
}

function GlassCircle({
  children,
  onPress,
  label,
}: {
  children: React.ReactNode;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={label}>
      <Glass radius={22} intensity={55} style={{ width: 44, height: 44 }}>
        <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
      </Glass>
    </Pressable>
  );
}
