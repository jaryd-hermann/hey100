import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Composer } from '@/features/chat/Composer';
import {
  fetchBroadcastsWithReactions,
  broadcastsToMessages,
  sendAdminDm,
  sendBroadcast,
} from '@/data/repo/admin';
import { useAuth } from '@/features/auth/AuthProvider';
import { avatarName, TEAM_ID } from '@/features/chat/chatMeta';
import { MessageActions } from '@/features/chat/MessageActions';
import { MessageBubble } from '@/features/chat/MessageBubble';
import { toggleReaction } from '@/features/chat/reactions';
import { uploadAttachments } from '@/features/chat/uploadAttachments';
import { TeamMark } from '@/features/chat/TeamMark';
import { TradeAppSheet } from '@/features/chat/TradeAppSheet';
import { TradeCard } from '@/features/chat/TradeCard';
import { useMediaPicker } from '@/features/chat/useMediaPicker';
import { useThreadMessages } from '@/features/loop/useThreadMessages';
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
  const { userId, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const pickMedia = useMediaPicker();

  const { id, desk } = useLocalSearchParams<{ id: string; desk?: string }>();
  const scrollRef = useRef<ScrollView>(null);

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
  const isBroadcast = isTeam && desk === 'admin' && isAdmin;
  const match = store.matches.find((item) => item.id === id);
  // A thread is keyed by the match, so the listing is the one it is about.
  const listing = store.listing(match?.appId ?? id);
  const viaApp = match ? store.apps[match.viaAppId] : undefined;

  useThreadMessages(isTeam || !match ? null : id);
  const stored = useMemo(() => store.messages[id] ?? [], [id, store.messages]);
  const { data: broadcasts = [] } = useQuery({
    queryKey: ['broadcasts'],
    enabled: isBroadcast,
    queryFn: fetchBroadcastsWithReactions,
  });

  // Where the unread run started when the thread was opened, before it was read.
  const [unreadStart] = useState(() => {
    const unread = store.matches.find((item) => item.id === id)?.unread ?? 0;
    const count = (store.messages[id] ?? []).length;
    return unread > 0 ? Math.max(0, count - unread) : -1;
  });

  const { markChatRead } = store;
  useEffect(() => {
    markChatRead(id);
  }, [id, markChatRead]);

  const messages = isBroadcast ? broadcastsToMessages(broadcasts, userId, true) : stored;

  if (!listing) {
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

  const builder = avatarName(listing.builder);
  // Whatever gets the tester into the app fastest: the store page, the build,
  // then the site.
  const tradeLink = ['App Store', 'TestFlight', 'Web']
    .map((kind) => listing.links?.find(([label]) => label === kind))
    .find(Boolean);
  const link: [string, string] = isTeam
    ? ['Web', 'hey100.com']
    : (tradeLink ?? ['Web', `${slugify(listing.name)}.app`]);

  const send = () => {
    const body = draft.trim();
    if (!body && !attachments.length) return;
    const replyId = replyTo?.id;
    const pending = attachments;

    if (isBroadcast && userId) {
      void uploadAttachments(userId, pending)
        .then((media) => sendBroadcast(body, media, replyId))
        .then(() =>
          Promise.all([
            queryClient.invalidateQueries({ queryKey: ['broadcasts'] }),
            queryClient.invalidateQueries({ queryKey: ['team-chat'] }),
          ]),
        )
        .catch(() => toast("That didn't send"));
    } else if (isTeam && userId) {
      store.setMessages(id, [
        ...(store.messages[id] ?? []),
        {
          kind: 'me',
          body: body || undefined,
          media: pending.length ? pending : undefined,
          reply: replyTo?.body || replyTo?.id ? { id: replyTo.id ?? '', body: replyTo.body || 'Attachment' } : undefined,
        },
      ]);
      void uploadAttachments(userId, pending)
        .then((media) => sendAdminDm(userId, body, false, media, replyId))
        .then(() => queryClient.invalidateQueries({ queryKey: ['team-chat', userId] }))
        .catch(() => toast("That didn't send"));
    } else {
      void store.sendMessage(id, body, pending, replyId).catch(() => toast("That didn't send"));
    }
    setAttachments([]);
    setDraft('');
    setReplyTo(null);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  const react = async (message: Message, emoji: string) => {
    if (!message.id || !userId) return;
    try {
      await toggleReaction(
        isBroadcast || message.kind === 'announcement'
          ? { broadcastId: message.id }
          : isTeam
            ? { dmId: message.id }
            : { messageId: message.id },
        emoji,
        userId,
      );
      await queryClient.invalidateQueries({
        queryKey: isBroadcast ? ['broadcasts'] : isTeam ? ['team-chat', userId] : ['messages', id],
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
      style={{ flex: 1, backgroundColor: c.bg }}
    >
      <View style={{ paddingTop: insets.top }}>
        <Glass radius={0} bordered={false} intensity={50}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 11,
              paddingHorizontal: layout.gutter,
              // Clear of the status bar, like every other pushed screen.
              paddingTop: 10,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderColor: c.line,
            }}
          >
            <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Back">
              <Ionicons name="chevron-back" size={26} color={c.ink} />
            </Pressable>

            {isTeam ? (
              <TeamMark size={38} badge={24} ring={c.bg} />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AppIcon hue={listing.hue} name={listing.name} uri={listing.icon} size={36} />
                <Avatar name={builder} uri={listing.builderPhoto} size={36} />
              </View>
            )}

            <View style={{ flex: 1 }}>
              <Txt font="mono" size={15} weight={500} numberOfLines={1}>
                {isTeam ? listing.name : shortName(listing.name)}
              </Txt>
              {/* Chat always shows the real name, since this is a match. */}
              <Txt size={12.5} muted numberOfLines={1}>
                {isBroadcast ? 'Broadcast to everyone' : listing.builder}
              </Txt>
            </View>

            <Pressable hitSlop={10} accessibilityLabel="More" onPress={() => setMenuOpen(true)}>
              <Ionicons name="ellipsis-horizontal" size={21} color={c.muted} />
            </Pressable>
          </View>
        </Glass>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingTop: 16,
          paddingBottom: 20,
        }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {match && !isTeam ? (
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
            <React.Fragment key={index}>
              {index === unreadStart ? <UnreadDivider /> : null}
              <MessageBubble
                message={message}
                hue={listing.hue}
                unread={unreadStart >= 0 && index >= unreadStart}
                avatar={
                  <Avatar
                    name={isTeam ? 'Jaryd' : builder}
                    uri={isTeam ? undefined : listing.builderPhoto}
                    size={26}
                  />
                }
                onOpenMedia={(items, at) => setViewer({ items, index: at })}
                onLongPress={() => setActionFor(message)}
                onToggleReaction={(emoji) => void react(message, emoji)}
              />
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
        hue={listing.hue}
        bottomInset={insets.bottom}
        placeholder={isBroadcast ? 'Message every builder…' : 'Message'}
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
        appName={isTeam ? listing.name : shortName(listing.name)}
        builder={listing.builder}
        isTeam={isTeam}
        link={link}
        onViewApp={() => {
          setMenuOpen(false);
          setAppOpen(true);
        }}
        onViewProfile={() => {
          setMenuOpen(false);
          setBuilderOpen(true);
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
          setBuilderOpen(true);
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

      <BuilderSheet
        visible={builderOpen}
        listing={{ ...LISTING_FALLBACK, ...listing }}
        onClose={() => setBuilderOpen(false)}
        onOpenLink={(kind, value) => {
          setBuilderOpen(false);
          openBrowser(kind, value);
        }}
      />

      <Lightbox
        visible={!!viewer}
        items={viewer?.items ?? []}
        index={viewer?.index ?? 0}
        hue={listing.hue}
        layout="vertical"
        onClose={() => setViewer(null)}
      />
    </KeyboardAvoidingView>
  );
}

/** Marks where the messages the user has not seen start. */
function UnreadDivider() {
  const { c } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 4,
      }}
    >
      <View style={{ flex: 1, height: 1, backgroundColor: c.accent, opacity: 0.6 }} />
      <Txt font="mono" size={10.5} weight={500} upper tracking={0.9} color={c.accentText}>
        new
      </Txt>
      <View style={{ flex: 1, height: 1, backgroundColor: c.accent, opacity: 0.6 }} />
    </View>
  );
}
