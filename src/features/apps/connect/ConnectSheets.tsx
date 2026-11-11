import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Btn } from '@/components/ui/Btn';
import { Field } from '@/components/ui/Field';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { Txt } from '@/components/ui/Txt';
import { disconnectProvider, snapshotToConnection, verifyAppStore } from '@/data/repo/connections';
import type { Integration, IntegrationKey } from '@/data/types';
import { isServerId } from '@/lib/supabase';
import { useStore } from '@/store/AppStore';
import { radii } from '@/theme/tokens';

import { isFlowId } from './flows';
import { IntegrationFlow } from './IntegrationFlow';
import { IntegrationMark } from './IntegrationMark';

export function useIntegrationActions(appId: string) {
  const toast = useToast();
  const store = useStore();
  const [sheet, setSheet] = useState<IntegrationKey | null>(null);

  const connected = store.connections[appId] ?? {};

  const run = async (key: IntegrationKey) => {
    if (!isServerId(appId)) {
      toast('Publish this listing on the server before connecting accounts');
      return;
    }

    if (connected[key]) {
      Alert.alert('Remove this connection?', 'The badge comes off your listing until you reconnect.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void disconnectProvider(appId, key)
              .then(() => store.setAppConnection(appId, key, null))
              .catch(() => toast("Couldn't remove that connection"));
          },
        },
      ]);
      return;
    }

    setSheet(key);
  };

  return { sheet, setSheet, run, connected };
}

export function AppStoreSheet({
  visible,
  appId,
  initialUrl,
  onClose,
}: {
  visible: boolean;
  appId: string;
  initialUrl?: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const store = useStore();
  const [url, setUrl] = useState(initialUrl ?? '');
  const [busy, setBusy] = useState(false);

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ gap: 14 }}>
        <Txt font="mono" size={18} weight={500}>
          App Store listing
        </Txt>
        <Txt size={13.5} lh={1.45} muted>
          Paste the public App Store URL or the bundle id. We look it up on the store — downloads
          stay for later.
        </Txt>
        <Field
          label="App Store URL or bundle id"
          value={url}
          placeholder="https://apps.apple.com/app/id…"
          minHeight={48}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Btn
          label={busy ? 'Checking…' : 'Verify live listing'}
          variant="accent"
          size="lg"
          full
          onPress={() => {
            if (!url.trim()) return;
            setBusy(true);
            void verifyAppStore(appId, url.trim())
              .then((snap) => {
                store.setAppConnection(appId, 'asc', snapshotToConnection('asc', snap));
                store.updateApp(appId, {
                  storeUrl: url.trim(),
                  ...(typeof snap.snapshot?.rating === 'number'
                    ? { storeRating: snap.snapshot.rating }
                    : {}),
                  ...(typeof snap.snapshot?.rating_count === 'number'
                    ? { storeRatingCount: snap.snapshot.rating_count }
                    : {}),
                });
                onClose();
                toast('Live on the App Store');
              })
              .catch((error) => toast(error instanceof Error ? error.message : 'No listing matched'))
              .finally(() => setBusy(false));
          }}
        />
      </View>
    </Sheet>
  );
}

export function ConnectSheets({
  appId,
  appName,
  appIcon,
  appHue,
  storeUrl,
  sheet,
  onClose,
}: {
  appId: string;
  appName?: string;
  appIcon?: string | null;
  appHue?: number;
  storeUrl?: string;
  sheet: IntegrationKey | null;
  onClose: () => void;
}) {
  return (
    <>
      <IntegrationFlow
        visible={!!sheet && isFlowId(sheet)}
        provider={sheet && isFlowId(sheet) ? sheet : null}
        appId={appId}
        appName={appName ?? 'Your app'}
        appIcon={appIcon}
        appHue={appHue}
        onClose={onClose}
      />
      <AppStoreSheet visible={sheet === 'asc'} appId={appId} initialUrl={storeUrl} onClose={onClose} />
    </>
  );
}

/** One row: connect / remove. */
export function IntegrationRow({
  integration,
  connected,
  onPress,
}: {
  integration: Integration;
  connected: { on: string; detail?: string; badge: string; badges?: string[] } | null;
  onPress: () => void;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <IntegrationMark provider={integration.key} connected={!!connected} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Txt size={14.5} weight={600}>
            {integration.name}
          </Txt>
          {connected ? <Ionicons name="checkmark-circle" size={16} color="#34C759" /> : null}
        </View>
        <Txt size={12.5} muted numberOfLines={1}>
          {connected ? connected.on : integration.desc}
        </Txt>
        {connected?.detail ? (
          <Txt size={11.5} muted numberOfLines={1} style={{ marginTop: 1 }}>
            {connected.detail}
          </Txt>
        ) : null}
      </View>
      <Btn
        label={connected ? 'Remove' : 'Connect'}
        variant={connected ? 'ghost' : 'surface'}
        size="sm"
        onPress={onPress}
      />
    </View>
  );
}
