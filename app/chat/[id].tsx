import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, Avatar } from '@/components/ui/AppIcon';
import { Card } from '@/components/ui/Card';
import { Glass } from '@/components/ui/Glass';
import { useToast } from '@/components/ui/Toast';
import { Label, Txt } from '@/components/ui/Txt';
import { EMOJI_TRAY, shortName, slugify } from '@/data/mock';
import type { Message } from '@/data/types';
import { TradeCard } from '@/features/chat/TradeCard';
import { useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, layout, radii } from '@/theme/tokens';

export default function ChatThread() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const toast = useToast();
  const store = useStore();

  const { id } = useLocalSearchParams<{ id: string }>();
  const scrollRef = useRef<ScrollView>(null);

  const [draft, setDraft] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);

  const isTeam = id === 'team';
  const match = store.matches.find((item) => item.id === id);
  const listing = store.listing(id);
  const viaApp = match ? store.apps[match.viaAppId] : undefined;
  const messages = store.messages[id] ?? [];

  if (!listing) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 40, paddingHorizontal: layout.gutter }}>
        <Txt muted>This conversation has ended.</Txt>
      </View>
    );
  }

  const send = () => {
    if (!draft.trim()) return;
    store.sendMessage(id, draft);
    setDraft('');
    setEmojiOpen(false);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

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
              paddingBottom: 11,
              borderBottomWidth: 1,
              borderColor: c.line,
            }}
          >
            <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Back">
              <Ionicons name="chevron-back" size={26} color={c.ink} />
            </Pressable>

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
                <Avatar name={listing.builder} size={24} />
              </View>
            </View>

            <View style={{ flex: 1 }}>
              <Txt font="mono" size={15} weight={500} numberOfLines={1}>
                {shortName(listing.name)}
              </Txt>
              {/* Chat always shows the real name, since this is a match. */}
              <Txt size={12.5} muted numberOfLines={1}>
                {listing.builder}
              </Txt>
            </View>

            <Pressable
              hitSlop={10}
              accessibilityLabel="More"
              onPress={() => toast('Report, block and unmatch land here')}
            >
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
              const web = listing.links?.find(([kind]) => kind === 'Web');
              router.push({
                pathname: '/browser',
                params: { kind: 'Web', value: web?.[1] ?? `${slugify(listing.name)}.app` },
              });
            }}
            onSendFeedback={() =>
              router.push({ pathname: '/feedback-form', params: { matchId: match.id } })
            }
          />
        ) : null}

        <View style={{ gap: 12 }}>
          {messages.map((message, index) => (
            <Bubble key={index} message={message} />
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

      {emojiOpen ? (
        <View
          style={{
            flexDirection: 'row',
            gap: 6,
            paddingHorizontal: layout.gutter,
            paddingVertical: 8,
          }}
        >
          {EMOJI_TRAY.map((emoji) => (
            <Pressable key={emoji} onPress={() => setDraft((prev) => prev + emoji)} hitSlop={4}>
              <Txt size={23}>{emoji}</Txt>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: 9,
          paddingHorizontal: layout.gutter,
          paddingTop: 8,
          paddingBottom: insets.bottom + 8,
          borderTopWidth: 1,
          borderColor: c.line,
        }}
      >
        <Pressable
          onPress={() => setEmojiOpen((prev) => !prev)}
          hitSlop={8}
          accessibilityLabel="Emoji"
          style={{ height: 44, justifyContent: 'center' }}
        >
          <Ionicons name="happy-outline" size={23} color={emojiOpen ? c.accentText : c.muted} />
        </Pressable>

        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Message"
          placeholderTextColor={c.muted}
          multiline
          style={{
            flex: 1,
            maxHeight: 112,
            minHeight: 44,
            borderRadius: radii.input,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.line,
            paddingHorizontal: 14,
            paddingTop: 12,
            paddingBottom: 12,
            color: c.ink,
            fontFamily: fonts.body,
            fontSize: 15.5,
          }}
        />

        <Pressable
          onPress={send}
          accessibilityLabel="Send"
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: draft.trim() ? c.accent : c.raised,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="arrow-up" size={20} color={draft.trim() ? c.accentInk : c.muted} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Bubble({ message }: { message: Message }) {
  const { c } = useTheme();

  if (message.kind === 'system') {
    return (
      <Txt font="mono" size={11} muted center upper tracking={0.8} lh={1.5}>
        {message.body}
      </Txt>
    );
  }

  if (message.kind === 'announcement') {
    return (
      <Card tone="soft" padding={14} radius={radii.cardLg} style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Label size={10}>Announcement · all builders</Label>
          <Txt size={11} color={c.accentText}>
            {message.when}
          </Txt>
        </View>
        <Txt size={15} lh={1.5} color={c.accentText}>
          {message.body}
        </Txt>
      </Card>
    );
  }

  if (message.kind === 'feedback') {
    const mine = message.from === 'me';
    return (
      <View
        style={{
          borderRadius: radii.cardLg,
          borderWidth: 1.5,
          borderColor: c.accent,
          backgroundColor: c.surface,
          padding: 15,
          gap: 9,
          maxWidth: '92%',
          alignSelf: mine ? 'flex-end' : 'flex-start',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Label size={10} style={{ flex: 1 }}>
            {mine ? 'Feedback you sent' : 'Feedback received'}
          </Label>
          <Txt font="mono" size={13} weight={600} color={c.accentText}>
            {message.stars}
          </Txt>
        </View>
        <Txt size={15} lh={1.45}>
          {message.body}
        </Txt>
        <Txt size={12} muted>
          {message.meta}
        </Txt>
      </View>
    );
  }

  const mine = message.kind === 'me';

  return (
    <View
      style={{
        maxWidth: '82%',
        alignSelf: mine ? 'flex-end' : 'flex-start',
        backgroundColor: mine ? c.ink : c.surface,
        borderWidth: mine ? 0 : 1,
        borderColor: c.line,
        borderRadius: 18,
        borderBottomRightRadius: mine ? 6 : 18,
        borderBottomLeftRadius: mine ? 18 : 6,
        paddingHorizontal: 14,
        paddingVertical: 11,
      }}
    >
      <Txt size={15.5} lh={1.4} color={mine ? c.bg : c.ink}>
        {message.body}
      </Txt>
    </View>
  );
}
