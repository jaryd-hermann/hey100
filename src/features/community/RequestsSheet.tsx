import React from 'react';
import { Pressable, View } from 'react-native';

import { AppIcon, Avatar } from '@/components/ui/AppIcon';
import { Btn } from '@/components/ui/Btn';
import { Sheet } from '@/components/ui/Sheet';
import { Txt } from '@/components/ui/Txt';
import { LISTINGS, MATCH_APPS } from '@/data/mock';
import type { CommunityMember } from '@/data/repo/community';
import { useTheme } from '@/theme/ThemeProvider';

export function RequestsSheet({
  visible,
  requests,
  busyId,
  onClose,
  onOpen,
  onAccept,
  onDecline,
}: {
  visible: boolean;
  requests: CommunityMember[];
  busyId?: string | null;
  onClose: () => void;
  onOpen: (member: CommunityMember) => void;
  onAccept: (member: CommunityMember) => void;
  onDecline: (member: CommunityMember) => void;
}) {
  const { c } = useTheme();

  return (
    <Sheet visible={visible} tall onClose={onClose}>
      <View style={{ gap: 14 }}>
        <Txt font="mono" size={20} weight={500}>
          Join requests
        </Txt>
        <Txt size={14} muted>
          Anyone in the group can approve. Open a profile for a closer look.
        </Txt>
        {requests.length ? (
          requests.map((member) => (
            <View
              key={member.userId}
              style={{
                padding: 14,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: c.line,
                backgroundColor: c.raised,
                gap: 10,
              }}
            >
              <Pressable
                onPress={() => onOpen(member)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
              >
                <Avatar name={member.name} uri={member.photo} size={48} />
                <View style={{ flex: 1, gap: 3 }}>
                  <Txt size={16} weight={600}>
                    {member.name}
                  </Txt>
                  <Txt size={12.5} muted>
                    {member.apps} app{member.apps === 1 ? '' : 's'} ·{' '}
                    {member.commits != null ? `${member.commits.toLocaleString()} commits` : 'commits —'} ·{' '}
                    {member.revenue}
                  </Txt>
                </View>
              </Pressable>
              {member.bio ? (
                <Txt size={13.5} lh={1.4}>
                  {member.bio}
                </Txt>
              ) : null}
              {member.note ? (
                <Txt size={13.5} lh={1.4} muted>
                  “{member.note}”
                </Txt>
              ) : null}
              <AppRow member={member} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Btn
                    label="Decline"
                    variant="outline"
                    full
                    disabled={busyId === member.userId}
                    onPress={() => onDecline(member)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Btn
                    label={busyId === member.userId ? '…' : 'Approve'}
                    variant="accent"
                    full
                    disabled={busyId === member.userId}
                    onPress={() => onAccept(member)}
                  />
                </View>
              </View>
            </View>
          ))
        ) : (
          <Txt muted>No pending requests.</Txt>
        )}
      </View>
    </Sheet>
  );
}

function AppRow({ member }: { member: CommunityMember }) {
  const apps =
    member.listings?.length
      ? member.listings
      : member.appIds
          .map((id) => LISTINGS[id] ?? MATCH_APPS[id])
          .filter((app): app is NonNullable<typeof app> => !!app)
          .map((app) => ({ id: app.id, name: app.name, hue: app.hue, icon: app.icon }));
  if (!apps.length) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {apps.slice(0, 6).map((app) => (
        <AppIcon key={app.id} hue={app.hue} name={app.name} uri={app.icon} size={28} />
      ))}
    </View>
  );
}
