import { Image } from 'expo-image';
import React from 'react';
import { View } from 'react-native';

import { Avatar } from '@/components/ui/AppIcon';
import { Identicon } from '@/components/ui/Identicon';
import { Txt } from '@/components/ui/Txt';
import { isOfficialGroup, type CommunityGroup } from '@/data/repo/community';
import { TeamMark } from '@/features/chat/TeamMark';
import { useTheme } from '@/theme/ThemeProvider';

export function GroupCover({
  group,
  size,
  badge = false,
  round = false,
}: {
  group: Pick<
    CommunityGroup,
    | 'id'
    | 'kind'
    | 'name'
    | 'coverUrl'
    | 'iconSeed'
    | 'hue'
    | 'ownerName'
    | 'ownerPhoto'
    | 'lastAuthor'
    | 'lastAuthorPhoto'
    | 'lastPreview'
  >;
  size: number;
  badge?: boolean;
  /** Circle instead of the default rounded square. */
  round?: boolean;
}) {
  const { c } = useTheme();
  const official = isOfficialGroup(group);
  const radius = round ? size / 2 : Math.round(size * 0.26);
  const badgeName = official
    ? undefined
    : group.lastPreview
      ? group.lastAuthor || group.ownerName
      : group.ownerName;
  const badgePhoto = official
    ? undefined
    : group.lastPreview
      ? group.lastAuthorPhoto || group.ownerPhoto
      : group.ownerPhoto;
  const badgeSize = Math.round(size * 0.4);

  if (official) {
    return <TeamMark size={size} badge={Math.max(14, badgeSize)} ring={c.bg} />;
  }

  return (
    <View style={{ width: size, height: size }}>
      {group.coverUrl ? (
        <Image
          source={{ uri: group.coverUrl }}
          style={{ width: size, height: size, borderRadius: radius, backgroundColor: c.raised }}
        />
      ) : (
        <Identicon seed={group.iconSeed || group.id || group.name} size={size} radius={radius} />
      )}
      {badge && badgeName ? (
        <View
          style={{
            position: 'absolute',
            right: -3,
            bottom: -3,
            borderWidth: 2,
            borderColor: c.bg,
            borderRadius: badgeSize / 2,
          }}
        >
          <Avatar name={badgeName} uri={badgePhoto} size={badgeSize} />
        </View>
      ) : null}
    </View>
  );
}

export function RatingLabel({ avg, count }: { avg?: number; count?: number }) {
  if (!avg || !count) return null;
  return (
    <Txt size={13} muted>
      {avg.toFixed(1)} ({count})
    </Txt>
  );
}
