import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, Avatar } from '@/components/ui/AppIcon';
import { Glass } from '@/components/ui/Glass';
import { Lightbox } from '@/components/ui/Lightbox';
import { useToast } from '@/components/ui/Toast';
import { Txt } from '@/components/ui/Txt';
import { shortName, slugify } from '@/data/mock';
import type { AppListing, MediaItem, Message } from '@/data/types';
import { BuilderSheet } from '@/features/app-page/BuilderSheet';
import { ChatMenu } from '@/features/chat/ChatMenu';
import { ChatStamp, shouldStamp, stampLabel, UnreadDivider, useChatAnchor } from '@/features/chat/ChatStamp';
import { Composer } from '@/features/chat/Composer';
import { sendAdminDm } from '@/data/repo/admin';
import { useAuth } from '@/features/auth/AuthProvider';
import { avatarName, TEAM_ID } from '@/features/chat/chatMeta';
import { useDevLoop } from '@/features/dev/useDevLoop';
import { MessageActions } from '@/features/chat/MessageActions';
import { MessageBubble } from '@/features/chat/MessageBubble';
import { toggleReaction } from '@/features/chat/reactions';
import { uploadAttachments } from '@/features/chat/uploadAttachments';
import { JarydMark } from '@/features/chat/TeamMark';
import { OfficialMark } from '@/features/community/OfficialMark';
import { CommunityPromoCard } from '@/features/marketing/CommunityPromoCard';
import { TradeAppSheet } from '@/features/chat/TradeAppSheet';
import { TradeCard } from '@/features/chat/TradeCard';
import { useMediaPicker } from '@/features/chat/useMediaPicker';
import { useThreadMessages } from '@/features/loop/useThreadMessages';
import { captureEvent } from '@/lib/analytics';
import { useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { layout } from '@/theme/tokens';

/** A bubble carries at most four attachments. */
const ATTACHMENT_LIMIT = 4;

/** Matched apps are stored as stubs, so a sheet built for a full listing needs these. */
const LISTING_FALLBACK = {
  cat: '',
  plat: '',
  stage: '',
  role: 'Builder',
  style: 'Matched with you on Hey100.',
  likes: '—',
  reply: '—',
  trades: 0,
  media: [],
  shotLayout: 'vertical',
  prompts: [],
  badges: [],
  links: [],
  ideal: { age: '', gender: '', interests: '', plat: '', wants: '' },
} satisfies Omit<AppListing, 'id' | 'name' | 'sub' | 'hue' | 'builder'>;

export default function ChatThread() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const toast = useToast();
  const store = useStore();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const pickMedia = useMediaPicker();

  const { id } = useLocalSearchParams<{ id: string; desk?: string }>();
  const loop = useDevLoop();

  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState<MediaItem[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [appOpen, setAppOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [viewer, setViewer] = useState<{
    items: MediaItem[];
    index: number;
  } | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [actionFor, setActionFor] = useState<Message | null>(null);

  const isTeam = id === TEAM_ID;
  const match = store.matches.find((item) => item.id === id) ?? loop.matches.find((item) => item.id === id);
  // A thread is keyed by the match, so the listing is the one it is about.
  const listing = store.listing(match?.appId ?? id);
  const viaApp = match ? store.apps[match.viaAppId] : undefined;

  useThreadMessages(isTeam || !match ? null : id);
  const stored = useMemo(() => loop.messages(id), [id, loop]);

  const unreadAtOpen = useRef(
    store.matches.find((item) => item.id === id)?.unread ??
      loop.matches.find((item) => item.id === id)?.unread ??
      0,
  ).current;

  const { markChatRead } = store;
  useEffect(() => {
    markChatRead(id);
  }, [id, markChatRead]);

  const messages = stored;
  const firstJaryd = messages.findIndex((item) => item.kind === 'them');
  const unreadStart =
    unreadAtOpen > 0 && messages.length ? Math.max(0, messages.length - unreadAtOpen) : -1;
  const { scrollRef, onUnreadLayout, onContentSizeChange } = useChatAnchor(unreadStart >= 0);

  if (!isTeam && !listing) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.bg,
          paddingTop: insets.top + 40,
          paddingHorizontal: layout.gutter,
        }}
      >
        <Txt muted>This conversation has ended.</Txt>
      </View>
    );
  }

  const builder = avatarName(listing?.builder ?? 'Jaryd');
  // Whatever gets the tester into the app fastest: the store page, the build,
  // then the site.
  const tradeLink = ['App Store', 'TestFlight', 'Web']
    .map((kind) => listing?.links?.find(([label]) => label === kind))
    .find(Boolean);
  const link: [string, string] = isTeam
    ? ['Web', 'hey100.com']
    : (tradeLink ?? ['Web', `${slugify(listing?.name ?? 'app')}.app`]);

  const send = () => {
    const body = draft.trim();
    if (!body && !attachments.length) return;
    const replyId = replyTo?.id;
    const pending = attachments;

    if (isTeam && userId) {
      store.setMessages(id, [
        ...(store.messages[id] ?? []),
        {
          kind: 'me',
          body: body || undefined,
          media: pending.length ? pending : undefined,
          at: new Date().toISOString(),
          reply: replyTo?.body || replyTo?.id ? { id: replyTo.id ?? '', body: replyTo.body || 'Attachment' } : undefined,
        },
      ]);
      void uploadAttachments(userId, pending)
        .then((media) => sendAdminDm(userId, body, false, media, replyId))
        .then(() => queryClient.invalidateQueries({ queryKey: ['team-chat', userId] }))
        .catch(() => toast("That didn't send"));
    } else {
      void store
        .sendMessage(id, body, pending, replyId)
        .then(() =>
          captureEvent('message_sent', {
            has_media: pending.length > 0,
            is_reply: !!replyId,
          }),
        )
        .catch(() => toast("That didn't send"));
    }
    setAttachments([]);
    setDraft('');
    setReplyTo(null);
  };

  const react = async (message: Message, emoji: string) => {
    if (!message.id || !userId) return;
    try {
      await toggleReaction(
        isTeam ? { dmId: message.id } : { messageId: message.id },
        emoji,
        userId,
      );
      await queryClient.invalidateQueries({
        queryKey: isTeam ? ['team-chat', userId] : ['messages', id],
      });
    } catch {
      toast("Couldn't react");
    }
  };

  const attach = async () => {
    try {
      const { items, denied } = await pickMedia();
      if (denied) {
        toast('Photo access is off in Settings');
        return;
      }
      if (!items.length) return;
      setAttachments((prev) => [...prev, ...items].slice(0, ATTACHMENT_LIMIT));
    } catch {
      toast("Couldn't open your photo library");
    }
  };

  const openBrowser = (kind: string, value: string) =>
    router.push({ pathname: '/browser', params: { kind, value } });

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
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Pressable onPress={() => router.back()} accessibilityLabel="Back">
          <Glass radius={22} intensity={55} style={{ width: 44, height: 44 }}>
            <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="chevron-back" size={22} color={c.ink} />
            </View>
          </Glass>
        </Pressable>

        <Pressable onPress={() => (isTeam ? setMenuOpen(true) : setBuilderOpen(true))} style={{ flex: 1, minWidth: 0 }}>
          <Glass radius={26} intensity={55} style={{ height: 52, flex: 1 }}>
            <View
              style={{
                height: 52,
                paddingLeft: 5,
                paddingRight: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 9,
              }}
            >
              {isTeam || !listing ? (
                <JarydMark size={42} />
              ) : (
                <View style={{ width: 42, height: 42 }}>
                  <AppIcon hue={listing.hue} name={listing.name} uri={listing.icon} size={42} />
                  {listing.builderPhoto || listing.builder ? (
                    <View
                      style={{
                        position: 'absolute',
                        right: -3,
                        bottom: -3,
                        borderWidth: 2,
                        borderColor: c.bg,
                        borderRadius: 10,
                      }}
                    >
                      <Avatar name={listing.builder} uri={listing.builderPhoto} size={18} />
                    </View>
                  ) : null}
                </View>
              )}
              <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Txt size={15} weight={600} numberOfLines={1} style={{ flexShrink: 1 }}>
                    {isTeam || !listing ? 'Jaryd from Hey100' : shortName(listing.name)}
                  </Txt>
                  {isTeam ? <OfficialMark size={15} /> : null}
                </View>
                <Txt size={12.5} muted numberOfLines={1}>
                  {isTeam || !listing ? 'Founder of hey100' : listing.builder}
                </Txt>
              </View>
            </View>
          </Glass>
        </Pressable>

        <Pressable onPress={() => setMenuOpen(true)} accessibilityLabel="More">
          <Glass radius={22} intensity={55} style={{ width: 44, height: 44 }}>
            <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="ellipsis-horizontal" size={18} color={c.ink} />
            </View>
          </Glass>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingTop: insets.top + 80,
          paddingBottom: 20,
        }}
        onContentSizeChange={onContentSizeChange}
      >
        {match && listing && !isTeam ? (
          <TradeCard
            match={match}
            theirAppName={listing.name}
            myAppName={viaApp?.name ?? store.primaryApp.name}
            code={listing.code ?? ''}
            onCopyCode={() => toast('Code copied')}
            onOpenLink={() => {
              void store.setTradeStatus(match.id, 'mine', 'Using');
              openBrowser(link[0], link[1]);
            }}
            onSendFeedback={() =>
              router.push({
                pathname: '/feedback-form',
                params: { matchId: match.id },
              })
            }
          />
        ) : null}

        <View style={{ gap: 12 }}>
          {messages.map((message, index) => (
            <React.Fragment key={message.id ?? index}>
              {shouldStamp(messages[index - 1]?.at, message.at) && message.at ? (
                <ChatStamp label={stampLabel(message.at)} />
              ) : null}
              {index === unreadStart ? <UnreadDivider onReady={onUnreadLayout} /> : null}
              <MessageBubble
                message={message}
                hue={listing?.hue ?? 128}
                unread={unreadStart >= 0 && index >= unreadStart}
                avatar={
                  isTeam ? (
                    <JarydMark size={26} />
                  ) : (
                    <Avatar name={builder} uri={listing?.builderPhoto} size={26} />
                  )
                }
                onOpenMedia={(items, at) => setViewer({ items, index: at })}
                onLongPress={() => setActionFor(message)}
                onToggleReaction={(emoji) => void react(message, emoji)}
              />
              {isTeam && index === firstJaryd ? (
                <CommunityPromoCard
                  from="team_chat"
                  onPress={() =>
                    router.replace({ pathname: '/(tabs)/chat', params: { desk: 'community' } })
                  }
                />
              ) : null}
            </React.Fragment>
          ))}
        </View>

        {match?.turn && !isTeam ? (
          <View style={{ alignItems: 'center', marginTop: 18 }}>
            <Txt font="mono" size={11.5} muted upper tracking={0.9}>
              your turn
            </Txt>
          </View>
        ) : null}
      </ScrollView>

      <Composer
        value={draft}
        onChangeText={setDraft}
        attachments={attachments}
        onAttach={attach}
        onRemoveAttachment={(index) =>
          setAttachments((prev) => prev.filter((_, at) => at !== index))
        }
        onSend={send}
        hue={listing?.hue ?? 128}
        bottomInset={insets.bottom}
        placeholder={isTeam ? 'Message Jaryd' : 'Message'}
        replyTo={replyTo?.body || (replyTo ? 'Attachment' : null)}
        onCancelReply={() => setReplyTo(null)}
      />

      <MessageActions
        visible={!!actionFor}
        onClose={() => setActionFor(null)}
        onReply={() => {
          setReplyTo(actionFor);
          setActionFor(null);
        }}
        onReact={(emoji) => {
          if (actionFor) void react(actionFor, emoji);
          setActionFor(null);
        }}
      />

      <ChatMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        appName={isTeam || !listing ? 'Jaryd' : shortName(listing.name)}
        builder={isTeam || !listing ? 'Jaryd' : listing.builder}
        isTeam={isTeam}
        link={link}
        onViewApp={() => {
          setMenuOpen(false);
          setTimeout(() => setAppOpen(true), 240);
        }}
        onViewProfile={() => {
          setMenuOpen(false);
          setTimeout(() => setBuilderOpen(true), 240);
        }}
        onOpenLink={() => {
          setMenuOpen(false);
          openBrowser(link[0], link[1]);
        }}
        onDelete={() => {
          setMenuOpen(false);
          void store.deleteChat(id);
          toast('Chat deleted');
          router.back();
        }}
        onReport={() => {
          setMenuOpen(false);
          toast('Report sent to the Hey100 team');
        }}
      />

      {listing ? (
        <TradeAppSheet
          visible={appOpen}
          listing={{ ...LISTING_FALLBACK, ...listing }}
          onClose={() => setAppOpen(false)}
          onOpenLink={(kind, value) => {
            setAppOpen(false);
            openBrowser(kind, value);
          }}
          onOpenProfile={() => {
            setAppOpen(false);
            setTimeout(() => setBuilderOpen(true), 240);
          }}
          onOpenFullListing={
            listing.media?.length
              ? () => {
                  setAppOpen(false);
                  router.push({
                    pathname: '/web/[slug]',
                    params: { slug: listing.slug ?? slugify(listing.name) },
                  });
                }
              : undefined
          }
        />
      ) : null}

      {listing ? (
        <BuilderSheet
          visible={builderOpen}
          listing={{ ...LISTING_FALLBACK, ...listing }}
          onClose={() => setBuilderOpen(false)}
          onOpenLink={(kind, value) => {
            setBuilderOpen(false);
            openBrowser(kind, value);
          }}
        />
      ) : null}

      <Lightbox
        visible={!!viewer}
        items={viewer?.items ?? []}
        index={viewer?.index ?? 0}
        hue={listing?.hue ?? 128}
        layout="vertical"
        onClose={() => setViewer(null)}
      />
    </KeyboardAvoidingView>
  );
}

