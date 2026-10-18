import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Btn } from '@/components/ui/Btn';
import { Card } from '@/components/ui/Card';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { Label, Txt } from '@/components/ui/Txt';
import { INTEGRATIONS, shortName, slugify } from '@/data/mock';
import { queryKeys } from '@/data/repo/keys';
import type { Integration, OwnedApp, SectionKey } from '@/data/types';
import { AppPage } from '@/features/app-page/AppPage';
import { EditSectionSheet } from '@/features/app-page/EditSectionSheet';
import { persistListing } from '@/features/apps/persistListing';
import { useAuth } from '@/features/auth/AuthProvider';
import { captureEvent } from '@/lib/analytics';
import { moveSectionIn, useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, layout, radii } from '@/theme/tokens';

export default function OwnerAppPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const toast = useToast();
  const store = useStore();

  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const { id, setup } = useLocalSearchParams<{ id: string; setup?: string }>();
  const app = store.apps[id] ?? store.primaryApp;

  /**
   * The store already has the edit, so a failure here means the screen and the
   * server disagree; refetching is what settles it.
   */
  const persist = (patch: Partial<OwnedApp>) => {
    persistListing(userId, app.id, patch)
      .then(() =>
        queryClient.invalidateQueries({
          queryKey: queryKeys.myListings(userId),
        }),
      )
      .catch(() => {
        toast('That change did not save. Pull to refresh.');
        void queryClient.invalidateQueries({
          queryKey: queryKeys.myListings(userId),
        });
      });
  };

  const [editLayout, setEditLayout] = useState(false);
  const [editSection, setEditSection] = useState<SectionKey | null>(null);
  const [badge, setBadge] = useState<string | null>(null);
  const [badgeStyle, setBadgeStyle] = useState<'Dark' | 'Light'>('Dark');

  const isSetup = setup === '1';
  const slug = app.slug ?? slugify(app.name);
  const url = `hey100.com/${slug}`;
  const connections = store.connections[app.id] ?? {};
  const connectedCount = Object.values(connections).filter(Boolean).length;
  const revenueConnected = !!connections.stripe || !!connections.revenuecat;

  const badges: { id: string; label: string; locked?: boolean }[] = [
    { id: 'find', label: 'Find us on Hey100' },
    { id: 'tested', label: `Tested by ${app.trades} builders on Hey100` },
    {
      id: 'revenue',
      label: 'Verified $… MRR · Hey100',
      locked: !revenueConnected,
    },
  ];

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
        {isSetup ? (
          <View style={{ flex: 1 }} />
        ) : (
          <>
            <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Back to Apps">
              <Ionicons name="chevron-back" size={26} color={c.ink} />
            </Pressable>
            <Txt font="mono" size={17} weight={500} style={{ flex: 1 }} numberOfLines={1}>
              {shortName(app.name)}
            </Txt>
            <Pressable onPress={() => setEditLayout((prev) => !prev)} hitSlop={10}>
              <Txt size={14} weight={600} color={editLayout ? c.accentText : c.ink}>
                {editLayout ? 'Done' : 'Edit layout'}
              </Txt>
            </Pressable>
          </>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingBottom: isSetup ? 120 : layout.tabBarSpacer,
          gap: 16,
        }}
      >
        <Card tone="soft" padding={16} radius={radii.cardLg} style={{ gap: 12 }}>
          <Txt font="mono" size={19} weight={500} color={c.accentText}>
            {isSetup ? 'Your listing is live.' : 'Your public page'}
          </Txt>

          <Pressable
            onPress={() => {
              Clipboard.setStringAsync(`https://${url}`).catch(() => {});
              toast('Link copied');
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 9,
              backgroundColor: c.surface,
              borderRadius: radii.card,
              paddingHorizontal: 13,
              paddingVertical: 11,
            }}
          >
            <Ionicons name="link-outline" size={15} color={c.muted} />
            <Txt font="mono" size={13.5} style={{ flex: 1 }} numberOfLines={1}>
              {url}
            </Txt>
            <Ionicons name="copy-outline" size={15} color={c.muted} />
          </Pressable>

          <Btn
            label={isSetup ? 'Post it' : 'Share'}
            variant="accent"
            size="md"
            onPress={() =>
              router.push({
                pathname: '/share',
                params: { kind: 'listing', appId: app.id },
              })
            }
            style={{ alignSelf: 'flex-start' }}
          />
        </Card>

        <Card padding={16} radius={radii.cardLg} style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Label style={{ flex: 1 }}>Verify your traction</Label>
            <Txt font="mono" size={12} color={c.accentText}>
              {connectedCount}/4 connected
            </Txt>
          </View>

          {INTEGRATIONS.map((integration) => (
            <IntegrationRow
              key={integration.key}
              integration={integration}
              connected={!!connections[integration.key]}
              onToggle={() => {
                store.toggleIntegration(app.id, integration.key);
                captureEvent('integration_toggled', {
                  provider: integration.key,
                  connected: !connections[integration.key],
                });
              }}
            />
          ))}
        </Card>

        <Card padding={16} radius={radii.cardLg} style={{ gap: 12 }}>
          <Label>Badges for your site</Label>

          {badges.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() =>
                item.locked ? toast('Connect Stripe or RevenueCat first') : setBadge(item.id)
              }
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 11,
                backgroundColor: c.bg,
                borderRadius: radii.card,
                borderWidth: 1,
                borderColor: c.line,
                paddingHorizontal: 13,
                paddingVertical: 13,
                opacity: item.locked ? 0.55 : 1,
              }}
            >
              <Txt size={13.5} weight={500} style={{ flex: 1 }} numberOfLines={1}>
                {item.label}
              </Txt>
              <Ionicons
                name={item.locked ? 'lock-closed' : 'chevron-forward'}
                size={15}
                color={c.muted}
              />
            </Pressable>
          ))}
        </Card>

        <View style={{ gap: 12, marginTop: 6 }}>
          <Label>How builders see your page</Label>
          <Txt size={12.5} lh={1.45} muted>
            {editLayout
              ? 'Reordering sections. Tap Done to edit what they say.'
              : 'Tap any section to edit it. Use Edit layout to reorder them.'}
          </Txt>
          <AppPage
            listing={app}
            mode="owner"
            editLayout={editLayout}
            onMoveSection={(index, direction) => {
              store.moveSection(app.id, index, direction);
              persist({ layout: moveSectionIn(app.layout, index, direction) });
            }}
            onEditSection={setEditSection}
            onOpenLink={(kind, value) =>
              router.push({ pathname: '/browser', params: { kind, value } })
            }
          />
        </View>
      </ScrollView>

      {isSetup ? (
        <View
          style={{
            position: 'absolute',
            left: layout.gutter,
            right: layout.gutter,
            bottom: insets.bottom + 14,
          }}
        >
          <Btn
            label="Start matching"
            variant="accent"
            size="lg"
            full
            onPress={() => router.replace('/(tabs)/discover')}
          />
        </View>
      ) : null}

      <EditSectionSheet
        section={editSection}
        app={app}
        onClose={() => setEditSection(null)}
        onSave={(patch) => {
          store.updateApp(app.id, patch);
          persist(patch);
          captureEvent('listing_section_edited', {
            section: editSection ?? '',
          });
          setEditSection(null);
          toast('Listing updated');
        }}
      />

      <Sheet visible={!!badge} onClose={() => setBadge(null)}>
        <View style={{ gap: 16 }}>
          <Txt font="mono" size={18} weight={500}>
            Badge preview
          </Txt>

          {/* A mock website footer, so the badge is judged in context. */}
          <View
            style={{
              borderRadius: radii.cardLg,
              backgroundColor: badgeStyle === 'Dark' ? '#101210' : '#FFFFFF',
              padding: 20,
              gap: 14,
              alignItems: 'center',
            }}
          >
            <Txt size={11} color={badgeStyle === 'Dark' ? '#8E968F' : '#5B625C'}>
              © {new Date().getFullYear()} {shortName(app.name)}
            </Txt>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: badgeStyle === 'Dark' ? '#1C1F1C' : '#F2F3EF',
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 9,
              }}
            >
              <Txt size={14}>✋</Txt>
              <Txt size={12.5} weight={600} color={badgeStyle === 'Dark' ? '#E8ECE7' : '#121412'}>
                {badges.find((item) => item.id === badge)?.label}
              </Txt>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['Dark', 'Light'] as const).map((style) => (
              <Pressable
                key={style}
                onPress={() => setBadgeStyle(style)}
                style={{
                  flex: 1,
                  height: 42,
                  borderRadius: radii.pill,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: badgeStyle === style ? c.ink : 'transparent',
                  borderWidth: 1.5,
                  borderColor: badgeStyle === style ? c.ink : c.line,
                }}
              >
                <Txt size={14} weight={600} color={badgeStyle === style ? c.bg : c.ink}>
                  {style}
                </Txt>
              </Pressable>
            ))}
          </View>

          <View
            style={{
              backgroundColor: c.bg,
              borderRadius: radii.card,
              borderWidth: 1,
              borderColor: c.line,
              padding: 13,
            }}
          >
            <Txt size={11} muted lh={1.5} style={{ fontFamily: fonts.mono }}>
              {`<a href="https://${url}"><img src="https://hey100.com/badge/${slug}.svg?style=${badgeStyle.toLowerCase()}&type=${badge}"></a>`}
            </Txt>
          </View>

          <Btn
            label="Copy embed code"
            variant="accent"
            size="lg"
            full
            onPress={() => {
              Clipboard.setStringAsync(
                `<a href="https://${url}"><img src="https://hey100.com/badge/${slug}.svg?style=${badgeStyle.toLowerCase()}&type=${badge}"></a>`,
              ).catch(() => {});
              toast('Embed code copied');
              setBadge(null);
            }}
          />
        </View>
      </Sheet>
    </View>
  );
}

function IntegrationRow({
  integration,
  connected,
  onToggle,
}: {
  integration: Integration;
  connected: boolean;
  onToggle: () => void;
}) {
  const { c } = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 11,
          backgroundColor: connected ? c.soft : c.raised,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Txt font="mono" size={15} weight={700} color={connected ? c.accentText : c.muted}>
          {integration.letter}
        </Txt>
      </View>

      <View style={{ flex: 1 }}>
        <Txt size={14.5} weight={600}>
          {integration.name}
        </Txt>
        <Txt size={12.5} muted numberOfLines={1}>
          {connected ? integration.on : integration.desc}
        </Txt>
        {connected && integration.detail ? (
          <Txt size={11.5} muted numberOfLines={1} style={{ marginTop: 1 }}>
            {integration.detail}
          </Txt>
        ) : null}
      </View>

      <Btn
        label={connected ? 'Connected' : 'Connect'}
        variant={connected ? 'ghost' : 'surface'}
        size="sm"
        onPress={onToggle}
      />
    </View>
  );
}
