import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import { Alert, Linking, Pressable, View } from 'react-native';

import { Btn } from '@/components/ui/Btn';
import { Field } from '@/components/ui/Field';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { Txt } from '@/components/ui/Txt';
import {
  connectRevenueCat,
  connectStripe,
  disconnectProvider,
  listConnections,
  listGithubRepos,
  listRevenueCatProjects,
  selectGithubRepo,
  snapshotToConnection,
  startGithub,
  verifyAppStore,
  type GithubRepo,
  type RcProject,
} from '@/data/repo/connections';
import type { Integration, IntegrationKey } from '@/data/types';
import { isServerId } from '@/lib/supabase';
import { useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

import { IntegrationMark } from './IntegrationMark';

const RC_NEW_KEY = 'https://app.revenuecat.com/settings/api-keys/new';
const STRIPE_KEYS = 'https://dashboard.stripe.com/apikeys';

const REDIRECT = 'hey100://connect';

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

    if (key === 'github') {
      try {
        const { url } = await startGithub(appId);
        const result = await WebBrowser.openAuthSessionAsync(url, REDIRECT);
        if (result.type !== 'success') return;
        const params = new URL(result.url).searchParams;
        if (params.get('next') === 'repos' || params.get('status') === 'ok') {
          store.hydrateConnections(appId, await listConnections(appId));
          setSheet('github');
        } else {
          toast('GitHub did not finish signing in');
        }
      } catch (error) {
        toast(error instanceof Error ? error.message : 'GitHub is not configured yet');
      }
      return;
    }

    setSheet(key);
  };

  return { sheet, setSheet, run, connected };
}

export function GithubRepoSheet({
  visible,
  appId,
  onClose,
}: {
  visible: boolean;
  appId: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const store = useStore();
  const { c } = useTheme();
  const [repos, setRepos] = useState<GithubRepo[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  React.useEffect(() => {
    if (!visible) return;
    setRepos(null);
    void listGithubRepos(appId)
      .then((data) => setRepos(data.repos))
      .catch((error) => toast(error instanceof Error ? error.message : 'Could not list repos'));
  }, [appId, toast, visible]);

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ gap: 12 }}>
        <Txt font="mono" size={18} weight={500}>
          Pick a repo
        </Txt>
        <Txt size={13.5} lh={1.45} muted>
          We count every commit on the repo, and a 30-day band. The listing shows both.
        </Txt>
        {(repos ?? []).map((repo) => (
          <Pressable
            key={repo.fullName}
            disabled={!!busy}
            onPress={() => {
              setBusy(repo.fullName);
              void selectGithubRepo(appId, repo.fullName)
                .then((snap) => {
                  store.setAppConnection(appId, 'github', snapshotToConnection('github', snap));
                  onClose();
                  toast('GitHub verified');
                })
                .catch((error) => toast(error instanceof Error ? error.message : 'Could not read that repo'))
                .finally(() => setBusy(null));
            }}
            style={({ pressed }) => ({
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderRadius: radii.option,
              backgroundColor: c.raised,
              opacity: pressed || busy === repo.fullName ? 0.7 : 1,
            })}
          >
            <Txt size={15} weight={600}>
              {repo.fullName}
            </Txt>
            <Txt size={12} muted>
              {repo.private ? 'Private' : 'Public'}
              {busy === repo.fullName ? ' · reading commits…' : ''}
            </Txt>
          </Pressable>
        ))}
        {repos && !repos.length ? (
          <Txt size={14} muted>
            No repos on that GitHub account.
          </Txt>
        ) : null}
        {repos === null ? (
          <Txt size={14} muted>
            Loading repos…
          </Txt>
        ) : null}
      </View>
    </Sheet>
  );
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

export function RevenueCatSheet({
  visible,
  appId,
  onClose,
}: {
  visible: boolean;
  appId: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const store = useStore();
  const { c } = useTheme();
  const [apiKey, setApiKey] = useState('');
  const [projects, setProjects] = useState<RcProject[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(false);

  React.useEffect(() => {
    if (!visible) setHelp(false);
  }, [visible]);

  const finish = (project: RcProject) => {
    setBusy(true);
    void connectRevenueCat(appId, apiKey.trim(), project.id, project.name)
      .then((snap) => {
        store.setAppConnection(appId, 'revenuecat', snapshotToConnection('revenuecat', snap));
        onClose();
        toast('RevenueCat verified');
      })
      .catch((error) => toast(error instanceof Error ? error.message : 'Could not read that project'))
      .finally(() => setBusy(false));
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ gap: 14 }}>
        {help ? (
          <Image
            source={require('../../../../assets/images/revenuecat-api-key.png')}
            style={{ width: '100%', aspectRatio: 16 / 10, borderRadius: radii.card, backgroundColor: c.raised }}
            contentFit="contain"
          />
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Txt font="mono" size={18} weight={500} style={{ flex: 1 }}>
            RevenueCat
          </Txt>
          <Pressable
            onPress={() => setHelp((prev) => !prev)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="How to create a RevenueCat key"
          >
            <Ionicons
              name={help ? 'close-circle-outline' : 'help-circle-outline'}
              size={22}
              color={help ? c.accentText : c.muted}
            />
          </Pressable>
        </View>
        <Txt size={13.5} lh={1.45} muted>
          Paste a v2 secret API key with Project configuration → Projects → Read, plus Charts &
          Metrics read. One connect puts subscriptions, MRR, 28-day revenue and active customers on
          your listing — as bands, not exact numbers.
        </Txt>
        <Field
          label="v2 secret API key"
          value={apiKey}
          placeholder="sk_…"
          minHeight={48}
          onChangeText={setApiKey}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          revealable
        />
        <Btn
          label={busy ? 'Checking…' : 'Find projects'}
          variant="accent"
          size="lg"
          full
          onPress={() => {
            if (!apiKey.trim()) return;
            setBusy(true);
            void listRevenueCatProjects(appId, apiKey.trim())
              .then((data) => {
                if (data.projects.length === 1) {
                  finish(data.projects[0]);
                  return;
                }
                setProjects(data.projects);
              })
              .catch((error) => toast(error instanceof Error ? error.message : 'Key was rejected'))
              .finally(() => setBusy(false));
          }}
        />
        <Pressable
          onPress={() => void Linking.openURL(RC_NEW_KEY)}
          accessibilityRole="link"
          accessibilityLabel="Get my RevenueCat key"
        >
          <Txt size={14} weight={600} color={c.accentText} center>
            Get my key
          </Txt>
        </Pressable>
        {projects?.map((project) => (
          <Pressable
            key={project.id}
            onPress={() => finish(project)}
            style={({ pressed }) => ({
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderRadius: radii.option,
              backgroundColor: c.raised,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Txt size={15} weight={600}>
              {project.name}
            </Txt>
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}

export function StripeSheet({
  visible,
  appId,
  onClose,
}: {
  visible: boolean;
  appId: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const store = useStore();
  const { c } = useTheme();
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);

  const verify = () => {
    const key = apiKey.trim();
    if (!key) return;
    setBusy(true);
    void connectStripe(appId, key)
      .then((snap) => {
        store.setAppConnection(appId, 'stripe', snapshotToConnection('stripe', snap));
        onClose();
        toast('Stripe verified');
      })
      .catch((error) => toast(error instanceof Error ? error.message : 'Key was rejected'))
      .finally(() => setBusy(false));
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ gap: 14 }}>
        <Txt font="mono" size={18} weight={500}>
          Stripe
        </Txt>
        <Txt size={13.5} lh={1.45} muted>
          Paste a restricted key from your product’s Stripe account. Charges and Subscriptions:
          Read. The key stays on the server. Hey100 never charges anyone or moves funds.
        </Txt>
        <Field
          label="Restricted API key"
          value={apiKey}
          placeholder="rk_live_…"
          minHeight={48}
          onChangeText={setApiKey}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          revealable
        />
        <Btn
          label={busy ? 'Checking…' : 'Verify revenue'}
          variant="accent"
          size="lg"
          full
          onPress={verify}
        />
        <Pressable
          onPress={() => void Linking.openURL(STRIPE_KEYS)}
          accessibilityRole="link"
          accessibilityLabel="Create a Stripe restricted key"
        >
          <Txt size={14} weight={600} color={c.accentText} center>
            Get my key
          </Txt>
        </Pressable>
      </View>
    </Sheet>
  );
}

export function ConnectSheets({
  appId,
  storeUrl,
  sheet,
  onClose,
}: {
  appId: string;
  storeUrl?: string;
  sheet: IntegrationKey | null;
  onClose: () => void;
}) {
  return (
    <>
      <GithubRepoSheet visible={sheet === 'github'} appId={appId} onClose={onClose} />
      <AppStoreSheet visible={sheet === 'asc'} appId={appId} initialUrl={storeUrl} onClose={onClose} />
      <RevenueCatSheet visible={sheet === 'revenuecat'} appId={appId} onClose={onClose} />
      <StripeSheet visible={sheet === 'stripe'} appId={appId} onClose={onClose} />
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
