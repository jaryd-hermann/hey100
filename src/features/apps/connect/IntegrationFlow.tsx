import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/ui/AppIcon';
import { Txt } from '@/components/ui/Txt';
import {
  connectPosthog,
  connectRevenueCat,
  connectStripe,
  listGithubRepos,
  listPosthogProjects,
  listRevenueCatProjects,
  selectGithubRepo,
  snapshotToConnection,
  startGithub,
  startPosthog,
  type AppConnectionSnapshot,
  type GithubRepo,
  type RcProject,
} from '@/data/repo/connections';
import { useStore } from '@/store/AppStore';
import { oklch } from '@/theme/oklch';
import { fonts, radii } from '@/theme/tokens';

import { FLOWS, GITHUB_SCOPES, POSTHOG_SCOPES, type FlowId, type FlowRow, type IntegrationFlowCopy } from './flows';

const REDIRECT = 'hey100://connect';
const INK = '#111111';
const LIME = '#C6F24E';
/** JetBrains Mono 2.304. iOS uses the PostScript name already in the binary. */
const TITLE_FONT = Platform.OS === 'ios' ? 'JetBrainsMono-SemiBold' : 'JetBrainsMono_600SemiBold';
const HEADER_FONT = Platform.OS === 'ios' ? 'JetBrainsMono-Bold' : 'JetBrainsMono_700Bold';
const MONO_MED = Platform.OS === 'ios' ? 'JetBrainsMono-Medium' : 'JetBrainsMono_500Medium';
const BARS: Record<string, number[]> = {
  stripe: [22, 30, 28, 38, 35, 44, 41, 52, 58, 55, 66, 74],
  revenuecat: [30, 34, 33, 40, 46, 44, 50, 49, 57, 61, 66, 70],
  posthog: [18, 22, 27, 25, 33, 38, 36, 45, 52, 57, 63, 71],
};

type Metric = { value: string; label: string };
type Live = {
  account: string;
  badge: string;
  metrics: { exact: Metric[]; range: Metric[] };
  extras?: { exact: Metric[]; range: Metric[] };
};

export function IntegrationFlow({
  visible,
  provider,
  appId,
  appName,
  appIcon,
  appHue,
  onClose,
}: {
  visible: boolean;
  provider: FlowId | null;
  appId: string;
  appName: string;
  appIcon?: string | null;
  appHue?: number;
  onClose: () => void;
}) {
  const flow = provider ? FLOWS[provider] : null;
  const store = useStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [key, setKey] = useState('');
  const [help, setHelp] = useState<'where' | 'safe' | null>(null);
  const [busy, setBusy] = useState(false);
  const [exact, setExact] = useState(false);
  const [countPrivate, setCountPrivate] = useState(true);
  const [projects, setProjects] = useState<RcProject[] | null>(null);
  const [repos, setRepos] = useState<GithubRepo[] | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [live, setLive] = useState<Live | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setStep(1);
    setKey('');
    setHelp(null);
    setBusy(false);
    setExact(false);
    setCountPrivate(true);
    setProjects(null);
    setRepos(null);
    setSignedIn(false);
    setLive(null);
    setError(null);
  }, [visible, provider]);

  if (!visible || !flow) return null;

  const dark = step === 1 ? flow.step1Dark : step === 2 ? flow.step2Dark : false;
  const bg = step === 1 ? flow.step1Bg : step === 2 ? flow.step2Bg : '#0E100F';
  const ink = step === 3 || dark ? '#FFFFFF' : INK;
  const muted = step === 3 || dark ? 'rgba(255,255,255,0.78)' : 'rgba(17,17,17,0.72)';

  const trimmed = key.trim();
  const prefix = flow.prefix ?? '';
  const keyOk = !prefix || (trimmed.startsWith(prefix) && trimmed.length > 12);
  const keyBad = !!prefix && trimmed.length > 3 && !trimmed.startsWith(prefix);
  const keyMsg = keyBad
    ? `That doesn't look right. ${flow.name} keys here start with ${prefix}`
    : keyOk && trimmed
      ? "Looks good. We'll check it when you connect."
      : `Paste the key from your ${flow.name} dashboard.`;

  const finish = (snap: AppConnectionSnapshot, account: string) => {
    store.setAppConnection(appId, flow.id, snapshotToConnection(flow.id, snap));
    setLive(liveFrom(flow, snap, account, appName));
    setStep(3);
  };

  const connectKey = () => {
    if (!keyOk || busy) return;
    setBusy(true);
    if (flow.id === 'stripe') {
      void connectStripe(appId, trimmed)
        .then((snap) => finish(snap, appName))
        .catch((err) => setError(err instanceof Error ? err.message : 'Key was rejected'))
        .finally(() => setBusy(false));
      return;
    }
    void listRevenueCatProjects(appId, trimmed)
      .then((data) => {
        if (data.projects.length === 1) {
          const project = data.projects[0];
          return connectRevenueCat(appId, trimmed, project.id, project.name).then((snap) =>
            finish(snap, project.name),
          );
        }
        setProjects(data.projects);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Key was rejected'))
      .finally(() => setBusy(false));
  };

  const pickProject = (project: RcProject) => {
    setBusy(true);
    const run =
      flow.id === 'posthog'
        ? connectPosthog(appId, project.id, project.name)
        : connectRevenueCat(appId, trimmed, project.id, project.name);
    void run
      .then((snap) =>
        finish(snap, flow.id === 'posthog' ? `${project.name} · project ${project.id}` : project.name),
      )
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not read that project'))
      .finally(() => setBusy(false));
  };

  const signInPosthog = () => {
    if (busy) return;
    setBusy(true);
    void startPosthog(appId)
      .then(async ({ url }) => {
        const result = await WebBrowser.openAuthSessionAsync(url, REDIRECT);
        if (result.type !== 'success') return;
        const params = new URL(result.url).searchParams;
        if (params.get('status') !== 'ok') {
          setError(params.get('reason') || 'PostHog did not finish signing in');
          return;
        }
        const listed = await listPosthogProjects(appId);
        if (listed.projects.length === 1) {
          const project = listed.projects[0];
          const snap = await connectPosthog(appId, project.id, project.name);
          finish(snap, `${project.name} · project ${project.id}`);
          return;
        }
        if (!listed.projects.length) {
          setError('No PostHog projects were available on that account');
          return;
        }
        setProjects(listed.projects);
        setSignedIn(true);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'PostHog sign-in failed'))
      .finally(() => setBusy(false));
  };

  const signInGithub = () => {
    if (busy) return;
    setBusy(true);
    void startGithub(appId)
      .then(async ({ url }) => {
        const result = await WebBrowser.openAuthSessionAsync(url, REDIRECT);
        if (result.type !== 'success') return;
        const params = new URL(result.url).searchParams;
        if (params.get('next') !== 'repos' && params.get('status') !== 'ok') {
          setError('GitHub did not finish signing in');
          return;
        }
        const listed = await listGithubRepos(appId);
        setRepos(listed.repos);
        setSignedIn(true);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'GitHub is not configured yet'))
      .finally(() => setBusy(false));
  };

  const pickRepo = (repo: GithubRepo) => {
    setBusy(true);
    void selectGithubRepo(appId, repo.fullName)
      .then((snap) => finish(snap, repo.private && countPrivate ? 'Private repo' : repo.fullName))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not read that repo'))
      .finally(() => setBusy(false));
  };

  const visibleRepos = (repos ?? []).filter((repo) => countPrivate || !repo.private);

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 12,
            paddingHorizontal: 20,
            paddingTop: 6,
            paddingBottom: 4,
          }}
        >
          {step === 3 ? (
            <View style={{ width: 40, height: 40 }} />
          ) : (
            <WizardButton
              icon={step === 1 ? 'close' : 'arrow-back'}
              label={step === 1 ? 'Close' : 'Back'}
              onPress={() => {
                setHelp(null);
                if (step === 1) onClose();
                else setStep(1);
              }}
            />
          )}
          <View style={{ flex: 1, flexDirection: 'row', gap: 5, marginTop: 16 }}>
            {[1, 2, 3].map((n) => {
              const onDark = step === 3 || (step === 1 && flow.step1Dark);
              return (
                <View
                  key={n}
                  style={{
                    flex: 1,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor:
                      n <= step
                        ? onDark
                          ? LIME
                          : INK
                        : onDark
                          ? 'rgba(255,255,255,0.22)'
                          : 'rgba(17,17,17,0.15)',
                  }}
                />
              );
            })}
          </View>
          <Txt
            size={12}
            color={step === 2 ? INK : ink}
            style={{ minWidth: 30, marginTop: 10, textAlign: 'right', fontFamily: HEADER_FONT }}
          >
            {step}/3
          </Txt>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16, gap: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 ? (
            <WhyStep flow={flow} ink={ink} muted={muted} appName={appName} appIcon={appIcon} appHue={appHue} />
          ) : null}
          {step === 2 && (flow.id === 'stripe' || flow.id === 'revenuecat') ? (
            <KeyStep
              flow={flow}
              ink={ink}
              muted={muted}
              value={key}
              onChange={setKey}
              border={keyBad ? '#FF0000' : keyOk && trimmed ? INK : 'rgba(17,17,17,0.25)'}
              message={keyMsg}
              messageColor={keyBad ? '#C20000' : '#3D423E'}
              onPaste={() => {
                void Clipboard.getStringAsync().then((text) => {
                  if (text.trim()) setKey(text.trim());
                  else setError('Copy the key first');
                });
              }}
            />
          ) : null}
          {step === 2 && flow.id === 'posthog' ? <PosthogStep ink={ink} /> : null}
          {step === 2 && flow.id === 'github' ? (
            <GithubStep
              ink={ink}
              muted={muted}
              countPrivate={countPrivate}
              onTogglePrivate={() => setCountPrivate((on) => !on)}
              repos={signedIn ? visibleRepos : null}
              busy={busy}
              onPick={pickRepo}
            />
          ) : null}
          {step === 2 && projects && projects.length > 1 ? (
            <View style={{ gap: 8 }}>
              <Txt size={12} weight={700} color={muted}>
                PICK A PROJECT
              </Txt>
              {projects.map((project) => (
                <Pressable
                  key={project.id}
                  disabled={busy}
                  onPress={() => pickProject(project)}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: radii.card,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                  }}
                >
                  <Txt size={15} weight={700} color={INK}>
                    {project.name}
                  </Txt>
                </Pressable>
              ))}
            </View>
          ) : null}
          {step === 3 && live ? (
            <ResultStep
              flow={flow}
              live={live}
              exact={exact}
              onExact={setExact}
              onJoin={() => {
                onClose();
                router.push({ pathname: '/(tabs)/chat', params: { desk: 'community' } });
              }}
            />
          ) : null}

          {step === 2 ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <HelpButton label={flow.whereLabel} icon="?" onPress={() => setHelp('where')} />
              <HelpButton label="Is this safe?" icon="shield" onPress={() => setHelp('safe')} />
            </View>
          ) : null}
        </ScrollView>

        <View style={{ paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 12), gap: 8 }}>
          {step === 1 ? (
            <FlowButton
              label={`Connect ${flow.name}`}
              bg={flow.step1Dark ? LIME : INK}
              fg={flow.step1Dark ? INK : '#FFFFFF'}
              onPress={() => setStep(2)}
            />
          ) : null}
          {step === 2 && busy ? (
            <FlowButton label="Connecting…" bg={INK} fg="#FFFFFF" loading disabled onPress={() => {}} />
          ) : null}
          {step === 2 && !busy && (flow.id === 'stripe' || flow.id === 'revenuecat') ? (
            <FlowButton
              label="Connect"
              bg={INK}
              fg="#FFFFFF"
              disabled={!keyOk}
              onPress={connectKey}
            />
          ) : null}
          {step === 2 && !busy && flow.id === 'posthog' && !signedIn ? (
            <FlowButton
              label="Sign in with PostHog"
              bg={INK}
              fg="#FFFFFF"
              onPress={signInPosthog}
            />
          ) : null}
          {step === 2 && !busy && flow.id === 'github' && !signedIn ? (
            <FlowButton
              label="Sign in with GitHub"
              bg={INK}
              fg="#FFFFFF"
              icon="logo-github"
              onPress={signInGithub}
            />
          ) : null}
          {step === 3 ? (
            <>
              <FlowButton label="Done" bg={LIME} fg={INK} onPress={onClose} />
              <Pressable onPress={onClose} accessibilityRole="button" style={{ paddingVertical: 10 }}>
                <Txt size={15} weight={700} color="#FFFFFF" center style={{ textDecorationLine: 'underline' }}>
                  Connect another
                </Txt>
              </Pressable>
            </>
          ) : null}
        </View>

        {help && step === 2 ? (
          <HelpSheet
            title={help === 'safe' ? 'Is this safe?' : flow.whereTitle}
            safe={help === 'safe'}
            rows={help === 'safe' ? flow.safe : flow.where}
            link={help === 'where' ? flow.whereLink : undefined}
            href={help === 'where' ? flow.whereHref : undefined}
            onClose={() => setHelp(null)}
          />
        ) : null}
        {error ? (
          <Txt size={13.5} weight={700} color="#C20000" style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
            {error}
          </Txt>
        ) : null}
      </View>
    </Modal>
  );
}

function WizardButton({
  icon,
  label,
  onPress,
}: {
  icon: 'close' | 'arrow-back';
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ width: 40, height: 43 }}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 3,
          height: 40,
          borderRadius: 20,
          backgroundColor: '#111111',
        }}
      />
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: '#FFFFFF',
          borderWidth: 2,
          borderColor: '#111111',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={18} color="#111111" />
      </View>
    </Pressable>
  );
}

function PartnerMarks({
  flow,
  appName,
  appIcon,
  appHue,
}: {
  flow: IntegrationFlowCopy;
  appName: string;
  appIcon?: string | null;
  appHue?: number;
}) {
  return (
    <View style={{ width: 170, height: 124 }}>
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 12,
          width: 100,
          height: 100,
          borderRadius: 26,
          backgroundColor: '#111111',
          transform: [{ rotate: '-7deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 6,
          width: 100,
          height: 100,
          borderRadius: 26,
          backgroundColor: flow.id === 'posthog' ? '#FFFFFF' : flow.brand,
          borderWidth: 2,
          borderColor: '#111111',
          transform: [{ rotate: '-7deg' }],
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {flow.id === 'stripe' || flow.id === 'posthog' ? (
          <Image
            source={
              flow.id === 'stripe'
                ? require('../../../../assets/images/stripe-icon.png')
                : require('../../../../assets/images/posthog-icon.png')
            }
            style={{ width: 100, height: 100 }}
            contentFit="cover"
          />
        ) : flow.id === 'github' ? (
          <Ionicons name="logo-github" size={56} color="#FFFFFF" />
        ) : (
          <Txt size={flow.glyph.length > 1 ? 40 : 58} weight={700} color="#FFFFFF">
            {flow.glyph}
          </Txt>
        )}
      </View>
      <View
        style={{
          position: 'absolute',
          left: 98,
          top: 36,
          width: 62,
          height: 62,
          borderRadius: 18,
          backgroundColor: '#111111',
          transform: [{ rotate: '8deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 96,
          top: 30,
          width: 66,
          height: 66,
          borderRadius: 18,
          borderWidth: 2,
          borderColor: '#111111',
          backgroundColor: '#111111',
          overflow: 'hidden',
          transform: [{ rotate: '8deg' }],
        }}
      >
        <AppIcon hue={appHue ?? 140} name={appName} uri={appIcon} size={62} />
      </View>
      <View
        style={{
          position: 'absolute',
          left: 78,
          top: 50,
          zIndex: 2,
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: '#FFFFFF',
          borderWidth: 2,
          borderColor: '#111111',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="swap-horizontal" size={16} color="#111111" />
      </View>
    </View>
  );
}

function WhyStep({
  flow,
  ink,
  muted,
  appName,
  appIcon,
  appHue,
}: {
  flow: IntegrationFlowCopy;
  ink: string;
  muted: string;
  appName: string;
  appIcon?: string | null;
  appHue?: number;
}) {
  return (
    <View style={{ gap: 16 }}>
      <PartnerMarks flow={flow} appName={appName} appIcon={appIcon} appHue={appHue} />
      <Txt size={11} color={ink} style={{ letterSpacing: 1.1, fontFamily: HEADER_FONT }}>
        {flow.kicker}
      </Txt>
      <Txt size={30} color={ink} lh={1.1} style={{ letterSpacing: -1.5, fontFamily: TITLE_FONT }}>
        {flow.title}
      </Txt>
      <Txt size={16} lh={1.4} color={ink}>
        {flow.what}
      </Txt>
      <View style={{ gap: 10, paddingBottom: 6 }}>
        {flow.whys.map((why) => (
          <View key={why.text}>
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 4,
                bottom: -4,
                borderRadius: 18,
                backgroundColor: '#111111',
              }}
            />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                backgroundColor: '#FFFFFF',
                borderRadius: 18,
                borderWidth: 2,
                borderColor: '#111111',
                paddingHorizontal: 14,
                paddingVertical: 12,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  backgroundColor: why.color,
                  borderWidth: 2,
                  borderColor: '#111111',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Txt size={14} weight={700} color={INK}>
                  {why.icon}
                </Txt>
              </View>
              <Txt size={14.5} weight={600} color={INK} style={{ flex: 1 }}>
                {why.text}
              </Txt>
            </View>
          </View>
        ))}
      </View>
      <View style={{ gap: 8 }}>
        <Txt size={11} weight={700} color={muted} style={{ letterSpacing: 1 }}>
          WHAT SHOWS ON YOUR PROFILE
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {flow.shows.map((item) => (
            <View
              key={item}
              style={{
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: ink,
                paddingHorizontal: 11,
                paddingVertical: 6,
              }}
            >
              <Txt size={12.5} weight={600} color={ink}>
                {item}
              </Txt>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function KeyStep({
  flow,
  ink,
  muted,
  value,
  onChange,
  border,
  message,
  messageColor,
  onPaste,
}: {
  flow: IntegrationFlowCopy;
  ink: string;
  muted: string;
  value: string;
  onChange: (value: string) => void;
  border: string;
  message: string;
  messageColor: string;
  onPaste: () => void;
}) {
  return (
    <View style={{ gap: 18 }}>
      <View style={{ gap: 10 }}>
        <Txt size={11} color={ink} style={{ letterSpacing: 1.1, fontFamily: HEADER_FONT }}>
          {flow.kicker2}
        </Txt>
        <Txt size={30} color={ink} lh={1.1} style={{ letterSpacing: -1.5, fontFamily: TITLE_FONT }}>
          {flow.title2}
        </Txt>
        <Txt size={16} lh={1.45} color="rgba(17,17,17,0.78)">
          {flow.sub2}
        </Txt>
      </View>
      <View style={{ marginBottom: 5 }}>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 5,
            bottom: -5,
            borderRadius: 22,
            backgroundColor: '#111111',
          }}
        />
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 22,
            borderWidth: 2,
            borderColor: '#111111',
            padding: 16,
            gap: 10,
          }}
        >
          <Txt font="mono" size={11} weight={700} color="#5B625C" style={{ letterSpacing: 1.1 }}>
            {flow.keyLabel}
          </Txt>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              height: 56,
              paddingLeft: 14,
              paddingRight: 6,
              borderRadius: 15,
              borderWidth: 2,
              borderColor: border,
              backgroundColor: '#F4F5F1',
            }}
          >
            <TextInput
              value={value}
              onChangeText={onChange}
              placeholder={flow.keyPlaceholder}
              placeholderTextColor="#8E968F"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              style={{
                flex: 1,
                color: INK,
                fontSize: 15,
                fontFamily: fonts.monoSemi,
                paddingVertical: 0,
              }}
            />
            <Pressable
              onPress={onPaste}
              accessibilityRole="button"
              style={{
                height: 40,
                paddingHorizontal: 13,
                borderRadius: 11,
                backgroundColor: INK,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Txt size={13} weight={700} color="#FFFFFF">
                Paste
              </Txt>
            </Pressable>
          </View>
          <Txt size={12.5} lh={1.4} color={messageColor}>
            {message}
          </Txt>
        </View>
      </View>
    </View>
  );
}

function PosthogStep({ ink }: { ink: string }) {
  const flow = FLOWS.posthog;
  return (
    <View style={{ gap: 18 }}>
      <View style={{ gap: 10 }}>
        <Txt size={11} color={ink} style={{ letterSpacing: 1.1, fontFamily: HEADER_FONT }}>
          {flow.kicker2}
        </Txt>
        <Txt size={30} color={ink} lh={1.1} style={{ letterSpacing: -1.5, fontFamily: TITLE_FONT }}>
          {flow.title2}
        </Txt>
        <Txt size={16} lh={1.45} color="rgba(17,17,17,0.78)">
          {flow.sub2}
        </Txt>
      </View>
      <View style={{ marginBottom: 5 }}>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 5,
            bottom: -5,
            borderRadius: 22,
            backgroundColor: '#111111',
          }}
        />
        <View
          style={{
            padding: 16,
            borderRadius: 22,
            backgroundColor: '#FFFFFF',
            borderWidth: 2,
            borderColor: '#111111',
            gap: 12,
          }}
        >
          <Txt size={10.5} color="#5B625C" style={{ letterSpacing: 1.05, fontFamily: HEADER_FONT }}>
            HEY100 WILL BE ABLE TO
          </Txt>
          {POSTHOG_SCOPES.map((scope) => (
            <View key={scope.text} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <View
                style={{
                  width: 22,
                  height: 22,
                  marginTop: 1,
                  borderRadius: 11,
                  backgroundColor: scope.strong ? LIME : '#FFFFFF',
                  borderWidth: 1.5,
                  borderColor: '#111111',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Txt size={11} weight={700} color={INK}>
                  {scope.icon}
                </Txt>
              </View>
              <Txt size={14} weight={scope.strong ? 600 : 500} color={ink} lh={1.4} style={{ flex: 1 }}>
                {scope.text}
              </Txt>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function GithubStep({
  ink,
  muted,
  countPrivate,
  onTogglePrivate,
  repos,
  busy,
  onPick,
}: {
  ink: string;
  muted: string;
  countPrivate: boolean;
  onTogglePrivate: () => void;
  repos: GithubRepo[] | null;
  busy: boolean;
  onPick: (repo: GithubRepo) => void;
}) {
  const flow = FLOWS.github;
  return (
    <View style={{ gap: 18 }}>
      <View style={{ gap: 10 }}>
        <Txt size={11} color={ink} style={{ letterSpacing: 1.1, fontFamily: HEADER_FONT }}>
          {flow.kicker2}
        </Txt>
        <Txt size={30} color={ink} lh={1.1} style={{ letterSpacing: -1.5, fontFamily: TITLE_FONT }}>
          {flow.title2}
        </Txt>
        <Txt size={16} lh={1.45} color="rgba(17,17,17,0.78)">
          {flow.sub2}
        </Txt>
      </View>
      <View style={{ marginBottom: 5 }}>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 5,
            bottom: -5,
            borderRadius: 22,
            backgroundColor: '#111111',
          }}
        />
        <View
          style={{
            padding: 16,
            borderRadius: 22,
            backgroundColor: '#FFFFFF',
            borderWidth: 2,
            borderColor: '#111111',
            gap: 12,
          }}
        >
          <Txt size={10.5} color="#5B625C" style={{ letterSpacing: 1.05, fontFamily: HEADER_FONT }}>
            HEY100 WILL BE ABLE TO
          </Txt>
          {GITHUB_SCOPES.map((scope) => (
            <View key={scope.text} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <View
                style={{
                  width: 22,
                  height: 22,
                  marginTop: 1,
                  borderRadius: 11,
                  backgroundColor: scope.strong ? LIME : '#FFFFFF',
                  borderWidth: 1.5,
                  borderColor: '#111111',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Txt size={11} weight={700} color={INK}>
                  {scope.icon}
                </Txt>
              </View>
              <Txt size={14} weight={scope.strong ? 600 : 500} color={ink} lh={1.4} style={{ flex: 1 }}>
                {scope.text}
              </Txt>
            </View>
          ))}
          <Pressable
            onPress={onTogglePrivate}
            accessibilityRole="switch"
            accessibilityState={{ checked: countPrivate }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingTop: 12,
              borderTopWidth: 1.5,
              borderColor: 'rgba(17,17,17,0.1)',
            }}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Txt size={14} weight={700} color={INK}>
                Count private repo commits
              </Txt>
              <Txt size={12.5} color="#5B625C">
                Counts only. Repo names stay hidden.
              </Txt>
            </View>
            <View
              style={{
                width: 50,
                height: 30,
                borderRadius: 15,
                borderWidth: 2,
                borderColor: '#111111',
                backgroundColor: countPrivate ? LIME : '#E6E8E2',
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  top: 2,
                  left: countPrivate ? 22 : 2,
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1.5,
                  borderColor: '#111111',
                }}
              />
            </View>
          </Pressable>
        </View>
      </View>
      {repos ? (
        <View style={{ gap: 8 }}>
          <Txt size={12} weight={700} color={muted}>
            PICK A REPO TO COUNT
          </Txt>
          {repos.map((repo) => (
            <Pressable
              key={repo.fullName}
              disabled={busy}
              onPress={() => onPick(repo)}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: radii.card,
                paddingHorizontal: 14,
                paddingVertical: 12,
              }}
            >
              <Txt size={15} weight={700} color={INK}>
                {repo.fullName}
              </Txt>
              <Txt size={12} color="#3D423E">
                {repo.private ? 'Private' : 'Public'}
                {busy ? ' · reading commits…' : ''}
              </Txt>
            </Pressable>
          ))}
          {!repos.length ? (
            <Txt size={14} color={ink}>
              No repos to count with this setting.
            </Txt>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function ResultStep({
  flow,
  live,
  exact,
  onExact,
  onJoin,
}: {
  flow: IntegrationFlowCopy;
  live: Live;
  exact: boolean;
  onExact: (exact: boolean) => void;
  onJoin: () => void;
}) {
  const metrics = exact ? live.metrics.exact : live.metrics.range;
  const bars = BARS[flow.id];
  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 52, height: 56 }}>
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: 4,
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: '#000000',
              transform: [{ rotate: '-6deg' }],
            }}
          />
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: LIME,
              borderWidth: 2,
              borderColor: '#111111',
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ rotate: '-6deg' }],
            }}
          >
            <Ionicons name="checkmark" size={26} color={INK} />
          </View>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt size={25} color="#FFFFFF" lh={1.1} style={{ letterSpacing: -1.25, fontFamily: TITLE_FONT }}>
            {flow.name} connected
          </Txt>
          <Txt size={12} color="#8E968F" style={{ fontFamily: MONO_MED }}>
            {flow.sync}
          </Txt>
        </View>
      </View>

      <View style={{ marginBottom: 5 }}>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 5,
            bottom: -5,
            borderRadius: 22,
            backgroundColor: flow.brand,
          }}
        />
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 22,
            borderWidth: 2,
            borderColor: '#111111',
            padding: 16,
            gap: 14,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: 9,
                backgroundColor: flow.brand,
                borderWidth: 1.5,
                borderColor: '#111111',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {flow.id === 'stripe' ? (
                <Image
                  source={require('../../../../assets/images/stripe-icon.png')}
                  style={{ width: 30, height: 30 }}
                  contentFit="cover"
                />
              ) : flow.id === 'github' ? (
                <Ionicons name="logo-github" size={16} color="#FFFFFF" />
              ) : (
                <Txt size={11} weight={700} color="#FFFFFF">
                  {flow.glyph}
                </Txt>
              )}
            </View>
            <Txt size={14} weight={700} color={INK} style={{ flex: 1 }} numberOfLines={1}>
              {live.account}
            </Txt>
            <Txt size={10} color="#5B625C" style={{ letterSpacing: 0.8, fontFamily: HEADER_FONT }}>
              {flow.period}
            </Txt>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {metrics.map((metric) => (
              <View
                key={metric.label}
                style={{ flex: 1, gap: 2, padding: 10, borderRadius: 13, backgroundColor: '#F4F5F1' }}
              >
                <Txt size={17} color={INK} numberOfLines={1} style={{ letterSpacing: -0.5, fontFamily: HEADER_FONT }}>
                  {metric.value}
                </Txt>
                <Txt size={10.5} color="#5B625C" lh={1.3}>
                  {metric.label}
                </Txt>
              </View>
            ))}
          </View>
          {bars ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 70 }}>
              {bars.map((height, index) => (
                <View
                  key={`${height}-${index}`}
                  style={{
                    flex: 1,
                    height: Math.round(66 * (height / 100)),
                    borderTopLeftRadius: 4,
                    borderTopRightRadius: 4,
                    borderBottomLeftRadius: 2,
                    borderBottomRightRadius: 2,
                    backgroundColor: index === bars.length - 1 ? LIME : '#FFFFFF',
                    borderWidth: 1.5,
                    borderColor: '#111111',
                  }}
                />
              ))}
            </View>
          ) : (
            <GithubActivity account={live.account} commits={metrics[0]?.value} />
          )}
          {live.extras ? (
            <View style={{ gap: 7, paddingTop: 10, borderTopWidth: 1.5, borderColor: 'rgba(17,17,17,0.1)' }}>
              {(exact ? live.extras.exact : live.extras.range).map((row) => (
                <View key={row.label} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Txt size={13} weight={600} color={INK} style={{ flex: 1 }}>
                    {row.label}
                  </Txt>
                  <Txt size={12.5} color={INK} style={{ fontFamily: HEADER_FONT }}>
                    {row.value}
                  </Txt>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          padding: 4,
          borderRadius: 15,
          backgroundColor: '#1E211F',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.12)',
        }}
      >
        {(
          [
            [false, 'Show ranges'],
            [true, 'Show exact numbers'],
          ] as const
        ).map(([value, label]) => {
          const on = exact === value;
          return (
            <Pressable
              key={label}
              onPress={() => onExact(value)}
              style={{
                flex: 1,
                height: 38,
                borderRadius: 11,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: on ? LIME : 'transparent',
              }}
            >
              <Txt size={13} weight={700} color={on ? INK : '#C9CEC8'}>
                {label}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: 8 }}>
        <Txt size={11} color="#8E968F" style={{ letterSpacing: 1.1, fontFamily: HEADER_FONT }}>
          ON YOUR PROFILE
        </Txt>
        <View style={{ alignSelf: 'flex-start', marginBottom: 4, transform: [{ rotate: '-1.5deg' }] }}>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 4,
              bottom: -4,
              borderRadius: 20,
              backgroundColor: LIME,
            }}
          />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingVertical: 8,
              paddingRight: 14,
              paddingLeft: 8,
              borderRadius: 20,
              backgroundColor: '#FFFFFF',
              borderWidth: 2,
              borderColor: '#111111',
            }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: LIME,
                borderWidth: 1.5,
                borderColor: '#111111',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="checkmark" size={14} color={INK} />
            </View>
            <Txt size={13.5} weight={700} color={INK}>
              {live.badge}
            </Txt>
          </View>
        </View>
      </View>

      <View style={{ marginBottom: 4 }}>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 4,
            bottom: -4,
            borderRadius: 20,
            backgroundColor: '#000000',
          }}
        />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingVertical: 13,
            paddingHorizontal: 14,
            borderRadius: 20,
            backgroundColor: flow.groupColor,
            borderWidth: 2,
            borderColor: '#111111',
          }}
        >
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: '#111111',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Txt size={15} color={flow.groupColor} style={{ fontFamily: fonts.logo }}>
              {flow.groupInitial}
            </Txt>
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <Txt size={10} color={INK} style={{ letterSpacing: 1, fontFamily: HEADER_FONT }}>
              UNLOCKED GROUP
            </Txt>
            <Txt size={15} weight={700} color={INK}>
              {flow.group}
            </Txt>
            <Txt size={12} color={INK}>
              {flow.groupMeta}
            </Txt>
          </View>
          <Pressable
            onPress={onJoin}
            accessibilityRole="button"
            style={{
              height: 32,
              paddingHorizontal: 13,
              borderRadius: 16,
              backgroundColor: '#111111',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Txt size={12.5} weight={700} color="#FFFFFF">
              Join
            </Txt>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function GithubActivity({ account, commits }: { account: string; commits?: string }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 3 }}>
        {Array.from({ length: 17 }, (_, col) => (
          <View key={col} style={{ flex: 1, gap: 3 }}>
            {Array.from({ length: 5 }, (_, row) => {
              const i = row * 17 + col;
              const v = (i * 37 + (i % 7) * 11) % 10;
              const color = v < 2 ? '#E6E8E2' : v < 5 ? oklch(0.9, 0.12, 128) : v < 8 ? LIME : oklch(0.6, 0.15, 135);
              return <View key={row} style={{ aspectRatio: 1, borderRadius: 3, backgroundColor: color }} />;
            })}
          </View>
        ))}
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingTop: 10,
          borderTopWidth: 1.5,
          borderColor: 'rgba(17,17,17,0.1)',
        }}
      >
        <Txt size={12.5} color={INK} style={{ flex: 1, fontFamily: TITLE_FONT }} numberOfLines={1}>
          {account}
        </Txt>
        {commits ? (
          <Txt size={12} color={INK} style={{ fontFamily: HEADER_FONT }}>
            {commits}
          </Txt>
        ) : null}
      </View>
    </View>
  );
}

function HelpButton({ label, icon, onPress }: { label: string; icon: '?' | 'shield'; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 46,
        borderRadius: 23,
        borderWidth: 2,
        borderColor: '#111111',
        backgroundColor: 'transparent',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        paddingHorizontal: 10,
        paddingVertical: 8,
      }}
    >
      {icon === '?' ? (
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: '#111111',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Txt size={11} weight={700} color="#FFFFFF">
            ?
          </Txt>
        </View>
      ) : (
        <Ionicons name="shield-checkmark-outline" size={17} color="#111111" />
      )}
      <Txt size={14} weight={700} color={INK} center style={{ flexShrink: 1 }}>
        {label}
      </Txt>
    </Pressable>
  );
}

function HelpSheet({
  title,
  safe,
  rows,
  link,
  href,
  onClose,
}: {
  title: string;
  safe: boolean;
  rows: FlowRow[];
  link?: string;
  href?: string;
  onClose: () => void;
}) {
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 0, justifyContent: 'flex-end' }}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} onPress={onClose} />
      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          padding: 18,
          gap: 12,
          maxHeight: '78%',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {safe ? (
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: LIME,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Txt size={16} weight={700} color={INK}>
                ✓
              </Txt>
            </View>
          ) : null}
          <Txt size={18} weight={700} color={INK} style={{ flex: 1 }}>
            {title}
          </Txt>
          <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close">
            <Ionicons name="close" size={20} color={INK} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ gap: 10 }} style={{ flexGrow: 0 }}>
          {rows.map((row, index) => (
            <View key={row.title} style={{ flexDirection: 'row', gap: 10 }}>
              {safe ? (
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: LIME,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Txt size={12} weight={700} color={INK}>
                    ✓
                  </Txt>
                </View>
              ) : (
                <Txt size={15} weight={700} color={INK} style={{ width: 18 }}>
                  {index + 1}
                </Txt>
              )}
              <View style={{ flex: 1, gap: 2 }}>
                <Txt size={15} weight={700} color={INK}>
                  {row.title}
                </Txt>
                {row.body ? (
                  <Txt size={13.5} lh={1.4} color="#3D423E">
                    {row.body}
                  </Txt>
                ) : null}
                {row.code ? (
                  <Txt size={13} weight={600} color={INK}>
                    {row.code}
                  </Txt>
                ) : null}
              </View>
            </View>
          ))}
        </ScrollView>
        {link && href ? (
          <Pressable onPress={() => void Linking.openURL(href)} accessibilityRole="link">
            <Txt size={15} weight={700} color={INK}>
              {link} ↗
            </Txt>
          </Pressable>
        ) : null}
        <FlowButton label="Got it" bg={INK} fg="#FFFFFF" onPress={onClose} />
      </View>
    </View>
  );
}

function FlowButton({
  label,
  bg,
  fg,
  onPress,
  disabled,
  loading,
  icon,
}: {
  label: string;
  bg: string;
  fg: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: 'logo-github';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={{ opacity: disabled && !loading ? 0.4 : 1 }}
    >
      <View>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 5,
            bottom: -5,
            borderRadius: 29,
            backgroundColor: '#000000',
          }}
        />
        <View
          style={{
            height: 58,
            borderRadius: 29,
            borderWidth: 2,
            borderColor: '#111111',
            backgroundColor: bg,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {loading ? <ActivityIndicator color={fg} /> : icon ? <Ionicons name={icon} size={21} color={fg} /> : null}
          <Txt size={17} weight={700} color={fg}>
            {label}
          </Txt>
        </View>
      </View>
    </Pressable>
  );
}

function percentBand(n: number): string {
  if (n <= 0) return '0%';
  if (n < 10) return 'under 10%';
  return `${Math.floor(n / 10) * 10}%+`;
}

function countBand(n: number): string {
  if (n < 10) return '1–10';
  if (n < 50) return '10–50';
  if (n < 100) return '50–100';
  if (n < 500) return '100–500';
  if (n < 1000) return '500–1k';
  return '1k+';
}

function moneyBand(usd: number): string {
  if (usd < 100) return '$1–100';
  if (usd < 1000) return '$100–1k';
  if (usd < 5000) return '$1k–5k';
  if (usd < 10000) return '$5k–10k';
  return '$10k+';
}

function moneyExact(usd: number): string {
  return `$${Math.round(usd).toLocaleString()}`;
}

function pair(exact: string, range: string, label: string): { exact: Metric; range: Metric } {
  return { exact: { value: exact, label }, range: { value: range, label } };
}

function liveFrom(flow: IntegrationFlowCopy, snap: AppConnectionSnapshot, account: string, appName: string): Live {
  const raw = snap.snapshot ?? {};
  const num = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null);
  const metrics: { exact: Metric; range: Metric }[] = [];

  if (flow.id === 'stripe') {
    const mrr = num(raw.mrr);
    const customers = num(raw.subscriptions);
    const sales = num(raw.revenue_30d);
    if (mrr != null) metrics.push(pair(moneyExact(mrr), mrr > 0 ? moneyBand(mrr) : '$0', 'MRR'));
    if (customers != null) {
      metrics.push(pair(customers.toLocaleString(), customers > 0 ? countBand(customers) : '0', 'paying customers'));
    }
    if (sales != null) metrics.push(pair(moneyExact(sales), sales > 0 ? moneyBand(sales) : '$0', 'sales'));
  } else if (flow.id === 'posthog') {
    const mau = num(raw.mau);
    const wau = num(raw.wau);
    const d7 = num(raw.d7);
    const sessions = num(raw.sessions);
    const dau = num(raw.dau);
    const stick = num(raw.stickiness);
    if (mau != null) metrics.push(pair(mau.toLocaleString(), mau > 0 ? countBand(mau) : '0', 'monthly active'));
    if (wau != null) metrics.push(pair(wau.toLocaleString(), wau > 0 ? countBand(wau) : '0', 'weekly active'));
    if (d7 != null) metrics.push(pair(`${d7}%`, percentBand(d7), 'D7 retention'));
    const extras =
      sessions != null || dau != null || stick != null
        ? [
            sessions != null
              ? pair(sessions.toLocaleString(), sessions > 0 ? countBand(sessions) : '0', 'Sessions · 30d')
              : null,
            dau != null ? pair(dau.toLocaleString(), dau > 0 ? countBand(dau) : '0', 'Daily active (avg)') : null,
            stick != null ? pair(`${stick}%`, percentBand(stick), 'Stickiness (DAU/MAU)') : null,
          ].filter((item): item is { exact: Metric; range: Metric } => !!item)
        : [];
    if (!metrics.length) metrics.push(pair(snap.label || 'Connected', snap.label || 'Connected', 'verified'));
    return {
      account: account || appName,
      badge: snap.badge,
      metrics: {
        exact: metrics.map((item) => item.exact),
        range: metrics.map((item) => item.range),
      },
      ...(extras.length
        ? {
            extras: {
              exact: extras.map((item) => item.exact),
              range: extras.map((item) => item.range),
            },
          }
        : {}),
    };
  } else if (flow.id === 'revenuecat') {
    const revenue = num(raw.mrr) ?? num(raw.revenue);
    const subs = num(raw.subscriptions);
    const customers = num(raw.customers);
    if (revenue != null) metrics.push(pair(moneyExact(revenue), revenue > 0 ? moneyBand(revenue) : '$0', 'revenue'));
    if (subs != null) metrics.push(pair(subs.toLocaleString(), subs > 0 ? countBand(subs) : '0', 'active subs'));
    if (customers != null) {
      metrics.push(pair(customers.toLocaleString(), customers > 0 ? countBand(customers) : '0', 'customers'));
    }
  } else {
    const recent = num(raw.commits_30d);
    const total = num(raw.commits_total);
    if (recent != null) metrics.push(pair(recent.toLocaleString(), recent > 0 ? countBand(recent) : '0', 'commits'));
    if (total != null) metrics.push(pair(total.toLocaleString(), total > 0 ? countBand(total) : '0', 'all-time'));
  }

  if (!metrics.length) {
    metrics.push(pair(snap.label || 'Connected', snap.label || 'Connected', 'verified'));
  }

  return {
    account: account || appName,
    badge: snap.badge,
    metrics: {
      exact: metrics.map((item) => item.exact),
      range: metrics.map((item) => item.range),
    },
  };
}
