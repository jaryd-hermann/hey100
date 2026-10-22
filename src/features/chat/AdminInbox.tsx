import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';

import { Avatar } from '@/components/ui/AppIcon';
import { Card } from '@/components/ui/Card';
import { Txt } from '@/components/ui/Txt';
import { fetchAdminThreads, fetchBroadcasts } from '@/data/repo/admin';
import { TEAM_ID } from '@/features/chat/chatMeta';
import { TeamMark } from '@/features/chat/TeamMark';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

/**
 * The other side of the user Chat tab: a pinned Hey100 team thread for
 * broadcasts, then inbound DMs as 1:1 rows.
 */
export function AdminInbox() {
  const router = useRouter();
  const { c } = useTheme();

  const { data: threads = [] } = useQuery({
    queryKey: ['admin-threads'],
    queryFn: fetchAdminThreads,
  });
  const { data: broadcasts = [] } = useQuery({
    queryKey: ['broadcasts'],
    queryFn: fetchBroadcasts,
  });

  const lastBroadcast = broadcasts[broadcasts.length - 1];
  const teamPreview = lastBroadcast?.body ?? 'Message every builder…';

  return (
    <View style={{ gap: 12 }}>
      <Pressable
        onPress={() =>
          router.push({ pathname: '/chat/[id]', params: { id: TEAM_ID, desk: 'admin' } })
        }
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      >
        <Card padding={14} radius={radii.cardLg} style={{ borderColor: c.ink }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TeamMark size={48} badge={22} />
            <View style={{ flex: 1, gap: 3 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Txt font="mono" size={15} weight={500} style={{ flex: 1 }} numberOfLines={1}>
                  Hey100 Team
                </Txt>
                <Txt size={11} weight={600} color={c.accentText}>
                  Pinned
                </Txt>
              </View>
              <Txt size={13.5} muted numberOfLines={1}>
                {teamPreview}
              </Txt>
              <Txt size={11.5} color={c.accentText} numberOfLines={1}>
                Broadcast · replies come back as DMs
              </Txt>
            </View>
          </View>
        </Card>
      </Pressable>

      {threads.map((thread) => (
        <Pressable
          key={thread.userId}
          onPress={() =>
            router.push({ pathname: '/admin/[userId]', params: { userId: thread.userId } })
          }
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <Card padding={14} radius={radii.cardLg}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Avatar name={thread.name} uri={thread.photo} size={48} />
              <View style={{ flex: 1, gap: 3 }}>
                <Txt font="mono" size={15} weight={500} numberOfLines={1}>
                  {thread.name}
                </Txt>
                <Txt size={13.5} muted numberOfLines={1}>
                  {thread.last}
                </Txt>
              </View>
            </View>
          </Card>
        </Pressable>
      ))}
    </View>
  );
}
