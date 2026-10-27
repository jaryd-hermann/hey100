import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass } from '@/components/ui/Glass';
import { useToast } from '@/components/ui/Toast';
import { Txt } from '@/components/ui/Txt';
import { queryKeys } from '@/data/repo/keys';
import {
  reportCommunityMessage,
  startThread,
  toggleCommunityReaction,
  useCommunityThreads,
  type CommunityMember,
  type CommunityThread,
} from '@/data/repo/community';
import {
  ensureToolDiscussion,
  findSponsoredTool,
  useSponsoredTools,
  type SponsoredTool,
} from '@/data/repo/tools';
import { ChatStamp, shouldStamp, stampLabel, useChatAnchor } from '@/features/chat/ChatStamp';
import { Composer } from '@/features/community/Composer';
import { GroupHeader } from '@/features/community/GroupHeader';
import { MemberProfileSheet } from '@/features/community/MemberProfileSheet';
import { MessageMenu } from '@/features/community/MessageMenu';
import { ThreadBubble } from '@/features/community/ThreadBubble';
import { useAuth } from '@/features/auth/AuthProvider';
import { captureEvent } from '@/lib/analytics';
import { useTheme } from '@/theme/ThemeProvider';

export default function ToolDiscussionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const toast = useToast();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tools = useSponsoredTools();
  const tool = findSponsoredTool(tools, id);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [target, setTarget] = useState<CommunityThread | null>(null);
  const [profile, setProfile] = useState<CommunityMember | null>(null);
  const threads = useCommunityThreads(groupId);
  const { scrollRef, onContentSizeChange } = useChatAnchor(false);

  useEffect(() => {
    if (!tool) return;
    captureEvent('tool_engaged', {
      tool_id: tool.id,
      tool_name: tool.name,
      action: 'discussion',
    });
  }, [tool?.id, tool?.name]);

  useEffect(() => {
    if (!tool || !userId) return;
    let alive = true;
    void ensureToolDiscussion(tool.id, tool.name)
      .then((next) => {
        if (alive) setGroupId(next);
      })
      .catch((error) => toast(error instanceof Error ? error.message : 'Could not open the discussion'));
    return () => {
      alive = false;
    };
  }, [tool?.id, tool?.name, userId]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.sponsoredTools });
    if (groupId) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.communityGroup(groupId) });
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.communityGroup(groupId), 'threads'] });
    }
  };

  const list = threads.data ?? [];
  const discussing = tool?.talkerCount || tool?.threadCount || list.length;

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
          group={tool ? asGroup(tool) : null}
          title={tool?.name ?? 'Tool'}
          subtitle={
            discussing
              ? `${discussing} discussing`
              : 'Start a thread'
          }
          onBack={() => router.back()}
          extra={
            tool ? (
              <Pressable
                onPress={() => {
                  captureEvent('tool_engaged', {
                    tool_id: tool.id,
                    tool_name: tool.name,
                    action: 'website',
                  });
                  router.push({ pathname: '/browser', params: { kind: 'Web', value: tool.url } });
                }}
                accessibilityLabel={`Open ${tool.name}`}
              >
                <Glass radius={22} intensity={55} style={{ width: 44, height: 44 }}>
                  <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="open-outline" size={18} color={c.ink} />
                  </View>
                </Glass>
              </Pressable>
            ) : null
          }
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
        {list.map((thread, index) => (
          <React.Fragment key={thread.id}>
            {shouldStamp(list[index - 1]?.createdAt, thread.createdAt) ? (
              <ChatStamp label={stampLabel(thread.createdAt)} />
            ) : null}
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
            replies={thread.replyCount}
            replyAvatars={thread.replyAvatars}
            onPress={() =>
              router.push({
                pathname: '/tool/[id]/thread/[threadId]',
                params: { id: id ?? tool?.id ?? '', threadId: thread.id },
              })
            }
            onLongPress={() => setTarget(thread)}
            onReact={(emoji) => void react(thread, emoji)}
            onAuthorPress={() =>
              setProfile({
                userId: thread.authorId,
                name: thread.authorName,
                photo: thread.authorPhoto,
                role: 'member',
                status: 'active',
                apps: thread.authorListingId ? 1 : 0,
                commits: null,
                revenue: '—',
                appIds: thread.authorListingId ? [thread.authorListingId] : [],
              })
            }
          />
          </React.Fragment>
        ))}
        {!list.length ? (
          <View style={{ paddingTop: 70, alignItems: 'center', gap: 8 }}>
            <Txt font="mono" size={18} weight={500} center>
              Talk about {tool?.name ?? 'this tool'}
            </Txt>
            <Txt size={14.5} muted center style={{ maxWidth: 260 }}>
              Ask how people use it, what they pay, or what they switched from.
            </Txt>
          </View>
        ) : null}
      </ScrollView>

      <View style={{ paddingHorizontal: 14, paddingTop: 4 }}>
        <Composer
          bottomInset={insets.bottom}
          placeholder={`Start a thread about ${tool?.name ?? 'this tool'}…`}
          sendLabel="Post"
          disabled={!userId || !groupId}
          onSend={async (body, media) => {
            if (!userId || !groupId) return;
            await startThread(groupId, userId, body, media);
            refresh();
          }}
        />
      </View>

      <MessageMenu
        visible={!!target}
        onClose={() => setTarget(null)}
        onReply={() => {
          if (!target) return;
          router.push({
            pathname: '/tool/[id]/thread/[threadId]',
            params: { id: id ?? tool?.id ?? '', threadId: target.id },
          });
          setTarget(null);
        }}
        onReact={(emoji) => {
          if (target) void react(target, emoji);
          setTarget(null);
        }}
        onReport={async (reason) => {
          if (!target || !userId) return;
          await reportCommunityMessage({ threadId: target.id, userId, reason });
          setTarget(null);
          toast('Report sent. Thanks.');
        }}
      />
      <MemberProfileSheet member={profile} onClose={() => setProfile(null)} />
    </KeyboardAvoidingView>
  );

  async function react(thread: CommunityThread, emoji: string) {
    if (!userId) return;
    const mine = !!thread.reactions?.find((row) => row.emoji === emoji)?.mine;
    await toggleCommunityReaction({ threadId: thread.id, userId, emoji, mine });
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
