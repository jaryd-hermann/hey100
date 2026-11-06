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

import { AppIcon, Avatar } from '@/components/ui/AppIcon';
import { Sheet } from '@/components/ui/Sheet';
import { Txt } from '@/components/ui/Txt';
import { askListingCoach } from '@/data/repo/coach';
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
}: {
  visible: boolean;
  onClose: () => void;
  locked: boolean;
  user: UserProfile;
  app: OwnedApp;
}) {
  const { c, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scroll = useRef<ScrollView>(null);
  const drawerAnim = useRef(new Animated.Value(0)).current;
  const drawerW = Math.round(width * 0.78);

  const first = user.realName.split(' ')[0] || 'there';
  const greeting = useMemo(
    () =>
      `Hi ${first}, I can help you analyze your last listing, brainstorm new ideas, and research your audience. How would you like me to help?`,
    [first],
  );

  const [turns, setTurns] = useState<ChatTurn[]>([{ role: 'assistant', text: greeting }]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
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
  }, [visible, greeting, storageKey]);

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
    setDrawer(false);
  };

  const openThread = (thread: CoachThread) => {
    setThreadId(thread.id);
    setTurns(thread.turns);
    setDraft('');
    setDrawer(false);
  };

  const gate = () => {
    onClose();
    router.push('/paywall');
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
    try {
      const reply = await askListingCoach(
        app.id,
        history.map((turn) => ({ role: turn.role, content: turn.text })),
      );
      const done = [...history, { role: 'assistant' as const, text: reply }];
      setTurns(done);
      saveThread(id, done);
    } catch (error) {
      if (String(error).includes('pro_required')) {
        gate();
        return;
      }
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
      setBusy(false);
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  const chips = [
    {
      key: 'pitch',
      title: 'How to improve my pitch',
      body: 'Tighten the first 8 seconds so people stay.',
      media: (
        <ChipThumb>
          {app.pitchUri ? <PitchStill uri={app.pitchUri} size={48} /> : null}
          <Avatar
            name={user.realName}
            seed={user.username}
            uri={user.photo}
            size={app.pitchUri ? 20 : 48}
            style={
              app.pitchUri
                ? { position: 'absolute', left: 4, bottom: 4, borderWidth: 1.5, borderColor: '#fff' }
                : undefined
            }
          />
        </ChipThumb>
      ),
    },
    {
      key: 'listing',
      title: 'How to improve my listing',
      body: 'Make the page clearer, stronger, and easier to hey.',
      media: (
        <ChipThumb>
          <AppIcon hue={app.hue} name={app.name} uri={app.icon} size={48} />
        </ChipThumb>
      ),
    },
    {
      key: 'prompts',
      title: 'Review my prompt answers',
      body: 'Make them specific, useful, and easy to hey.',
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

  const empty = turns.length <= 1;

  return (
    <Sheet visible={visible} onClose={onClose} full scroll={false} flush>
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <Animated.View
          pointerEvents={drawerOpen ? 'none' : 'auto'}
          style={{
            flex: 1,
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
                  <Txt key={`${turn.role}-${index}`} size={16} lh={1.45}>
                    {turn.text}
                  </Txt>
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
          </ScrollView>

          {empty ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0 }}
              contentContainerStyle={{
                alignItems: 'center',
                gap: 10,
                paddingHorizontal: 16,
                paddingBottom: 12,
              }}
              keyboardShouldPersistTaps="handled"
            >
              {chips.map((chip) => (
                <Pressable
                  key={chip.key}
                  onPress={() => void send(`${chip.title}. ${chip.body}`)}
                  style={({ pressed }) => ({
                    width: 220,
                    height: 64,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    backgroundColor: c.raised,
                    borderRadius: 16,
                    paddingHorizontal: 8,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  {chip.media}
                  <View style={{ flex: 1, gap: 2, paddingRight: 8 }}>
                    <Txt size={14} weight={600} numberOfLines={1}>
                      {chip.title}
                    </Txt>
                    <Txt size={12} muted numberOfLines={1}>
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
            <Pressable
              onPress={locked ? gate : undefined}
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
                editable={!locked && !busy}
                onFocus={locked ? gate : undefined}
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
                onPress={() => (locked ? gate() : void send(draft))}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: draft.trim() && !locked ? c.ink : 'transparent',
                }}
              >
                <Ionicons
                  name="arrow-up"
                  size={18}
                  color={draft.trim() && !locked ? c.bg : c.muted}
                />
              </Pressable>
            </Pressable>
          </View>
        </Animated.View>

        {drawerOpen ? (
          <Pressable
            onPress={() => setDrawer(false)}
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: drawerW }}
          />
        ) : null}

        <Animated.View
          pointerEvents={drawerOpen ? 'auto' : 'none'}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: drawerW,
            backgroundColor: isDark ? '#1C1F1D' : '#E6E7E2',
            paddingTop: 18,
            paddingBottom: insets.bottom + 12,
            transform: [
              {
                translateX: drawerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-drawerW, 0],
                }),
              },
            ],
          }}
        >
          <Pressable
            onPress={startNew}
            style={({ pressed }) => ({
              paddingHorizontal: 22,
              paddingVertical: 14,
              opacity: pressed ? 0.65 : 1,
            })}
          >
            <Txt size={16}>New chat</Txt>
          </Pressable>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {threads.map((thread) => (
              <Pressable
                key={thread.id}
                onPress={() => openThread(thread)}
                style={({ pressed }) => ({
                  paddingHorizontal: 22,
                  paddingVertical: 14,
                  backgroundColor: thread.id === threadId ? (isDark ? '#262A27' : '#DDDFD9') : 'transparent',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Txt size={16} numberOfLines={1}>
                  {thread.title}
                </Txt>
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>
      </View>
    </Sheet>
  );
}

function Greeting({ first }: { first: string }) {
  return (
    <Txt size={19} lh={1.4}>
      Hi {first}, I can help you <Txt size={19} weight={700}>analyze</Txt> your last listing,{' '}
      <Txt size={19} weight={700}>brainstorm</Txt> new ideas, and{' '}
      <Txt size={19} weight={700}>research</Txt> your audience. How would you like me to help?
    </Txt>
  );
}

function ChipThumb({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        width: 48,
        height: 48,
        borderRadius: 12,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
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