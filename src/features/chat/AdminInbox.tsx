import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';

import { Avatar } from '@/components/ui/AppIcon';
import { Card } from '@/components/ui/Card';
import { Txt } from '@/components/ui/Txt';
import { fetchAdminThreads } from '@/data/repo/admin';
import { radii } from '@/theme/tokens';

/** Inbound 1:1s with Jaryd. Team posts live in Hey100 builders. */
export function AdminInbox() {
  const router = useRouter();

  const { data: threads = [] } = useQuery({
    queryKey: ['admin-threads'],
    queryFn: fetchAdminThreads,
  });

  if (!threads.length) {
    return (
      <View style={{ paddingTop: 40, alignItems: 'center', gap: 8 }}>
        <Txt size={15} muted center style={{ maxWidth: 260 }}>
          DMs from builders land here. Post to everyone in Hey100 builders.
        </Txt>
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
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
