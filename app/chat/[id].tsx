import { Ionicons } from '@expo/vector-icons';
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
import type { AppListing, MediaItem } from '@/data/types';
import { BuilderSheet } from '@/features/app-page/BuilderSheet';
import { ChatMenu } from '@/features/chat/ChatMenu';
import { Composer } from '@/features/chat/Composer';
import { avatarName, TEAM_ID } from '@/features/chat/chatMeta';
import { MessageBubble } from '@/features/chat/MessageBubble';
import { TeamMark } from '@/features/chat/TeamMark';
import { TradeAppSheet } from '@/features/chat/TradeAppSheet';
import { TradeCard } from '@/features/chat/TradeCard';
import { useMediaPicker } from '@/features/chat/useMediaPicker';
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
  const pickMedia = useMediaPicker();

  const { id } = useLocalSearchParams<{ id: string }>();
  const scrollRef = useRef<ScrollView>(null);

  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState<MediaItem[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [appOpen, setAppOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [viewer, setViewer] = useState<{ items: MediaItem[]; index: number } | null>(null);

  const isTeam = id === TEAM_ID;
  const match = store.matches.find((item) => item.id === id);
  const listing = store.listing(id);
  const viaApp = match ? store.apps[match.viaAppId] : undefined;
  const stored = useMemo(() => store.messages[id] ?? [], [id, store.messages]);

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

  const messages = stored;

  if (!listing) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 40, paddingHorizontal: layout.gutter }}>
        <Txt muted>This conversation has ended.</Txt>
      </View>
    );
  }

  const builder = avatarName(listing.builder);
  const webLink = listing.links?.find(([kind]) => kind === 'Web');
  const link: [string, string] = isTeam
    ? ['Web', 'hey100.com']
    : (webLink ?? ['Web', `${slugify(listing.name)}.app`]);

  const send = () => {
    const body = draft.trim();
    if (!body && !attachments.length) return;

    store.sendMessage(id, body, attachments);
    setAttachments([]);

    setDraft('');
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
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
              <View style={{ width: 46, height: 38 }}>
                <AppIcon hue={listing.hue} name={listing.name} size={38} />
                <View
                  style={{
                    position: 'absolute',
                    left: 20,
                    bottom: -4,
                    borderRadius: 13,
                    borderWidth: 2,
                    borderColor: c.bg,
                  }}
                >
                  <Avatar name={builder} size={24} />
                </View>
              </View>
            )}

            <View style={{ flex: 1 }}>
              <Txt font="mono" size={15} weight={500} numberOfLines={1}>
                {isTeam ? listing.name : shortName(listing.name)}
              </Txt>
              {/* Chat always shows the real name, since this is a match. */}
              <Txt size={12.5} muted numberOfLines={1}>
                {listing.builder}
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
        contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingTop: 16, paddingBottom: 20 }}
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
              store.setTradeStatus(match.id, 'mine', 'Using');
              openBrowser(link[0], link[1]);
            }}
            onSendFeedback={() =>
              router.push({ pathname: '/feedback-form', params: { matchId: match.id } })
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
                avatar={<Avatar name={isTeam ? 'Jaryd' : builder} size={26} />}
                onOpenMedia={(items, at) => setViewer({ items, index: at })}
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
          store.deleteChat(id);
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
                router.push({ pathname: '/web/[slug]', params: { slug: slugify(listing.name) } });
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
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: c.accent, opacity: 0.6 }} />
      <Txt font="mono" size={10.5} weight={500} upper tracking={0.9} color={c.accentText}>
        new
      </Txt>
      <View style={{ flex: 1, height: 1, backgroundColor: c.accent, opacity: 0.6 }} />
    </View>
  );
}
