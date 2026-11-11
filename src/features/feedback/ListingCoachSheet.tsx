import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/ui/AppIcon';
import { Btn } from '@/components/ui/Btn';
import { Sheet } from '@/components/ui/Sheet';
import { Txt } from '@/components/ui/Txt';
import { useCommunityHome } from '@/data/repo/community';
import { streamListingCoach } from '@/data/repo/coach';
import { IntegrationFlow } from '@/features/apps/connect/IntegrationFlow';
import type { FlowId } from '@/features/apps/connect/flows';
import { useStore } from '@/store/AppStore';
import { CoachMarkdown } from '@/features/feedback/CoachMarkdown';
import type { OwnedApp } from '@/data/types';
import type { UserProfile } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radii } from '@/theme/tokens';

type ChatTurn = { role: 'assistant' | 'user'; text: string };
type CoachThread = { id: string; title: string; turns: ChatTurn[]; updatedAt: number };

export function ListingCoachSheet({
  visible,
  onClose,
  locked,
  user,
  app,
  feedbackCount = 0,
  listingScore = { done: 0, total: 8 },
  onRecordPitch,
}: {
  visible: boolean;
  onClose: () => void;
  locked: boolean;
  user: UserProfile;
  app: OwnedApp;
  feedbackCount?: number;
  listingScore?: { done: number; total: number };
  onRecordPitch?: () => void;
}) {
  const { c, isDark } = useTheme();
  const store = useStore();
  const groups = useCommunityHome();
  const router = useRouter();
  const [connect, setConnect] = useState<FlowId | null>(null);
  const connections = store.connections[app.id] ?? {};
  const missing = (['stripe', 'revenuecat', 'github', 'posthog'] as const).filter((key) => !connections[key]);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scroll = useRef<ScrollView>(null);
  const drawerAnim = useRef(new Animated.Value(0)).current;
  const drawerW = Math.round(width * 0.72);
  const drawerBg = isDark ? '#141614' : '#D8DAD4';

  const first = user.realName.split(' ')[0] || 'there';
  const audience = targetAudience(app);
  const greeting = useMemo(
    () =>
      `Hi ${first}, I can help you analyze your product page, brainstorm growth ideas, share feedback on your content, and research your audience. How would you like me to help?`,
    [first],
  );

  const [turns, setTurns] = useState<ChatTurn[]>([{ role: 'assistant', text: greeting }]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threads, setThreads] = useState<CoachThread[]>([]);
  const [keyboard, setKeyboard] = useState(0);

  const storageKey = `hey100.coach.${user.username || 'me'}`;
  const fresh = [{ role: 'assistant' as const, text: greeting }];
  const shot = app.media.find((item) => item.uri && !item.video)?.uri;

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => setKeyboard(event.endCoordinates.height),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboard(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    setTurns(fresh);
    setDraft('');
    setThreadId(null);
    setThinking(false);
    setStreamText('');
    setDrawerOpen(false);
    drawerAnim.setValue(0);
    setKeyboard(0);
    void AsyncStorage.getItem(storageKey).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as CoachThread[];
        if (Array.isArray(parsed)) setThreads(parsed);
      } catch {
        // Ignore a corrupt cache and start empty.
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, storageKey]);

  const saveThread = (id: string, nextTurns: ChatTurn[]) => {
    const title =
      nextTurns.find((turn) => turn.role === 'user')?.text.replace(/\s+/g, ' ').slice(0, 42) ||
      'New chat';
    const row: CoachThread = { id, title, turns: nextTurns, updatedAt: Date.now() };
    setThreads((prev) => {
      const next = [row, ...prev.filter((thread) => thread.id !== id)].slice(0, 40);
      void AsyncStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  const setDrawer = (open: boolean) => {
    if (open) Keyboard.dismiss();
    setDrawerOpen(open);
    Animated.timing(drawerAnim, {
      toValue: open ? 1 : 0,
      duration: open ? 240 : 200,
      easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const startNew = () => {
    setThreadId(null);
    setTurns(fresh);
    setDraft('');
    setThinking(false);
    setStreamText('');
    setDrawer(false);
  };

  const openThread = (thread: CoachThread) => {
    setThreadId(thread.id);
    setTurns(thread.turns);
    setDraft('');
    setThinking(false);
    setStreamText('');
    setDrawer(false);
  };

  const gate = () => {
    onClose();
    router.push('/paywall');
  };

  const coachFacts = () => {
    const inbox = store.inbox[app.id];
    const funnel = inbox?.funnel;
    const room = [...(groups.data?.mine ?? []), ...(groups.data?.discover ?? [])]
      .slice(0, 12)
      .map((group) => `${group.name} (${group.memberCount} members): ${group.bio || group.audience || 'no bio'}`)
      .join('; ');
    return [
      `Connected integrations: ${
        (['stripe', 'revenuecat', 'github', 'posthog'] as const).filter((key) => connections[key]).join(', ') || 'none'
      }.`,
      `Missing integrations: ${missing.join(', ') || 'none'}.`,
      'Stripe verifies web revenue with a read-only restricted key (rk_). RevenueCat verifies mobile subscriptions and customers with a secret key (sk_). GitHub verifies commits after sign-in and a repo pick. PostHog verifies unique people who sent any event, after the builder signs in and picks a project.',
      'When integrations are missing and the question is about verifying, end with one line per missing provider using exactly [[connect:stripe]], [[connect:revenuecat]], [[connect:github]], or [[connect:posthog]].',
      `Basic analytics: ${funnel?.views ?? 0} views, ${funnel?.skips ?? 0} skips, ${funnel?.heys ?? 0} heys, hey ratio ${funnel?.ratio ?? '—'}. Responses ${inbox?.responses ?? 0}. Impression ${inbox?.impression ?? '—'}. Fair price ${inbox?.price ?? '—'}. Would keep ${inbox?.yes ?? 0}% yes, ${inbox?.maybe ?? 0}% maybe, ${inbox?.no ?? 0}% no.`,
      'Advanced analytics are computed from people who opened the listing, overlapped with their profile interests, devices, and job, plus hey, pass, scroll, and pitch rows. A dash means that count is empty. Do not invent those numbers.',
      `Groups: open groups join instantly, request groups need approval, criteria groups join when the builder matches, private match groups are only for people who matched the listing. Visible groups: ${room || 'none yet'}. Suggest a fit from this list only.`,
    ].join('\n');
  };

  const send = async (text: string) => {
    const next = text.trim();
    if (!next || busy) return;
    if (locked) {
      gate();
      return;
    }
    setDraft('');
    const history = [...turns, { role: 'user' as const, text: next }];
    const id = threadId ?? String(Date.now());
    if (!threadId) setThreadId(id);
    setTurns(history);
    saveThread(id, history);
    setBusy(true);
    setThinking(true);
    setStreamText('');
    try {
      const replyRaw = await streamListingCoach(
        app.id,
        history
          .filter((turn, index) => !(index === 0 && turn.role === 'assistant'))
          .map((turn, index, all) => ({
            role: turn.role,
            content:
              (index === all.length - 1 && turn.role === 'user'
                ? `${turn.text}\n\n${coachFacts()}`
                : turn.text
              )
                .replace(/\[\[\s*action\s*:\s*record_pitch\s*\]\]/gi, '')
                .trim(),
          }))
          .filter((turn) => turn.content),
        (full) => {
          setThinking(false);
          setStreamText(full);
          requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: false }));
        },
      );
      const reply =
        /verify my app/i.test(next) && missing.length && !/\[\[\s*connect\s*:/i.test(replyRaw)
          ? `${replyRaw}\n\n${missing.map((id) => `[[connect:${id}]]`).join('\n')}`
          : replyRaw;
      const done = [...history, { role: 'assistant' as const, text: reply }];
      setTurns(done);
      setStreamText('');
      saveThread(id, done);
    } catch (error) {
      if (String(error).includes('pro_required')) {
        gate();
        return;
      }
      setStreamText('');
      const fail = [
        ...history,
        {
          role: 'assistant' as const,
          text: 'I could not reach the coach just now. Try again in a moment.',
        },
      ];
      setTurns(fail);
      saveThread(id, fail);
    } finally {
      setThinking(false);
      setBusy(false);
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  const chips = [
    app.pitchUri
      ? {
          key: 'pitch',
          title: 'How to improve my pitch',
          body: 'Tighten the first 8 seconds so people stay.',
          prompt: 'How to improve my pitch. Tighten the first 8 seconds so people stay.',
          media: (
            <ChipThumb>
              <PitchStill uri={app.pitchUri} size={48} />
            </ChipThumb>
          ),
        }
      : {
          key: 'make-pitch',
          title: 'Help me make a video pitch',
          body: 'Script a 30-second hello from your listing.',
          prompt:
            'Help me make a video pitch. Review my listing, ask me questions to close any gaps, then suggest a 30-second script and why it works.',
          media: (
            <ChipThumb>
              <Ionicons name="videocam-outline" size={22} color={c.ink} />
            </ChipThumb>
          ),
        },
    feedbackCount > 0
      ? {
          key: 'feedback',
          title: 'Help me action feedback',
          body: feedbackCount === 1 ? 'Turn your latest note into a change.' : 'Turn tester notes into the next ship.',
          prompt: 'Help me action feedback',
          media: <CountBox n={feedbackCount} />,
        }
      : {
          key: 'ask-feedback',
          title: 'How to ask for feedback',
          body: 'How to get useful notes from testers.',
          prompt:
            'How to ask for feedback. How do I get good, useful feedback from testers and people who try my product?',
          media: (
            <ChipThumb>
              <Ionicons name="chatbubbles-outline" size={22} color={c.ink} />
            </ChipThumb>
          ),
        },
    ...(missing.length
      ? [
          {
            key: 'verify',
            title: 'How to verify my app',
            body: 'Stripe, RevenueCat, and GitHub, and what is still missing.',
            prompt: 'How to verify my app',
            media: (
              <ChipThumb>
                <Ionicons name="checkmark-circle-outline" size={22} color={c.ink} />
              </ChipThumb>
            ),
          },
        ]
      : []),
    {
      key: 'groups',
      title: 'Which groups fit me',
      body: 'How groups work, and which ones match this app.',
      prompt: 'How do groups work, which groups exist, and which might be a fit for me?',
      media: (
        <ChipThumb>
          <Ionicons name="people-outline" size={22} color={c.ink} />
        </ChipThumb>
      ),
    },
    {
      key: 'audience',
      title: `Brainstorm ways to reach ${audience}`,
      body: 'Channels, hooks, and a first experiment.',
      prompt: `Brainstorm ways to reach ${audience}`,
      media: (
        <ChipThumb>
          <Ionicons name="people-outline" size={22} color={c.ink} />
        </ChipThumb>
      ),
    },
    {
      key: 'listing',
      title: 'How to improve my listing',
      body: 'Make my product clearer to get more heys',
      prompt: 'How to improve my listing. Make my product clearer to get more heys.',
      media: (
        <View style={{ alignItems: 'center', gap: 4, width: 48, flexShrink: 0 }}>
          <ChipThumb>
            <AppIcon hue={app.hue} name={app.name} uri={app.icon} size={48} />
          </ChipThumb>
          <Txt font="mono" size={11} weight={700}>
            {listingScore.done}/{listingScore.total}
          </Txt>
        </View>
      ),
    },
    {
      key: 'prompts',
      title: 'Review my prompt answers',
      body: 'Make them specific, useful, and easy to hey.',
      prompt: 'Review my prompt answers. Make them specific, useful, and easy to hey.',
      media: (
        <ChipThumb>
          {shot ? (
            <Image source={{ uri: shot }} style={{ width: 48, height: 48 }} />
          ) : (
            <AppIcon hue={app.hue} name={app.name} uri={app.icon} size={48} />
          )}
        </ChipThumb>
      ),
    },
  ];

  const empty = turns.length <= 1 && !thinking && !streamText;

  return (
    <>
    <Sheet visible={visible} onClose={onClose} full scroll={false} flush>
      <View style={{ flex: 1, overflow: 'hidden', backgroundColor: drawerBg }}>
        <View
          pointerEvents={drawerOpen ? 'auto' : 'none'}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: drawerW,
            paddingTop: 10,
            paddingBottom: insets.bottom + 12,
          }}
        >
          <Pressable
            onPress={startNew}
            accessibilityRole="button"
            accessibilityLabel="New chat"
            style={({ pressed }) => ({
              marginHorizontal: 16,
              marginBottom: 10,
              height: 44,
              borderRadius: 22,
              borderWidth: 1.5,
              borderColor: c.ink,
              backgroundColor: isDark ? '#1C1F1D' : '#F2F3EF',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Txt size={15} weight={600}>
              New chat
            </Txt>
          </Pressable>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {threads.map((thread) => (
              <Pressable
                key={thread.id}
                onPress={() => openThread(thread)}
                style={({ pressed }) => ({
                  paddingHorizontal: 22,
                  paddingVertical: 13,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Txt size={16} numberOfLines={1} color={thread.id === threadId ? c.ink : undefined}>
                  {thread.title}
                </Txt>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <Animated.View
          pointerEvents={drawerOpen ? 'none' : 'auto'}
          style={{
            flex: 1,
            backgroundColor: c.surface,
            overflow: 'hidden',
            borderTopLeftRadius: drawerOpen ? 32 : 0,
            borderBottomLeftRadius: drawerOpen ? 32 : 0,
            shadowColor: '#000',
            shadowOpacity: drawerOpen ? 0.35 : 0,
            shadowRadius: 16,
            shadowOffset: { width: -6, height: 0 },
            elevation: drawerOpen ? 12 : 0,
            transform: [
              {
                translateX: drawerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, drawerW],
                }),
              },
            ],
          }}
        >
          <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 4 }}>
            <Pressable
              onPress={() => setDrawer(true)}
              accessibilityRole="button"
              accessibilityLabel="Chat history"
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: c.raised,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Ionicons name="menu" size={20} color={c.ink} />
            </Pressable>
          </View>

          <ScrollView
            ref={scroll}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16, gap: 14 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {turns.map((turn, index) =>
              turn.role === 'assistant' ? (
                index === 0 ? (
                  <Greeting key="greeting" first={first} />
                ) : (
                  <AssistantReply
                    key={`${turn.role}-${index}`}
                    text={turn.text}
                    onRecordPitch={onRecordPitch}
                    onConnect={setConnect}
                  />
                )
              ) : (
                <View key={`${turn.role}-${index}`} style={{ alignItems: 'flex-end' }}>
                  <View
                    style={{
                      maxWidth: '86%',
                      backgroundColor: c.raised,
                      borderRadius: 18,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                    }}
                  >
                    <Txt size={15} lh={1.4}>
                      {turn.text}
                    </Txt>
                  </View>
                </View>
              ),
            )}
            {thinking ? <ThinkingMark /> : null}
            {streamText ? (
              <AssistantReply text={streamText} streaming onRecordPitch={onRecordPitch} onConnect={setConnect} />
            ) : null}
          </ScrollView>

          {empty ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0 }}
              contentContainerStyle={{
                alignItems: 'flex-start',
                gap: 10,
                paddingHorizontal: 16,
                paddingBottom: 12,
              }}
              keyboardShouldPersistTaps="handled"
            >
              {chips.map((chip) => (
                <Pressable
                  key={chip.key}
                  onPress={() => void send(chip.prompt)}
                  style={({ pressed }) => ({
                    width: 236,
                    minHeight: 78,
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 10,
                    backgroundColor: c.raised,
                    borderRadius: 16,
                    borderWidth: 1.5,
                    borderColor: c.ink,
                    paddingHorizontal: 8,
                    paddingVertical: 10,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  {chip.media}
                  <View style={{ flex: 1, gap: 3, paddingRight: 6, paddingTop: 1 }}>
                    <Txt size={14} weight={600} lh={1.25}>
                      {chip.title}
                    </Txt>
                    <Txt size={12} muted lh={1.3}>
                      {chip.body}
                    </Txt>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          <View
            style={{
              paddingHorizontal: 16,
              paddingBottom: keyboard > 0 ? 10 : Math.max(insets.bottom, 12),
              paddingTop: 4,
            }}
          >
            {locked ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ask me anything"
                onPress={gate}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  borderRadius: radii.pill,
                  backgroundColor: c.raised,
                  paddingLeft: 18,
                  paddingRight: 6,
                  minHeight: 52,
                }}
              >
                <Txt size={16} color={c.muted} style={{ flex: 1, paddingVertical: 14 }}>
                  Ask me anything...
                </Txt>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="arrow-up" size={18} color={c.muted} />
                </View>
              </Pressable>
            ) : (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  borderRadius: radii.pill,
                  backgroundColor: c.raised,
                  paddingLeft: 18,
                  paddingRight: 6,
                  minHeight: 52,
                }}
              >
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Ask me anything..."
                  placeholderTextColor={c.muted}
                  editable={!busy}
                  onSubmitEditing={() => void send(draft)}
                  style={{
                    flex: 1,
                    color: c.ink,
                    fontFamily: fonts.body,
                    fontSize: 16,
                    paddingVertical: 14,
                  }}
                />
                <Pressable
                  onPress={() => void send(draft)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: draft.trim() ? c.ink : 'transparent',
                  }}
                >
                  <Ionicons name="arrow-up" size={18} color={draft.trim() ? c.bg : c.muted} />
                </Pressable>
              </View>
            )}
          </View>
        </Animated.View>

        {drawerOpen ? (
          <Pressable
            onPress={() => setDrawer(false)}
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: drawerW }}
          />
        ) : null}
      </View>
    </Sheet>
    <IntegrationFlow
      visible={!!connect}
      provider={connect}
      appId={app.id}
      appName={app.name}
      appIcon={app.icon}
      appHue={app.hue}
      onClose={() => setConnect(null)}
    />
    </>
  );
}

function Greeting({ first }: { first: string }) {
  return (
    <Txt size={19} lh={1.4}>
      Hi <Txt size={19} weight={700}>{first}</Txt>, I can help you analyze your product page, brainstorm growth ideas, share feedback on your content, and research your audience. How would you like me to help?
    </Txt>
  );
}

function ThinkingMark() {
  const { c } = useTheme();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 380);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 }}>
      <View style={{ flexDirection: 'row', gap: 5 }}>
        {[0, 1, 2].map((dot) => (
          <View
            key={dot}
            style={{
              width: 7,
              height: 7,
              borderRadius: 4,
              backgroundColor: c.ink,
              opacity: tick % 3 === dot ? 1 : 0.22,
            }}
          />
        ))}
      </View>
      <Txt size={15} muted>
        Thinking
      </Txt>
    </View>
  );
}

function targetAudience(app: OwnedApp): string {
  const interest = stripLeadingEmoji(app.ideal.interests.split(',')[0]?.trim() ?? '');
  const named = interest && interest !== 'Anyone' ? interest : stripLeadingEmoji(app.problemFor?.trim() ?? '');
  return pluralAudience(named || 'your audience');
}

function stripLeadingEmoji(value: string): string {
  return value.replace(/^[^\p{L}\p{N}]+/u, '').trim();
}

function pluralAudience(value: string): string {
  if (/^(your audience|anyone|people)$/i.test(value)) return value;
  if (/\s/.test(value) || /(s|people|ies)$/i.test(value)) return value;
  if (/[^aeiou]y$/i.test(value)) return `${value.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/i.test(value)) return `${value}es`;
  return `${value}s`;
}

const CONNECT_CARD: Record<FlowId, { title: string; body: string }> = {
  stripe: { title: 'Connect Stripe', body: 'Verify web revenue with a read-only key.' },
  revenuecat: { title: 'Connect RevenueCat', body: 'Verify subscriptions and customers.' },
  github: { title: 'Connect GitHub', body: 'Verify commits from a repo.' },
  posthog: { title: 'Connect PostHog', body: 'Verify active users with a read-only sign-in.' },
};

function AssistantReply({
  text,
  streaming,
  onRecordPitch,
  onConnect,
}: {
  text: string;
  streaming?: boolean;
  onRecordPitch?: () => void;
  onConnect?: (id: FlowId) => void;
}) {
  const { c } = useTheme();
  const recordPitch = /\[\[\s*action\s*:\s*record_pitch\s*\]\]/i.test(text);
  const connects: FlowId[] = [];
  const body = text
    .replace(/\[\[\s*action\s*:\s*record_pitch\s*\]\]/gi, '')
    .replace(/\[\[\s*connect\s*:\s*(stripe|revenuecat|github|posthog)\s*\]\]/gi, (_match, id: string) => {
      const key = id as FlowId;
      if (!connects.includes(key)) connects.push(key);
      return '';
    })
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return (
    <View style={{ gap: 12 }}>
      {body ? <CoachMarkdown text={body} /> : null}
      {connects.map((id) => (
        <Pressable
          key={id}
          accessibilityRole="button"
          onPress={() => onConnect?.(id)}
          style={{
            borderWidth: 1.5,
            borderColor: c.ink,
            borderRadius: 18,
            backgroundColor: c.raised,
            padding: 14,
            gap: 4,
          }}
        >
          <Txt size={15} weight={700}>
            {CONNECT_CARD[id].title}
          </Txt>
          <Txt size={12.5} muted>
            {CONNECT_CARD[id].body}
          </Txt>
        </Pressable>
      ))}
      {recordPitch && onRecordPitch && !streaming ? (
        <View
          style={{
            borderWidth: 1.5,
            borderColor: c.ink,
            borderRadius: 18,
            backgroundColor: c.raised,
            padding: 14,
            gap: 10,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: c.bg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="videocam" size={20} color={c.ink} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt size={15} weight={700}>
                Record quick pitch
              </Txt>
              <Txt size={12} muted>
                Front camera, 30 seconds, retake anytime.
              </Txt>
            </View>
          </View>
          <Btn label="Record quick pitch" variant="accent" size="sm" onPress={onRecordPitch} />
        </View>
      ) : null}
    </View>
  );
}

function CountBox({ n }: { n: number }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        width: 48,
        height: 48,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: c.ink,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: c.bg,
        flexShrink: 0,
      }}
    >
      <Txt font="mono" weight={700} size={n > 99 ? 14 : 18}>
        {n}
      </Txt>
    </View>
  );
}

function ChipThumb({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        width: 48,
        height: 48,
        borderRadius: 12,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        backgroundColor: c.bg,
      }}
    >
      {children}
    </View>
  );
}

function PitchStill({ uri, size }: { uri: string; size: number }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.muted = true;
    instance.loop = false;
    instance.pause();
  });

  useEffect(() => {
    try {
      player.currentTime = 0.15;
      player.pause();
    } catch {
      // Player may already be released.
    }
  }, [player]);

  return (
    <VideoView
      player={player}
      nativeControls={false}
      contentFit="cover"
      pointerEvents="none"
      style={{ width: size, height: size }}
    />
  );
}