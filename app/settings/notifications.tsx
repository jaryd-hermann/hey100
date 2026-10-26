import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { Label, Txt } from '@/components/ui/Txt';
import { useMyProfile } from '@/data/repo/profile';
import {
  DEFAULT_PREFS,
  prefsFrom,
  saveNotificationPrefs,
  type NotificationEvent,
  type NotificationPrefs,
} from '@/data/repo/notifications';
import { useAuth } from '@/features/auth/AuthProvider';
import { useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radii } from '@/theme/tokens';

const TRANSACTIONAL: { key: NotificationEvent; title: string; body: string }[] = [
  { key: 'hey', title: 'New hey', body: 'Someone said hey to your app, a prompt or a screenshot.' },
  { key: 'match', title: 'New match', body: 'You both said hey, so a chat just opened.' },
  { key: 'message', title: 'New message', body: 'A match sent a reply.' },
  { key: 'your_turn', title: 'Your turn to reply', body: 'A match is waiting on you, or is about to expire.' },
  { key: 'feedback', title: 'Feedback received', body: 'A builder sent feedback on your app.' },
  { key: 'group_reply', title: 'Replies in groups', body: 'Someone replied to a thread you started.' },
  { key: 'group_reaction', title: 'Reactions', body: 'Someone reacted to one of your posts.' },
  { key: 'group_request', title: 'Join requests', body: 'Someone asked to join a group you own.' },
  { key: 'group_accepted', title: "You're in", body: 'A group accepted your request.' },
];

const ENGAGEMENT: { key: NotificationEvent; title: string; body: string }[] = [
  { key: 'digest', title: 'Weekly digest', body: 'New apps and groups this week, when there are enough of them.' },
  { key: 'new_group', title: 'Relevant new groups', body: 'A new group matches what you are into, once it has a few members.' },
  { key: 'milestones', title: 'Milestones', body: 'First match, first trade and similar moments.' },
  { key: 'listing_nudge', title: 'Listing tips', body: 'A nudge to add a pitch, screenshots or a verification.' },
];

export default function Notifications() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const toast = useToast();
  const store = useStore();
  const { userId } = useAuth();
  const { data: profile } = useMyProfile();

  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    if (profile?.notification_prefs) setPrefs(prefsFrom(profile.notification_prefs));
  }, [profile?.notification_prefs]);

  const persist = (next: NotificationPrefs) => {
    setPrefs(next);
    if (!userId) return;
    void saveNotificationPrefs(userId, next).catch(() => toast('Could not save that. Try again.'));
  };

  const toggle = (key: keyof NotificationPrefs) => {
    if (key === 'quiet_start' || key === 'quiet_end') return;
    persist({ ...prefs, [key]: !prefs[key] });
  };

  const engagementOn = useMemo(
    () => ENGAGEMENT.some((row) => prefs[row.key]),
    [prefs],
  );

  const setEngagement = (on: boolean) => {
    persist({
      ...prefs,
      digest: on,
      new_group: on,
      milestones: on,
      listing_nudge: on,
    });
  };

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
          Matches, messages and group activity. Engagement stays on so you hear about new groups
          and listing tips — turn any of it off here.
        </Txt>

        <Card padding={4} radius={radii.cardLg}>
          {TRANSACTIONAL.map((type, index) => (
            <ToggleRow
              key={type.key}
              title={type.title}
              body={type.body}
              value={prefs[type.key]}
              onToggle={() => toggle(type.key)}
              first={index === 0}
            />
          ))}
        </Card>

        <View style={{ gap: 11 }}>
          <Label>Engagement</Label>
          <Card padding={4} radius={radii.cardLg}>
            <ToggleRow
              title="Engagement messages"
              body="Digests, new groups, milestones and listing tips. On by default."
              value={engagementOn}
              onToggle={() => setEngagement(!engagementOn)}
              first
            />
            {ENGAGEMENT.map((type) => (
              <ToggleRow
                key={type.key}
                title={type.title}
                body={type.body}
                value={prefs[type.key]}
                onToggle={() => toggle(type.key)}
              />
            ))}
          </Card>
        </View>

        <View style={{ gap: 11 }}>
          <Label>Quiet hours</Label>

          <Card padding={4} radius={radii.cardLg}>
            <ToggleRow
              title="Pause overnight"
              body="Engagement waits until morning. Chats and heys send at 8:00 AM."
              value={prefs.quiet_hours}
              onToggle={() => toggle('quiet_hours')}
              first
            />

            <Pressable
              accessibilityRole="button"
              onPress={() => toast('Custom windows land next')}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 14,
                paddingVertical: 16,
                borderTopWidth: 1,
                borderColor: c.line,
                opacity: (pressed ? 0.7 : 1) * (prefs.quiet_hours ? 1 : 0.45),
              })}
            >
              <Txt size={15} weight={500} style={{ flex: 1 }}>
                Window
              </Txt>
              <Txt font="mono" size={13} muted>
                {prefs.quiet_start} – {prefs.quiet_end}
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
