import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { Label, Txt } from '@/components/ui/Txt';
import { useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radii } from '@/theme/tokens';

type NotificationKey = 'hey' | 'match' | 'turn' | 'feedback' | 'milestone';

const TYPES: { key: NotificationKey; title: string; body: string }[] = [
  { key: 'hey', title: 'New hey', body: 'Someone said hey to your app, a prompt or a screenshot.' },
  { key: 'match', title: 'New match', body: 'You both said hey, so a chat just opened.' },
  { key: 'turn', title: 'Your turn to reply', body: 'A match is waiting on you, or is about to expire.' },
  { key: 'feedback', title: 'Feedback received', body: 'A builder sent feedback on your app.' },
  { key: 'milestone', title: 'Milestone reached', body: 'First match, first trade and your monthly launch report.' },
];

/**
 * Screen-local until the push backend lands: these preferences aren't on the
 * user record yet, so they reset when the screen unmounts.
 */
const DEFAULTS: Record<NotificationKey, boolean> = {
  hey: true,
  match: true,
  turn: true,
  feedback: true,
  milestone: false,
};

export default function Notifications() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const toast = useToast();
  const store = useStore();

  const [enabled, setEnabled] = useState<Record<NotificationKey, boolean>>(DEFAULTS);
  const [quietHours, setQuietHours] = useState(true);

  const toggle = (key: NotificationKey) =>
    setEnabled((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: layout.gutter,
          paddingBottom: 10,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Back to Settings">
          <Ionicons name="chevron-back" size={26} color={c.ink} />
        </Pressable>
        <Txt font="mono" size={17} weight={500} style={{ flex: 1 }}>
          Notifications
        </Txt>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingBottom: 60, gap: 16 }}
      >
        <Txt size={13.5} lh={1.45} muted>
          Hey100 only sends these five. Turn off anything you&apos;d rather catch up on in the app.
        </Txt>

        <Card padding={4} radius={radii.cardLg}>
          {TYPES.map((type, index) => (
            <ToggleRow
              key={type.key}
              title={type.title}
              body={type.body}
              value={enabled[type.key]}
              onToggle={() => toggle(type.key)}
              first={index === 0}
            />
          ))}
        </Card>

        <View style={{ gap: 11 }}>
          <Label>Quiet hours</Label>

          <Card padding={4} radius={radii.cardLg}>
            <ToggleRow
              title="Pause overnight"
              body="Nothing buzzes while quiet hours are on. It all waits for the morning."
              value={quietHours}
              onToggle={() => setQuietHours((prev) => !prev)}
              first
            />

            <Pressable
              accessibilityRole="button"
              onPress={() => toast('Quiet hours windows land with push')}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 14,
                paddingVertical: 16,
                borderTopWidth: 1,
                borderColor: c.line,
                opacity: (pressed ? 0.7 : 1) * (quietHours ? 1 : 0.45),
              })}
            >
              <Txt size={15} weight={500} style={{ flex: 1 }}>
                Window
              </Txt>
              <Txt font="mono" size={13} muted>
                10:00 PM – 8:00 AM
              </Txt>
              <Ionicons name="chevron-forward" size={16} color={c.muted} />
            </Pressable>
          </Card>
        </View>

        <View style={{ gap: 11 }}>
          <Label>In-app prompts</Label>

          <Card padding={4} radius={radii.cardLg}>
            <ToggleRow
              title="Ask why I passed"
              body="A quick reason when you pass on an app. It tunes Discover and stays private."
              value={!store.passFeedbackDismissed}
              onToggle={() => store.setPassFeedback(store.passFeedbackDismissed)}
              first
            />
          </Card>
        </View>

        <Txt size={12.5} lh={1.45} muted>
          Your phone&apos;s system settings still have the final say on whether Hey100 can notify
          you at all.
        </Txt>
      </ScrollView>
    </View>
  );
}

function ToggleRow({
  title,
  body,
  value,
  onToggle,
  first,
}: {
  title: string;
  body: string;
  value: boolean;
  onToggle: () => void;
  first?: boolean;
}) {
  const { c } = useTheme();

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={title}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onToggle();
      }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderTopWidth: first ? 0 : 1,
        borderColor: c.line,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ flex: 1 }}>
        <Txt size={15} weight={500}>
          {title}
        </Txt>
        <Txt size={12.5} lh={1.4} muted style={{ marginTop: 2 }}>
          {body}
        </Txt>
      </View>

      <View
        style={{
          width: 48,
          height: 28,
          borderRadius: radii.pill,
          padding: 3,
          backgroundColor: value ? c.accent : c.raised,
          borderWidth: 1.5,
          borderColor: value ? c.ink : c.line,
          alignItems: value ? 'flex-end' : 'flex-start',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 19,
            height: 19,
            borderRadius: radii.pill,
            backgroundColor: value ? c.accentInk : c.muted,
          }}
        />
      </View>
    </Pressable>
  );
}
