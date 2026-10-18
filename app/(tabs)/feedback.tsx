import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { AppIcon, Avatar } from '@/components/ui/AppIcon';
import { Btn } from '@/components/ui/Btn';
import { Card } from '@/components/ui/Card';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { Label, Txt } from '@/components/ui/Txt';
import { shortName } from '@/data/mock';
import type { FeedbackEntry } from '@/data/types';
import { captureEvent } from '@/lib/analytics';
import { useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

export default function FeedbackInbox() {
  const router = useRouter();
  const { c } = useTheme();
  const store = useStore();

  const [appId, setAppId] = useState(store.primaryApp.id);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const app = store.apps[appId] ?? store.primaryApp;
  const data = store.inbox[appId];

  return (
    <Screen
      title="Feedback"
      headerRight={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Switch app"
          onPress={() => setSwitcherOpen(true)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <AppIcon hue={app.hue} name={app.name} uri={app.icon} size={28} />
          <Ionicons name="chevron-down" size={14} color={c.muted} />
        </Pressable>
      }
    >
      {!data ? (
        <View style={{ paddingTop: 60, gap: 10 }}>
          <Txt font="mono" size={17} weight={500}>
            No feedback yet
          </Txt>
          <Txt size={15} lh={1.5} muted>
            Once a match sends feedback on {shortName(app.name)}, it lands here.
          </Txt>
        </View>
      ) : (
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {(
              [
                ['Views', data.funnel.views, false],
                ['Skips', data.funnel.skips, false],
                ['Heys', data.funnel.heys, false],
                ['Hey ratio', data.funnel.ratio, true],
              ] as const
            ).map(([label, value, accent]) => (
              <Card key={label} padding={14} style={{ width: '47.5%', gap: 4 }}>
                <Txt font="mono" size={23} weight={500} color={accent ? c.accentText : c.ink}>
                  {value}
                </Txt>
                <Label size={10}>{label}</Label>
              </Card>
            ))}
          </View>
          <Txt size={11.5} muted style={{ marginTop: -6 }}>
            All time · only you can see these numbers
          </Txt>

          <Card padding={16} radius={radii.cardLg} style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row' }}>
              {(
                [
                  ['Responses', String(data.responses)],
                  ['Avg impression', data.impression],
                  ['Fair price', data.price],
                ] as const
              ).map(([label, value]) => (
                <View key={label} style={{ flex: 1, gap: 3 }}>
                  <Txt font="mono" size={18} weight={500}>
                    {value}
                  </Txt>
                  <Label size={10}>{label}</Label>
                </View>
              ))}
            </View>

            <View style={{ gap: 7 }}>
              <Label size={10}>Would keep using it</Label>
              <View
                style={{
                  flexDirection: 'row',
                  height: 10,
                  borderRadius: 5,
                  overflow: 'hidden',
                }}
              >
                <View style={{ flex: data.yes, backgroundColor: c.accent }} />
                <View style={{ flex: data.maybe, backgroundColor: c.mid }} />
                <View style={{ flex: data.no || 0.001, backgroundColor: c.raised }} />
              </View>
              <Txt size={12} muted>
                {data.yes}% yes · {data.maybe}% maybe · {data.no}% no
              </Txt>
            </View>
          </Card>

          {data.list.map((entry) => (
            <FeedbackCard key={entry.id} appId={appId} entry={entry} />
          ))}
        </View>
      )}

      <Sheet visible={switcherOpen} onClose={() => setSwitcherOpen(false)}>
        <View style={{ gap: 10 }}>
          <Txt font="mono" size={18} weight={500} style={{ marginBottom: 4 }}>
            Your apps
          </Txt>
          {store.ownedApps.map((owned) => (
            <Pressable
              key={owned.id}
              accessibilityRole="button"
              onPress={() => {
                setAppId(owned.id);
                setSwitcherOpen(false);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 13,
                borderRadius: radii.option,
                backgroundColor: owned.id === appId ? c.raised : c.surface,
                borderWidth: 1.5,
                borderColor: owned.id === appId ? c.ink : c.line,
              }}
            >
              <AppIcon hue={owned.hue} name={owned.name} uri={owned.icon} size={40} />
              <Txt size={15} weight={500} style={{ flex: 1 }} numberOfLines={1}>
                {shortName(owned.name)}
              </Txt>
              {owned.id === appId ? (
                <Ionicons name="checkmark" size={18} color={c.accentText} />
              ) : null}
            </Pressable>
          ))}
        </View>
      </Sheet>
    </Screen>
  );
}

function FeedbackCard({ appId, entry }: { appId: string; entry: FeedbackEntry }) {
  const router = useRouter();
  const { c } = useTheme();
  const toast = useToast();
  const store = useStore();

  const matchId =
    entry.matchId ??
    store.matches.find((match) => store.listing(match.appId)?.builder === entry.who)?.id;

  return (
    <Card padding={16} radius={radii.cardLg} style={{ gap: 13 }}>
      {/* The footer stays outside the press target: RN has no stopPropagation. */}
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          if (matchId) router.push({ pathname: '/chat/[id]', params: { id: matchId } });
        }}
        style={({ pressed }) => ({ gap: 13, opacity: pressed ? 0.9 : 1 })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
          <Avatar name={entry.who} size={38} />
          <View style={{ flex: 1 }}>
            <Txt size={14.5} weight={600}>
              {entry.who}
            </Txt>
            <Txt size={12.5} muted>
              {entry.app} · {entry.when}
            </Txt>
          </View>
          <Txt font="mono" size={14} weight={600} color={c.accentText}>
            {entry.stars}
          </Txt>
          <Ionicons name="chevron-forward" size={16} color={c.muted} />
        </View>

        <Txt size={16} lh={1.45}>
          &ldquo;{entry.text}&rdquo;
        </Txt>

        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Txt size={12.5} muted style={{ width: 86 }}>
              Confusion
            </Txt>
            <Txt size={13.5} style={{ flex: 1 }}>
              {entry.confusion}
            </Txt>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Txt size={12.5} muted style={{ width: 86 }}>
              Keep using
            </Txt>
            <Txt size={13.5} style={{ flex: 1 }}>
              {entry.keep}
            </Txt>
          </View>
        </View>
      </Pressable>

      <View
        style={{
          borderTopWidth: 1,
          borderColor: c.line,
          paddingTop: 13,
          gap: 10,
        }}
      >
        {entry.helpful ? (
          entry.optIn ? (
            <Btn
              label="Make testimonial card"
              variant="surface"
              size="sm"
              onPress={() =>
                router.push({
                  pathname: '/share',
                  params: { kind: 'testimonial', appId, feedbackId: entry.id },
                })
              }
              style={{ alignSelf: 'flex-start' }}
            />
          ) : (
            <Btn
              label={`Ask ${entry.who.split(' ')[0]} to share it`}
              variant="surface"
              size="sm"
              onPress={() => toast(`Asked ${entry.who.split(' ')[0]} in chat`)}
              style={{ alignSelf: 'flex-start' }}
            />
          )
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Txt size={13} muted style={{ flex: 1 }}>
              Was this helpful?
            </Txt>
            <Btn
              label="Helpful"
              variant="surface"
              size="sm"
              onPress={() => {
                void store.rateFeedback(appId, entry.id, 'yes');
                captureEvent('feedback_rated', { helpful: true });
              }}
            />
            <Btn
              label="Not really"
              variant="ghost"
              size="sm"
              onPress={() => {
                void store.rateFeedback(appId, entry.id, 'no');
                captureEvent('feedback_rated', { helpful: false });
              }}
            />
          </View>
        )}
      </View>
    </Card>
  );
}
