import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Label, Txt } from '@/components/ui/Txt';
import { INTEGRATIONS, shortName } from '@/data/mock';
import {
  ConnectSheets,
  IntegrationRow,
  useIntegrationActions,
} from '@/features/apps/connect/ConnectSheets';
import { useConnectionsSync } from '@/features/apps/connect/useConnect';
import { captureEvent } from '@/lib/analytics';
import { useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radii } from '@/theme/tokens';

export default function ConnectedAccounts() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const store = useStore();

  // Connections are per listing, so a builder with two apps picks which one.
  const [appId, setAppId] = useState(store.primaryApp.id);
  const app = store.apps[appId] ?? store.primaryApp;
  useConnectionsSync(app.id);
  const connect = useIntegrationActions(app.id);
  const connections = connect.connected;
  const connectedCount = Object.values(connections).filter(Boolean).length;

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
          Connected accounts
        </Txt>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingBottom: 60, gap: 16 }}
      >
        <Txt size={13.5} lh={1.45} muted>
          Connecting an account puts a verified badge on your public listing, so builders can see
          your traction without taking your word for it. Exact numbers stay private: Hey100 only
          ever shows a band.
        </Txt>

        {store.ownedApps.length > 1 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
            {store.ownedApps.map((owned) => (
              <Chip
                key={owned.id}
                label={shortName(owned.name)}
                selected={owned.id === app.id}
                size="sm"
                onPress={() => setAppId(owned.id)}
              />
            ))}
          </View>
        ) : null}

        <Card padding={16} radius={radii.cardLg} style={{ gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Label style={{ flex: 1 }}>{shortName(app.name)}</Label>
            <Txt font="mono" size={12} color={c.accentText}>
              {connectedCount}/{INTEGRATIONS.length} connected
            </Txt>
          </View>

          {INTEGRATIONS.map((integration) => (
            <View key={integration.key} style={{ gap: 9 }}>
              <IntegrationRow
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
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: c.bg,
                  borderRadius: radii.card,
                  borderWidth: 1,
                  borderColor: c.line,
                  paddingHorizontal: 11,
                  paddingVertical: 9,
                }}
              >
                <Ionicons
                  name={connections[integration.key] ? 'shield-checkmark' : 'shield-outline'}
                  size={14}
                  color={connections[integration.key] ? c.accentText : c.muted}
                />
                <Txt size={11.5} lh={1.35} muted style={{ flex: 1 }}>
                  {connections[integration.key] ? 'On your page: ' : 'Unlocks: '}
                  {(connections[integration.key]?.badges ??
                    (connections[integration.key]?.badge ? [connections[integration.key]!.badge] : null) ??
                    [integration.badge]
                  ).join(' · ')}
                </Txt>
              </View>
            </View>
          ))}
        </Card>

        <Card tone="soft" padding={16} radius={radii.cardLg} style={{ gap: 8 }}>
          <Txt size={15} weight={600} color={c.accentText}>
            Verified as of today
          </Txt>
          <Txt size={13.5} lh={1.45} color={c.accentText}>
            Connections re-sync daily. If one breaks, the badge comes off your listing until it
            reconnects. Your keys and tokens never leave the server.
          </Txt>
        </Card>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/my-app/[id]', params: { id: app.id } })}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingVertical: 4,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Txt size={14} weight={600} color={c.accentText} style={{ flex: 1 }}>
            See how the badges look on your page
          </Txt>
          <Ionicons name="chevron-forward" size={16} color={c.accentText} />
        </Pressable>
      </ScrollView>

      <ConnectSheets
        appId={app.id}
        storeUrl={app.links?.find(([kind]) => kind === 'App Store')?.[1]}
        sheet={connect.sheet}
        onClose={() => connect.setSheet(null)}
      />
    </View>
  );
}
