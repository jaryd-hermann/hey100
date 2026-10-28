import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, Avatar } from '@/components/ui/AppIcon';
import { Lightbox } from '@/components/ui/Lightbox';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { Txt } from '@/components/ui/Txt';
import { shortName } from '@/data/mock';
import type { AppListing, MediaItem, Message } from '@/data/types';
import {
  dmsToMessages,
  fetchBuilderPreview,
  fetchDmsForWithReactions,
  sendAdminDm,
} from '@/data/repo/admin';
import { BuilderSheet } from '@/features/app-page/BuilderSheet';
import { ChatMenu } from '@/features/chat/ChatMenu';
import { Composer } from '@/features/chat/Composer';
import { MessageActions } from '@/features/chat/MessageActions';
import { MessageBubble } from '@/features/chat/MessageBubble';
import { useMediaPicker } from '@/features/chat/useMediaPicker';
import { toggleReaction } from '@/features/chat/reactions';
import { uploadAttachments } from '@/features/chat/uploadAttachments';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { layout } from '@/theme/tokens';

const ATTACHMENT_LIMIT = 4;

const LISTING_FALLBACK = {
  cat: '',
  plat: '',
  stage: '',
  role: 'Builder',
  style: '',
  likes: '—',
  reply: '—',
  trades: 0,
  media: [],
  shotLayout: 'vertical' as const,
  prompts: [],
  badges: [],
  links: [],
  ideal: { age: '', gender: '', interests: '', plat: '', wants: '' },
};

export default function AdminDm() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { userId: adminId } = useAuth();
  const pickMedia = useMediaPicker();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const scrollRef = useRef<ScrollView>(null);

  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState<MediaItem[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [appsOpen, setAppsOpen] = useState(false);
  const afterMenu = useRef<null | 'builder' | 'apps'>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [actionFor, setActionFor] = useState<Message | null>(null);
  const [viewer, setViewer] = useState<{ items: MediaItem[]; index: number } | null>(null);

  const { data: rows = [] } = useQuery({
    queryKey: ['admin-dm', userId],
    enabled: !!userId,
    queryFn: () => fetchDmsForWithReactions(userId),
  });
  const { data: person } = useQuery({
    queryKey: ['admin-builder', userId],
    enabled: !!userId,
    queryFn: () => fetchBuilderPreview(userId),
  });

  const messages = dmsToMessages(rows, adminId, true);
  const listing: AppListing | null = person
    ? {
        ...LISTING_FALLBACK,
        id: person.apps[0]?.id ?? person.userId,
        name: person.apps[0]?.name ?? person.name,
        sub: person.apps[0]?.sub ?? person.job ?? '',
        hue: person.apps[0]?.hue ?? 128,
        builder: person.name,
        builderPhoto: person.photo,
        role: person.job ?? '',
        style: person.bio ?? '',
        ...(person.apps[0]?.icon ? { icon: person.apps[0].icon } : {}),
      }
    : null;

  const send = () => {
    const body = draft.trim();
    if ((!body && !attachments.length) || !userId || !adminId) return;
    const pending = attachments;
    const replyId = replyTo?.id;
    setDraft('');
    setAttachments([]);
    setReplyTo(null);
    void uploadAttachments(adminId, pending)
      .then((media) => sendAdminDm(userId, body, true, media, replyId))
      .then(() =>
        Promise.all([
          queryClient.invalidateQueries({ queryKey: ['admin-dm', userId] }),
          queryClient.invalidateQueries({ queryKey: ['admin-threads'] }),
        ]),
      )
      .catch(() => toast("That didn't send"));
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

  const react = async (message: Message, emoji: string) => {
    if (!message.id || !adminId) return;
    try {
      await toggleReaction({ dmId: message.id }, emoji, adminId);
      await queryClient.invalidateQueries({ queryKey: ['admin-dm', userId] });
    } catch {
      toast("Couldn't react");
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ paddingTop: insets.top }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: layout.gutter,
            paddingBottom: 10,
          }}
        >
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color={c.ink} />
          </Pressable>
          <Avatar name={person?.name ?? 'Builder'} uri={person?.photo} size={36} />
          <Txt font="mono" size={17} weight={500} style={{ flex: 1 }} numberOfLines={1}>
            {person?.name ?? 'Builder'}
          </Txt>
          <Pressable hitSlop={10} accessibilityLabel="More" onPress={() => setMenuOpen(true)}>
            <Ionicons name="ellipsis-horizontal" size={21} color={c.muted} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingBottom: 20, gap: 12 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id ?? index}
            message={message}
            hue={listing?.hue ?? 128}
            avatar={<Avatar name={person?.name ?? 'Builder'} uri={person?.photo} size={26} />}
            onOpenMedia={(items, at) => setViewer({ items, index: at })}
            onLongPress={() => setActionFor(message)}
            onToggleReaction={(emoji) => void react(message, emoji)}
          />
        ))}
      </ScrollView>

      <Composer
        value={draft}
        onChangeText={setDraft}
        attachments={attachments}
        onAttach={() => void attach()}
        onRemoveAttachment={(index) => setAttachments((prev) => prev.filter((_, at) => at !== index))}
        onSend={send}
        hue={listing?.hue ?? 128}
        bottomInset={insets.bottom}
        placeholder="Reply…"
        replyTo={replyTo?.body || (replyTo ? 'Attachment' : null)}
        onCancelReply={() => setReplyTo(null)}
      />

      <ChatMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onClosed={() => {
          const next = afterMenu.current;
          afterMenu.current = null;
          if (next === 'builder') setBuilderOpen(true);
          if (next === 'apps') setAppsOpen(true);
        }}
        appName="apps"
        builder={person?.name ?? 'Builder'}
        isTeam={false}
        onViewApp={() => {
          afterMenu.current = 'apps';
          setMenuOpen(false);
        }}
        onViewProfile={() => {
          afterMenu.current = 'builder';
          setMenuOpen(false);
        }}
        onOpenLink={() => setMenuOpen(false)}
        onDelete={() => setMenuOpen(false)}
        onReport={() => setMenuOpen(false)}
      />

      <BuilderSheet
        visible={builderOpen}
        listing={listing}
        onClose={() => setBuilderOpen(false)}
        onOpenLink={() => setBuilderOpen(false)}
      />

      <Sheet visible={appsOpen} onClose={() => setAppsOpen(false)}>
        <View style={{ gap: 10 }}>
          <Txt font="mono" size={18} weight={500}>
            Their apps
          </Txt>
          {(person?.apps ?? []).map((app) => (
            <Pressable
              key={app.id}
              onPress={() => {
                setAppsOpen(false);
                if (app.slug) router.push({ pathname: '/web/[slug]', params: { slug: app.slug } });
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}
            >
              <AppIcon hue={app.hue} name={app.name} uri={app.icon} size={40} />
              <View style={{ flex: 1 }}>
                <Txt size={15} weight={600} numberOfLines={1}>
                  {shortName(app.name)}
                </Txt>
                <Txt size={13} muted numberOfLines={1}>
                  {app.sub || 'On Hey100'}
                </Txt>
              </View>
            </Pressable>
          ))}
          {!person?.apps.length ? (
            <Txt size={14} muted>
              No published apps yet.
            </Txt>
          ) : null}
        </View>
      </Sheet>

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
