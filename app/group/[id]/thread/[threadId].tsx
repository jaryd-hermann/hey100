import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '@/components/ui/Toast';
import { queryKeys } from '@/data/repo/keys';
import {
  replyToThread,
  reportCommunityMessage,
  toggleCommunityReaction,
  useCommunityGroup,
  useCommunityThread,
  type CommunityMember,
  type CommunityReply,
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
import { readCursor } from '@/features/community/readCursor';
import { GroupHeader } from '@/features/community/GroupHeader';
import { MemberProfileSheet } from '@/features/community/MemberProfileSheet';
import { MessageMenu } from '@/features/community/MessageMenu';
import { ThreadBubble } from '@/features/community/ThreadBubble';
import {
  isSeedId,
  seedGroup,
  seedReply,
  seedThread,
  seedToggleReaction,
  useSeedTick,
} from '@/features/community/seed';
import { useAuth } from '@/features/auth/AuthProvider';
import { captureEvent } from '@/lib/analytics';
import { useTheme } from '@/theme/ThemeProvider';

type Target =
  | { kind: 'thread'; row: CommunityThread }
  | { kind: 'reply'; row: CommunityReply };

export default function ThreadScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const toast = useToast();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const { id, threadId } = useLocalSearchParams<{ id: string; threadId: string }>();
  const seeded = isSeedId(id) || isSeedId(threadId);
  useSeedTick();
  const remoteGroup = useCommunityGroup(seeded ? null : id);
  const remote = useCommunityThread(seeded ? null : threadId);
  const group = seeded ? seedGroup(id) : remoteGroup.data;
  const data = seeded ? seedThread(threadId) : remote.data;
  const thread = data?.thread;
  const replies = data?.replies ?? [];
  const [target, setTarget] = useState<Target | null>(null);
  const [profile, setProfile] = useState<CommunityMember | null>(null);
  const items = useMemo(
    () => (thread ? [{ id: thread.id, createdAt: thread.createdAt }, ...replies] : replies),
    [replies, thread],
  );
  const unreadStart = firstUnreadIndex(
    items.map((item) => item.createdAt),
    id ? readCursor(id) : undefined,
  );
  const { scrollRef, onUnreadLayout, onContentSizeChange } = useChatAnchor(unreadStart >= 0);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.communityThread(threadId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.communityGroup(id) });
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
          title={`${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
          subtitle={group?.name ?? 'Thread'}
          onBack={() => router.back()}
          onOpenInfo={() => router.push({ pathname: '/group/[id]/members', params: { id } })}
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
        {thread ? (
          <>
            {shouldStamp(undefined, thread.createdAt) ? (
              <ChatStamp label={stampLabel(thread.createdAt)} />
            ) : null}
            {unreadStart === 0 ? <UnreadDivider onReady={onUnreadLayout} /> : null}
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
              onLongPress={() => setTarget({ kind: 'thread', row: thread })}
              onReact={(emoji) => void react({ kind: 'thread', row: thread }, emoji)}
              onAuthorPress={() =>
                setProfile({
                  userId: thread.authorId,
                  name: thread.authorName,
                  photo: thread.authorPhoto,
                  role: thread.authorId === group?.createdBy ? 'owner' : 'member',
                  status: 'active',
                  apps: thread.authorListingId ? 1 : 0,
                  commits: null,
                  revenue: '—',
                  appIds: thread.authorListingId ? [thread.authorListingId] : [],
                })
              }
            />
          </>
        ) : null}

        {replies.map((reply, index) => (
          <React.Fragment key={reply.id}>
            {shouldStamp(index === 0 ? thread?.createdAt : replies[index - 1]?.createdAt, reply.createdAt) ? (
              <ChatStamp label={stampLabel(reply.createdAt)} />
            ) : null}
            {unreadStart === index + (thread ? 1 : 0) ? (
              <UnreadDivider onReady={onUnreadLayout} />
            ) : null}
            <ThreadBubble
              author={{
                id: reply.authorId,
                name: reply.authorName,
                photo: reply.authorPhoto,
                listingId: reply.authorListingId,
                owner: reply.authorId === group?.createdBy,
              }}
              body={reply.body}
              media={reply.media}
              reactions={reply.reactions}
              onLongPress={() => setTarget({ kind: 'reply', row: reply })}
              onReact={(emoji) => void react({ kind: 'reply', row: reply }, emoji)}
              onAuthorPress={() =>
                setProfile({
                  userId: reply.authorId,
                  name: reply.authorName,
                  photo: reply.authorPhoto,
                  role: reply.authorId === group?.createdBy ? 'owner' : 'member',
                  status: 'active',
                  apps: reply.authorListingId ? 1 : 0,
                  commits: null,
                  revenue: '—',
                  appIds: reply.authorListingId ? [reply.authorListingId] : [],
                })
              }
            />
          </React.Fragment>
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: 14, paddingTop: 4 }}>
        <Composer
          placeholder="Send a reply…"
          sendLabel="Reply"
          bottomInset={insets.bottom}
          disabled={!userId}
          onSend={async (body, media) => {
            if (!userId) return;
            if (seeded) {
              seedReply(threadId, userId, body);
              return;
            }
            await replyToThread(threadId, userId, body, media);
            captureEvent('group_reply_created', {
              group_id: id,
              thread_id: threadId,
              has_media: (media?.length ?? 0) > 0,
            });
            refresh();
          }}
        />
      </View>

      <MessageMenu
        visible={!!target}
        onClose={() => setTarget(null)}
        onReact={(emoji) => {
          if (target) void react(target, emoji);
          setTarget(null);
        }}
        onReport={async (reason) => {
          if (!target || !userId) return;
          if (!seeded) {
            await reportCommunityMessage({
              threadId: target.kind === 'thread' ? target.row.id : undefined,
              replyId: target.kind === 'reply' ? target.row.id : undefined,
              userId,
              reason,
            });
          }
          setTarget(null);
          toast('Report sent. Thanks.');
        }}
      />
      <MemberProfileSheet member={profile} onClose={() => setProfile(null)} />
    </KeyboardAvoidingView>
  );

  async function react(next: Target, emoji: string) {
    const mine = !!next.row.reactions?.find((row) => row.emoji === emoji)?.mine;
    if (seeded) {
      seedToggleReaction(next.row.id, emoji, next.kind);
      return;
    }
    if (!userId) return;
    await toggleCommunityReaction({
      threadId: next.kind === 'thread' ? next.row.id : undefined,
      replyId: next.kind === 'reply' ? next.row.id : undefined,
      userId,
      emoji,
      mine,
    });
    refresh();
  }
}
