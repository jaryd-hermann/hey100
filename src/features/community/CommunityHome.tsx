import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Label, Txt } from '@/components/ui/Txt';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { queryKeys } from '@/data/repo/keys';
import {
  joinCommunityGroup,
  useCommunityHome,
  type CommunityGroup,
} from '@/data/repo/community';
import { useAuth } from '@/features/auth/AuthProvider';
import { captureEvent } from '@/lib/analytics';
import { useDevMode } from '@/lib/devMode';
import { isServerId } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';

import { CreateGroupForm } from './CreateGroupSheet';
import { DiscoverCard } from './DiscoverCard';
import { GroupCoverSheet } from './GroupCoverSheet';
import { GroupRow } from './GroupRow';
import { seedHome, seedJoin, useSeedTick } from './seed';

const seenPending = new Set<string>();
const joinedFired = new Set<string>();

export function CommunityHome() {
  const router = useRouter();
  const { c } = useTheme();
  const toast = useToast();
  const { userId, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useCommunityHome();
  const { devMode } = useDevMode();
  useSeedTick();
  const [creating, setCreating] = useState(false);
  const [preview, setPreview] = useState<CommunityGroup | null>(null);
  const [joining, setJoining] = useState(false);

  const seeded = useMemo(
    () => (isAdmin && devMode ? seedHome() : { mine: [], discover: [] }),
    [devMode, isAdmin],
  );
  const mine = [...(data?.mine ?? []), ...seeded.mine];
  const discover = [...(data?.discover ?? []), ...seeded.discover];

  useEffect(() => {
    for (const group of data?.mine ?? []) {
      if (group.membership === 'pending') seenPending.add(group.id);
      if (
        group.membership === 'active' &&
        seenPending.has(group.id) &&
        !joinedFired.has(group.id)
      ) {
        joinedFired.add(group.id);
        captureEvent('group_joined', { group_id: group.id, join_mode: group.joinMode });
      }
    }
  }, [data]);

  const openGroup = (group: CommunityGroup) => {
    if (group.membership === 'active') {
      router.push({ pathname: '/group/[id]', params: { id: group.id } });
      return;
    }
    setPreview(group);
  };

  const join = async (note?: string, skipApproval?: boolean) => {
    if (!preview || !userId || joining) return;
    if (preview.membership === 'active') {
      setPreview(null);
      router.push({ pathname: '/group/[id]', params: { id: preview.id } });
      return;
    }
    setJoining(true);
    try {
      if (!isServerId(preview.id)) {
        const instant = skipApproval ?? preview.joinMode === 'open';
        seedJoin(preview.id, instant);
        setPreview(null);
        if (instant) {
          router.push({ pathname: '/group/[id]', params: { id: preview.id } });
        } else {
          toast('Request sent. Anyone in the group can let you in.');
        }
        return;
      }
      const status = await joinCommunityGroup(preview, userId, note);
      await queryClient.invalidateQueries({ queryKey: queryKeys.communityHome(userId) });
      setPreview(null);
      if (status === 'active') {
        joinedFired.add(preview.id);
        captureEvent('group_joined', { group_id: preview.id, join_mode: preview.joinMode });
        router.push({ pathname: '/group/[id]', params: { id: preview.id } });
      } else {
        seenPending.add(preview.id);
        toast('Request sent. Anyone in the group can let you in.');
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not join');
    } finally {
      setJoining(false);
    }
  };

  return (
    <View style={{ gap: 20 }}>
      {isLoading && !mine.length && !discover.length ? <Txt muted>Loading groups…</Txt> : null}

      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 6 }}>
          <Label>Your groups</Label>
          <Pressable
            onPress={() => setCreating(true)}
            style={{
              height: 32,
              paddingHorizontal: 13,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: c.line,
              justifyContent: 'center',
            }}
          >
            <Txt size={13.5} weight={600}>
              + New group
            </Txt>
          </Pressable>
        </View>
        {mine.length ? (
          mine.map((group) => <GroupRow key={group.id} group={group} onPress={() => openGroup(group)} />)
        ) : (
          <Txt size={14.5} muted>
            You have not joined a group yet. Create one, or pick from Find new groups.
          </Txt>
        )}
      </View>

      <View style={{ gap: 12 }}>
        <Label>Find new groups</Label>
        {discover.length ? (
          discover.map((group) => (
            <DiscoverCard key={group.id} group={group} onPress={() => openGroup(group)} />
          ))
        ) : (
          <Txt size={14.5} muted>
            No other groups yet. Yours will show up here for everyone else.
          </Txt>
        )}
      </View>

      <Sheet visible={creating} tall onClose={() => setCreating(false)}>
        <CreateGroupForm
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            void queryClient.invalidateQueries({ queryKey: queryKeys.communityHome(userId) });
            router.push({ pathname: '/group/[id]', params: { id } });
          }}
        />
      </Sheet>

      <GroupCoverSheet
        group={preview}
        busy={joining}
        onClose={() => setPreview(null)}
        onJoin={(note) => void join(note)}
      />
    </View>
  );
}
