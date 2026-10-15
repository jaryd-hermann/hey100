import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { Label, Txt } from '@/components/ui/Txt';
import { useStore } from '@/store/AppStore';
import { useTheme, type ThemePref } from '@/theme/ThemeProvider';
import { palettes } from '@/theme/tokens';
import { layout, radii } from '@/theme/tokens';

const THEMES: { id: ThemePref; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

const ROWS: { label: string; detail?: string }[] = [
  { label: 'Subscription' },
  { label: 'Notifications' },
  { label: 'Connected accounts' },
  { label: 'Account' },
];

export default function Settings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c, pref, setPref } = useTheme();
  const toast = useToast();
  const store = useStore();

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
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingBottom: 60, gap: 22 }}
      >
        <View style={{ gap: 11 }}>
          <Label>Appearance</Label>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            {THEMES.map((theme) => {
              const active = pref === theme.id;
              const preview =
                theme.id === 'system'
                  ? null
                  : palettes[theme.id];

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
                        <View style={{ flex: 1, height: 7, borderRadius: 4, backgroundColor: palettes.light.ink }} />
                        <View style={{ flex: 1, height: 7, borderRadius: 4, backgroundColor: palettes.dark.ink }} />
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
              onPress={() => toast(`${row.label} lands next`)}
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
              {row.label === 'Subscription' ? (
                <Txt size={13} color={c.accentText}>
                  {store.isPro ? 'Pro' : 'Free'}
                </Txt>
              ) : null}
              <Ionicons name="chevron-forward" size={16} color={c.muted} />
            </Pressable>
          ))}
        </Card>

        <Pressable
          accessibilityRole="button"
          onPress={() => toast('Sign out lands with real auth')}
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
