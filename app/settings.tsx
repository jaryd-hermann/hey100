import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { Label, Txt } from '@/components/ui/Txt';
import { INTEGRATIONS } from '@/data/mock';
import { queryKeys } from '@/data/repo/keys';
import { demoFeedback, demoHeyMe, demoReply, type DemoResult } from '@/data/repo/loop';
import { useAuth } from '@/features/auth/AuthProvider';
import { useStore } from '@/store/AppStore';
import { useTheme, type ThemePref } from '@/theme/ThemeProvider';
import { palettes } from '@/theme/tokens';
import { layout, radii } from '@/theme/tokens';

const THEMES: { id: ThemePref; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

const ROWS = [
  { label: 'Subscription', href: '/settings/subscription' },
  { label: 'Notifications', href: '/settings/notifications' },
  { label: 'Connected accounts', href: '/settings/connected' },
  { label: 'Account', href: '/settings/account' },
] as const;

export default function Settings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c, pref, setPref } = useTheme();
  const store = useStore();

  const connected = Object.values(store.connections[store.primaryApp.id] ?? {}).filter(
    Boolean,
  ).length;

  const details: Record<string, string | undefined> = {
    Subscription: store.isPro ? 'Pro' : 'Free',
    'Connected accounts': `${connected} of ${INTEGRATIONS.length} connected`,
    Account: `@${store.user.username}`,
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
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={26} color={c.ink} />
        </Pressable>
        <Txt font="mono" size={17} weight={500} style={{ flex: 1 }}>
          Settings
        </Txt>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingBottom: 60,
          gap: 22,
        }}
      >
        <View style={{ gap: 11 }}>
          <Label>Appearance</Label>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            {THEMES.map((theme) => {
              const active = pref === theme.id;
              const preview = theme.id === 'system' ? null : palettes[theme.id];

              return (
                <Pressable
                  key={theme.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  onPress={() => setPref(theme.id)}
                  style={{
                    flex: 1,
                    borderRadius: radii.card,
                    borderWidth: 1.5,
                    borderColor: active ? c.ink : c.line,
                    backgroundColor: c.surface,
                    padding: 8,
                    gap: 8,
                  }}
                >
                  <View
                    style={{
                      height: 62,
                      borderRadius: 9,
                      overflow: 'hidden',
                      backgroundColor: preview?.bg ?? c.raised,
                      padding: 7,
                      gap: 5,
                      justifyContent: 'flex-end',
                    }}
                  >
                    {preview ? (
                      <>
                        <View
                          style={{
                            height: 7,
                            width: '70%',
                            borderRadius: 4,
                            backgroundColor: preview.ink,
                          }}
                        />
                        <View
                          style={{
                            height: 7,
                            width: '45%',
                            borderRadius: 4,
                            backgroundColor: preview.accent,
                          }}
                        />
                      </>
                    ) : (
                      <View style={{ flexDirection: 'row', gap: 3 }}>
                        <View
                          style={{
                            flex: 1,
                            height: 7,
                            borderRadius: 4,
                            backgroundColor: palettes.light.ink,
                          }}
                        />
                        <View
                          style={{
                            flex: 1,
                            height: 7,
                            borderRadius: 4,
                            backgroundColor: palettes.dark.ink,
                          }}
                        />
                      </View>
                    )}
                  </View>

                  <Txt size={13} weight={600} center color={active ? c.ink : c.muted}>
                    {theme.label}
                  </Txt>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Card padding={4} radius={radii.cardLg}>
          {ROWS.map((row, index) => (
            <Pressable
              key={row.label}
              accessibilityRole="button"
              onPress={() => router.push(row.href)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 14,
                paddingVertical: 16,
                borderTopWidth: index === 0 ? 0 : 1,
                borderColor: c.line,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Txt size={15} weight={500} style={{ flex: 1 }}>
                {row.label}
              </Txt>
              {details[row.label] ? (
                <Txt size={13} color={row.label === 'Subscription' ? c.accentText : c.muted}>
                  {details[row.label]}
                </Txt>
              ) : null}
              <Ionicons name="chevron-forward" size={16} color={c.muted} />
            </Pressable>
          ))}
        </Card>

        {__DEV__ ? <QaPanel /> : null}

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/settings/account')}
          style={{ paddingVertical: 14 }}
        >
          <Txt size={15} weight={600} color={c.danger}>
            Sign out
          </Txt>
        </Pressable>
      </ScrollView>
    </View>
  );
}

/**
 * Development only, and only ever acts for the seeded demo builders.
 *
 * Hey100 needs two people to do anything interesting, so testing it alone
 * means standing in for the other side. These buttons make a demo builder say
 * hey, reply, or send feedback; against a database with no demo accounts they
 * do nothing at all.
 */
function QaPanel() {
  const { c } = useTheme();
  const toast = useToast();
  const store = useStore();
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const [busy, setBusy] = useState<string | null>(null);

  const newest = store.matches[0];

  const run = async (label: string, action: () => Promise<DemoResult | null>) => {
    setBusy(label);
    try {
      const result = await action();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.heys(userId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.threads(userId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.feedback(userId) }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.messages(newest?.id ?? null),
        }),
      ]);

      toast(result?.status === 'blocked' ? `Nothing to do: ${result.reason}` : `${label} done`);
    } catch {
      toast(`${label} failed`);
    } finally {
      setBusy(null);
    }
  };

  const actions: [string, () => Promise<DemoResult | null>][] = [
    ['Demo builders say hey', demoHeyMe],
    ['Demo builder replies', () => (newest ? demoReply(newest.id) : noThread())],
    ['Demo builder sends feedback', () => (newest ? demoFeedback(newest.id) : noThread())],
  ];

  return (
    <View style={{ gap: 11 }}>
      <Label>QA · development only</Label>

      <Card padding={4} radius={radii.cardLg}>
        {actions.map(([label, action], index) => (
          <Pressable
            key={label}
            accessibilityRole="button"
            disabled={!!busy}
            onPress={() => void run(label, action)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 14,
              paddingVertical: 16,
              borderTopWidth: index === 0 ? 0 : 1,
              borderColor: c.line,
              opacity: pressed || busy ? 0.6 : 1,
            })}
          >
            <Txt size={15} weight={500} style={{ flex: 1 }}>
              {label}
            </Txt>
            <Txt size={13} muted>
              {busy === label ? 'Working…' : 'Run'}
            </Txt>
          </Pressable>
        ))}
      </Card>

      <Txt size={12.5} muted lh={1.45}>
        Replies and feedback go to your newest match
        {newest ? '' : ', once you have one'}.
      </Txt>
    </View>
  );
}

function noThread(): Promise<DemoResult> {
  return Promise.resolve({ status: 'blocked', reason: 'no match yet' });
}
