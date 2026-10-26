import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Btn } from '@/components/ui/Btn';
import { Card } from '@/components/ui/Card';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { Label, Txt } from '@/components/ui/Txt';
import { INTEGRATIONS, shortName } from '@/data/mock';
import { queryKeys } from '@/data/repo/keys';
import type { OwnedApp, SectionKey } from '@/data/types';
import { AppPage } from '@/features/app-page/AppPage';
import { BannerEditor, EditSectionSheet } from '@/features/app-page/EditSectionSheet';
import {
  ConnectSheets,
  IntegrationRow,
  useIntegrationActions,
} from '@/features/apps/connect/ConnectSheets';
import { useConnectionsSync } from '@/features/apps/connect/useConnect';
import { persistListing } from '@/features/apps/persistListing';
import { PitchGate } from '@/features/apps/PitchGate';
import { useAuth } from '@/features/auth/AuthProvider';
import { captureEvent } from '@/lib/analytics';
import { moveSectionIn, useStore, withDefaultSections } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radii } from '@/theme/tokens';

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
  const [editSection, setEditSection] = useState<SectionKey | 'listing' | null>(null);
  const [editCover, setEditCover] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);

  const isSetup = setup === '1';
  useConnectionsSync(app.id);

  useEffect(() => {
    const next = withDefaultSections(app.layout);
    if (next.join(',') === (app.layout ?? []).join(',')) return;
    store.updateApp(app.id, { layout: next });
    persist({ layout: next });
  }, [app.id]);
  const connect = useIntegrationActions(app.id);
  const connections = connect.connected;
  const connectedCount = Object.values(connections).filter(Boolean).length;
  const pending = connectedCount < INTEGRATIONS.length;
  const verifyAtBottom = connectedCount >= 2;

  const verifyCard = (
    <Card padding={16} radius={radii.cardLg} style={{ gap: verifyOpen ? 14 : 8 }}>
      <Pressable
        onPress={() => setVerifyOpen((prev) => !prev)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
      >
        <View style={{ flex: 1, gap: 3 }}>
          <Label>Verifications</Label>
          <Txt font="mono" size={13} color={c.accentText}>
            {connectedCount}/{INTEGRATIONS.length} verified
            {pending ? ' · pending' : ''}
          </Txt>
        </View>
        <Ionicons
          name={verifyOpen ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={c.muted}
        />
      </Pressable>

      {!verifyOpen && pending ? (
        <Txt size={12.5} muted>
          {INTEGRATIONS.filter((item) => connections[item.key])
            .map((item) => item.name)
            .join(' · ') || 'Nothing connected yet'}
        </Txt>
      ) : null}

      {verifyOpen
        ? INTEGRATIONS.map((integration) => (
            <IntegrationRow
              key={integration.key}
              integration={integration}
              connected={connections[integration.key] ?? null}
              onPress={() => {
                void connect.run(integration.key);
                captureEvent('integration_toggled', {
                  provider: integration.key,
                  connected: !connections[integration.key],
                });
              }}
            />
          ))
        : null}
    </Card>
  );

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
        {verifyAtBottom ? null : verifyCard}

        {editLayout ? (
          <Txt size={12.5} lh={1.45} muted>
            Reordering sections. Tap Done to edit what they say.
          </Txt>
        ) : null}

        <AppPage
          listing={app}
          mode="owner"
          editLayout={editLayout}
          onMoveSection={(index, direction) => {
            store.moveSection(app.id, index, direction);
            persist({ layout: moveSectionIn(app.layout, index, direction) });
          }}
          onEditSection={setEditSection}
          onEditListing={() => setEditSection('listing')}
          onEditCover={() => setEditCover(true)}
          onOpenLink={(kind, value) =>
            router.push({ pathname: '/browser', params: { kind, value } })
          }
        />

        {verifyAtBottom ? verifyCard : null}
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
        section={editSection === 'pitch' ? null : editSection}
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

      <PitchGate
        visible={editSection === 'pitch'}
        builder={app.builder || store.user.realName}
        onClose={() => setEditSection(null)}
        onPublish={async (uri, seconds) => {
          const patch = { pitchUri: uri, pitchSeconds: seconds };
          store.updateApp(app.id, patch);
          try {
            await persistListing(userId, app.id, patch);
            void queryClient.invalidateQueries({
              queryKey: queryKeys.myListings(userId),
            });
            captureEvent('listing_section_edited', { section: 'pitch' });
            setEditSection(null);
            toast('Quick pitch published');
          } catch {
            toast('The pitch did not save. Try again.');
          }
        }}
      />

      <Sheet visible={editCover} onClose={() => setEditCover(false)}>
        <BannerEditor
          app={app}
          onClose={() => setEditCover(false)}
          onSave={(patch) => {
            store.updateApp(app.id, patch);
            persist(patch);
            setEditCover(false);
            toast(patch.cover ? 'Banner updated' : 'Banner removed');
          }}
        />
      </Sheet>

      <ConnectSheets
        appId={app.id}
        storeUrl={app.links?.find(([kind]) => kind === 'App Store')?.[1]}
        sheet={connect.sheet}
        onClose={() => connect.setSheet(null)}
      />
    </View>
  );
}
