import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '@/components/ui/Toast';
import { queryKeys } from '@/data/repo/keys';
import {
  replyToThread,
  reportCommunityMessage,
  toggleCommunityReaction,
  useCommunityThread,
  type CommunityMember,
  type CommunityReply,
  type CommunityThread,
} from '@/data/repo/community';
import { findSponsoredTool, useSponsoredTools, type SponsoredTool } from '@/data/repo/tools';
import { Composer } from '@/features/community/Composer';
import { GroupHeader } from '@/features/community/GroupHeader';
import { MemberProfileSheet } from '@/features/community/MemberProfileSheet';
import { MessageMenu } from '@/features/community/MessageMenu';
import { ThreadBubble } from '@/features/community/ThreadBubble';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';

type Target =
  | { kind: 'thread'; row: CommunityThread }
  | { kind: 'reply'; row: CommunityReply };

export default function ToolThreadScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const toast = useToast();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const { id, threadId } = useLocalSearchParams<{ id: string; threadId: string }>();
  const tools = useSponsoredTools();
  const tool = findSponsoredTool(tools, id);
  const remote = useCommunityThread(threadId);
  const thread = remote.data?.thread;
  const replies = remote.data?.replies ?? [];
  const [target, setTarget] = useState<Target | null>(null);
  const [profile, setProfile] = useState<CommunityMember | null>(null);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.communityThread(threadId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.sponsoredTools });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
          group={tool ? asGroup(tool) : null}
          title={`${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
          subtitle={tool?.name ?? 'Thread'}
          onBack={() => router.back()}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 80,
          paddingHorizontal: 16,
          paddingBottom: 190,
        }}
      >
        {thread ? (
          <ThreadBubble
            author={{
              id: thread.authorId,
              name: thread.authorName,
              photo: thread.authorPhoto,
              listingId: thread.authorListingId,
            }}
            body={thread.body}
            media={thread.media}
            reactions={thread.reactions}
            onLongPress={() => setTarget({ kind: 'thread', row: thread })}
            onReact={(emoji) => void react({ kind: 'thread', row: thread }, emoji)}
            onAuthorPress={() => openAuthor(thread.authorId, thread.authorName, thread.authorPhoto, thread.authorListingId)}
          />
        ) : null}

        {replies.map((reply) => (
          <ThreadBubble
            key={reply.id}
            author={{
              id: reply.authorId,
              name: reply.authorName,
              photo: reply.authorPhoto,
              listingId: reply.authorListingId,
            }}
            body={reply.body}
            media={reply.media}
            reactions={reply.reactions}
            onLongPress={() => setTarget({ kind: 'reply', row: reply })}
            onReact={(emoji) => void react({ kind: 'reply', row: reply }, emoji)}
            onAuthorPress={() => openAuthor(reply.authorId, reply.authorName, reply.authorPhoto, reply.authorListingId)}
          />
        ))}
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: insets.bottom + 12,
        }}
      >
        <Composer
          placeholder="Send a reply…"
          sendLabel="Reply"
          disabled={!userId}
          onSend={async (body, media) => {
            if (!userId) return;
            await replyToThread(threadId, userId, body, media);
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
          await reportCommunityMessage({
            threadId: target.kind === 'thread' ? target.row.id : undefined,
            replyId: target.kind === 'reply' ? target.row.id : undefined,
            userId,
            reason,
          });
          setTarget(null);
          toast('Report sent. Thanks.');
        }}
      />
      <MemberProfileSheet member={profile} onClose={() => setProfile(null)} />
    </KeyboardAvoidingView>
  );

  function openAuthor(userId: string, name: string, photo?: string, listingId?: string) {
    setProfile({
      userId,
      name,
      photo,
      role: 'member',
      status: 'active',
      apps: listingId ? 1 : 0,
      commits: null,
      revenue: '—',
      appIds: listingId ? [listingId] : [],
    });
  }

  async function react(next: Target, emoji: string) {
    if (!userId) return;
    const mine = !!next.row.reactions?.find((row) => row.emoji === emoji)?.mine;
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

function asGroup(tool: SponsoredTool) {
  return {
    id: tool.id,
    name: tool.name,
    bio: tool.subtitle,
    audience: '',
    coverUrl: tool.logoUrl,
    joinMode: 'open' as const,
    createdBy: '',
    memberCount: tool.talkerCount,
    hue: 210,
  };
}
