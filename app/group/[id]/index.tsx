import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SearchField } from '@/components/ui/SearchField';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { Txt } from '@/components/ui/Txt';
import { queryKeys } from '@/data/repo/keys';
import {
  isOfficialGroup,
  leaveCommunityGroup,
  markCommunityGroupRead,
  muteCommunityGroup,
  rateCommunityGroup,
  reportCommunityGroup,
  reportCommunityMessage,
  reviewCommunityRequest,
  startThread,
  toggleCommunityReaction,
  useCommunityGroup,
  useCommunityRequests,
  useCommunityThreads,
  type CommunityMember,
  type CommunityThread,
} from '@/data/repo/community';
import {
  ChatStamp,
  firstUnreadIndex,
  shouldStamp,
  stampLabel,
  UnreadDivider,
  useChatAnchor,
} from '@/features/chat/ChatStamp';
import { Composer } from '@/features/community/Composer';
import { captureReadCursor, readCursor } from '@/features/community/readCursor';
import { GroupHeader } from '@/features/community/GroupHeader';
import { GroupPower } from '@/features/community/GroupPower';
import { MemberProfileSheet } from '@/features/community/MemberProfileSheet';
import { MessageMenu } from '@/features/community/MessageMenu';
import { RequestsSheet } from '@/features/community/RequestsSheet';
import { copyGroupLink } from '@/features/community/shareGroup';
import { ThreadBubble } from '@/features/community/ThreadBubble';
import {
  isSeedId,
  seedGroup,
  seedLeave,
  seedMarkRead,
  seedMembers,
  seedMute,
  seedRate,
  seedRequests,
  seedReview,
  seedStartThread,
  seedThreads,
  seedToggleReaction,
  useSeedTick,
} from '@/features/community/seed';
import { useAuth } from '@/features/auth/AuthProvider';
import { captureEvent } from '@/lib/analytics';
import { useTheme } from '@/theme/ThemeProvider';

export default function GroupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const toast = useToast();
  const { userId, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const seeded = isSeedId(id);
  useSeedTick();
  const remoteGroup = useCommunityGroup(seeded ? null : id);
  const remoteThreads = useCommunityThreads(seeded ? null : id);
  const remoteRequests = useCommunityRequests(seeded ? null : id);
  const group = seeded ? seedGroup(id) : remoteGroup.data;
  const threads = seeded ? seedThreads(id) : (remoteThreads.data ?? []);
  const requests = seeded ? seedRequests(id) : (remoteRequests.data ?? []);
  const [query, setQuery] = useState('');
  const [menu, setMenu] = useState(false);
  const [target, setTarget] = useState<CommunityThread | null>(null);
  const [profile, setProfile] = useState<CommunityMember | null>(null);
  const [queue, setQueue] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !group) return;
    captureReadCursor(id, group.lastReadAt);
    if (seeded) seedMarkRead(id);
    else void markCommunityGroupRead(id);
  }, [group, id, seeded]);

  const unreadStart = useMemo(() => {
    const times = threads.map((thread) => thread.createdAt);
    const at = id ? readCursor(id) : undefined;
    if (at) return firstUnreadIndex(times, at);
    return group?.unread ? Math.max(0, threads.length - 1) : -1;
  }, [group?.unread, id, threads]);
  const { scrollRef, onUnreadLayout, onContentSizeChange } = useChatAnchor(unreadStart >= 0);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return threads;
    return threads.filter(
      (thread) =>
        thread.body.toLowerCase().includes(needle) ||
        thread.authorName.toLowerCase().includes(needle),
    );
  }, [query, threads]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.communityGroup(id) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.communityHome(userId) });
  };

  const official = isOfficialGroup(group);
  const canPost = !official || isAdmin;
  const pending = official ? 0 : (group?.pendingCount ?? requests.length);
  const membersLabel = group?.ratingAvg
    ? `${group.memberCount} members · ${group.ratingAvg.toFixed(1)} (${group.ratingCount})`
    : `${group?.memberCount ?? 0} member${(group?.memberCount ?? 0) === 1 ? '' : 's'}`;

  const openAuthor = (authorId: string, name: string, photo?: string, listingId?: string) => {
    const found =
      (seeded ? [...seedMembers(id), ...seedRequests(id)] : []).find((row) => row.userId === authorId) ??
      ({
        userId: authorId,
        name,
        photo,
        role: authorId === group?.createdBy ? 'owner' : 'member',
        status: 'active',
        apps: listingId ? 1 : 0,
        commits: null,
        revenue: '—',
        appIds: listingId ? [listingId] : [],
      } satisfies CommunityMember);
    setProfile(found);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
      style={{ flex: 1, backgroundColor: c.bg }}
    >
      <View
        style={{
          position: 'absolute',
          top: insets.top + 6,
          left: 12,
          right: 12,
          zIndex: 20,
        }}
      >
        <GroupHeader
          group={group}
          title={group?.name ?? 'Group'}
          subtitle={membersLabel}
          onBack={() => router.back()}
          onOpenInfo={() => setMenu(true)}
          onMute={async () => {
            if (!userId || !id) return;
            if (seeded) {
              seedMute(id, !group?.muted);
            } else {
              await muteCommunityGroup(id, userId, !group?.muted);
              refresh();
            }
            toast(group?.muted ? 'Unmuted' : 'Muted');
          }}
        />
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onContentSizeChange={onContentSizeChange}
        contentContainerStyle={{
          paddingTop: insets.top + 80,
          paddingHorizontal: 16,
          paddingBottom: 16,
        }}
      >
        {visible.map((thread, index) => (
          <React.Fragment key={thread.id}>
            {shouldStamp(visible[index - 1]?.createdAt, thread.createdAt) ? (
              <ChatStamp label={stampLabel(thread.createdAt)} />
            ) : null}
            {index === unreadStart && !query.trim() ? (
              <UnreadDivider onReady={onUnreadLayout} />
            ) : null}
          <ThreadBubble
            author={{
              id: thread.authorId,
              name: thread.authorName,
              photo: thread.authorPhoto,
              listingId: thread.authorListingId,
              owner: thread.authorId === group?.createdBy,
            }}
            body={thread.body}
            media={thread.media}
            reactions={thread.reactions}
            replies={thread.replyCount}
            replyAvatars={thread.replyAvatars}
            onPress={() =>
              router.push({
                pathname: '/group/[id]/thread/[threadId]',
                params: { id, threadId: thread.id },
              })
            }
            onLongPress={() => setTarget(thread)}
            onReact={(emoji) => void react(thread, emoji)}
            onAuthorPress={() =>
              openAuthor(thread.authorId, thread.authorName, thread.authorPhoto, thread.authorListingId)
            }
          />
          </React.Fragment>
        ))}
        {!visible.length ? (
          <View style={{ paddingTop: 70, alignItems: 'center', gap: 8 }}>
            <Txt font="mono" size={18} weight={500} center>
              {official ? 'Jaryd posts here' : 'Start the first thread'}
            </Txt>
            <Txt size={14.5} muted center style={{ maxWidth: 260 }}>
              {official
                ? 'Reply on a post to chime in. Only the team starts new threads.'
                : 'Ask a question or share what you shipped.'}
            </Txt>
          </View>
        ) : null}
      </ScrollView>

      {pending > 0 ? (
        <View style={{ alignItems: 'flex-end', paddingHorizontal: 16, paddingBottom: 8 }}>
          <Pressable
            onPress={() => setQueue(true)}
            style={{
              height: 36,
              paddingHorizontal: 14,
              borderRadius: 18,
              backgroundColor: c.ink,
              justifyContent: 'center',
            }}
          >
            <Txt size={13} weight={600} color={c.bg}>
              {pending} request{pending === 1 ? '' : 's'}
            </Txt>
          </Pressable>
        </View>
      ) : null}

      {canPost ? (
        <View style={{ paddingHorizontal: 14, paddingTop: 4 }}>
          <Composer
            placeholder={official ? 'Post to every builder…' : 'Start a new thread…'}
            sendLabel="Post"
            bottomInset={insets.bottom}
            disabled={!userId}
            onSend={async (body, media) => {
              if (!userId) return;
              if (seeded) {
                seedStartThread(id, userId, body);
                return;
              }
              await startThread(id, userId, body, media);
              captureEvent('group_thread_created', {
                group_id: id,
                has_media: (media?.length ?? 0) > 0,
              });
              refresh();
            }}
          />
        </View>
      ) : null}

      <Sheet
        visible={menu}
        onClose={() => {
          setMenu(false);
          setQuery('');
        }}
      >
        <View style={{ gap: 8 }}>
          <SearchField value={query} onChangeText={setQuery} placeholder="Search this group" />
          {query.trim() ? (
            visible.length ? (
              visible.slice(0, 8).map((thread) => (
                <Pressable
                  key={thread.id}
                  onPress={() => {
                    setMenu(false);
                    setQuery('');
                    router.push({
                      pathname: '/group/[id]/thread/[threadId]',
                      params: { id, threadId: thread.id },
                    });
                  }}
                  style={{
                    padding: 14,
                    borderRadius: 16,
                    backgroundColor: c.raised,
                    gap: 4,
                  }}
                >
                  <Txt size={14} weight={600} numberOfLines={1}>
                    {thread.authorName}
                  </Txt>
                  <Txt size={13.5} muted numberOfLines={2}>
                    {thread.body}
                  </Txt>
                </Pressable>
              ))
            ) : (
              <Txt size={14} muted>
                No threads match that.
              </Txt>
            )
          ) : (
            <>
          {official ? null : (
            <>
          <Txt muted size={13}>
            Rate this group
          </Txt>
          <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 8 }}>
            {[1, 2, 3, 4, 5].map((stars) => (
              <Pressable
                key={stars}
                onPress={async () => {
                  if (seeded) seedRate(id, stars);
                  else if (userId) await rateCommunityGroup(id, userId, stars);
                  refresh();
                  toast(`Rated ${stars} / 5`);
                }}
              >
                <Txt size={22}>{stars <= (group?.myRating ?? 0) ? '★' : '☆'}</Txt>
              </Pressable>
            ))}
          </View>
            </>
          )}
          {group?.power ? (
            <View style={{ paddingBottom: 8 }}>
              <GroupPower power={group.power} />
            </View>
          ) : null}
          <MenuRow
            label="Members"
            onPress={() => {
              setMenu(false);
              router.push({ pathname: '/group/[id]/members', params: { id } });
            }}
          />
          {group ? (
            <MenuRow
              label="Share group"
              onPress={() => {
                copyGroupLink(group, toast);
                setMenu(false);
              }}
            />
          ) : null}
          {pending > 0 ? (
            <MenuRow
              label={`${pending} join request${pending === 1 ? '' : 's'}`}
              onPress={() => {
                setMenu(false);
                setQueue(true);
              }}
            />
          ) : null}
          <MenuRow
            label="Report group"
            onPress={() => {
              setMenu(false);
              Alert.alert('Report this group?', 'We will review it.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Report',
                  style: 'destructive',
                  onPress: async () => {
                    if (!userId || seeded) {
                      toast('Reported');
                      return;
                    }
                    await reportCommunityGroup(id, userId);
                    toast('Reported');
                  },
                },
              ]);
            }}
          />
          {official ? null : (
          <MenuRow
            label="Leave group"
            danger
            onPress={() => {
              setMenu(false);
              Alert.alert('Leave this group?', undefined, [
                { text: 'Stay', style: 'cancel' },
                {
                  text: 'Leave',
                  style: 'destructive',
                  onPress: async () => {
                    if (seeded) {
                      seedLeave(id);
                      router.back();
                      return;
                    }
                    if (!userId) return;
                    await leaveCommunityGroup(id, userId);
                    refresh();
                    router.back();
                  },
                },
              ]);
            }}
          />
          )}
            </>
          )}
        </View>
      </Sheet>


      <MessageMenu
        visible={!!target}
        onClose={() => setTarget(null)}
        onReply={() => {
          if (!target) return;
          router.push({
            pathname: '/group/[id]/thread/[threadId]',
            params: { id, threadId: target.id },
          });
          setTarget(null);
        }}
        onReact={(emoji) => {
          if (target) void react(target, emoji);
          setTarget(null);
        }}
        onReport={async (reason) => {
          if (!target || !userId) return;
          if (!seeded) await reportCommunityMessage({ threadId: target.id, userId, reason });
          setTarget(null);
          toast('Report sent. Thanks.');
        }}
      />

      <MemberProfileSheet member={profile} onClose={() => setProfile(null)} />
      <RequestsSheet
        visible={queue}
        requests={requests}
        busyId={busyId}
        onClose={() => setQueue(false)}
        onOpen={(member) => {
          setQueue(false);
          setProfile(member);
        }}
        onAccept={async (member) => {
          setBusyId(member.userId);
          try {
            if (seeded) seedReview(id, member.userId, true);
            else await reviewCommunityRequest(id, member.userId, true);
            refresh();
            void queryClient.invalidateQueries({ queryKey: queryKeys.communityRequests(id) });
            toast(`Approved ${member.name}`);
          } finally {
            setBusyId(null);
          }
        }}
        onDecline={async (member) => {
          setBusyId(member.userId);
          try {
            if (seeded) seedReview(id, member.userId, false);
            else await reviewCommunityRequest(id, member.userId, false);
            refresh();
            void queryClient.invalidateQueries({ queryKey: queryKeys.communityRequests(id) });
            toast('Request declined');
          } finally {
            setBusyId(null);
          }
        }}
      />
    </KeyboardAvoidingView>
  );

  async function react(thread: CommunityThread, emoji: string) {
    const mine = !!thread.reactions?.find((row) => row.emoji === emoji)?.mine;
    if (seeded) {
      seedToggleReaction(thread.id, emoji, 'thread');
      return;
    }
    if (!userId) return;
    await toggleCommunityReaction({ threadId: thread.id, userId, emoji, mine });
    refresh();
  }
}

function MenuRow({
  label,
  onPress,
  danger,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 52,
        borderRadius: 16,
        backgroundColor: c.raised,
        paddingHorizontal: 16,
        justifyContent: 'center',
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Txt size={16} weight={600} color={danger ? c.danger : undefined}>
        {label}
      </Txt>
    </Pressable>
  );
}
