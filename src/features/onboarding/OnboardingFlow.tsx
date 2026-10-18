import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Progress } from '@/components/ui/Progress';
import { Sheet } from '@/components/ui/Sheet';
import { Txt } from '@/components/ui/Txt';
import { useToast } from '@/components/ui/Toast';
import { DEFAULT_LAYOUT, stripEmoji } from '@/data/mock';
import { promptLabel } from '@/data/prompts';
import { checkInviteCode, redeemInvite } from '@/data/repo/invites';
import { queryKeys } from '@/data/repo/keys';
import { createListing, isListingLimitError } from '@/data/repo/listings';
import { updateMyProfile } from '@/data/repo/profile';
import { toListingInsert } from '@/features/apps/mapListing';
import { uploadAsset, uploadShots } from '@/features/apps/uploadShots';
import { useAuth } from '@/features/auth/AuthProvider';
import { SignInError, signIn } from '@/features/auth/signIn';
import { pickAvatar, uploadAvatar } from '@/features/profile/avatar';
import { captureEvent } from '@/lib/analytics';
import { useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { SPLASH_BG, layout, radii } from '@/theme/tokens';
import type { OwnedApp, ShotLayout } from '@/data/types';

import { ADD_APP_RANGE, LAST_STEP, STEPS } from './steps';
import { useOnboardingDraft } from './useOnboardingDraft';
import { useUsernameState } from './useUsernameState';
import { AddAppStep } from './steps/AddAppStep';
import { AuthStep, ProviderButtons, type AuthProvider } from './steps/AuthStep';
import { CheckStep } from './steps/CheckStep';
import { InviteStep } from './steps/InviteStep';
import { MediaStep } from './steps/MediaStep';
import { PickStep } from './steps/PickStep';
import { PromptPicker, PromptsStep, WriteAnswer } from './steps/PromptsStep';
import { SummaryStep, type SummaryRow } from './steps/SummaryStep';
import { TextStep } from './steps/TextStep';
import { UsernameStep } from './steps/UsernameStep';
import { WelcomeStep } from './steps/WelcomeStep';

export type OnboardingMode = 'full' | 'addApp';

const DRAFT_KEY = 'hey100.onboarding-draft';

export function OnboardingFlow({ mode = 'full' }: { mode?: OnboardingMode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c, isDark } = useTheme();
  const toast = useToast();
  const store = useStore();
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const addApp = mode === 'addApp';
  const { draft, ready, update, toggle, picked, isVisible, toggleVisible, clear } =
    useOnboardingDraft(addApp ? ADD_APP_RANGE.first : 0, addApp ? null : DRAFT_KEY);

  // Prompt picker and answer writer are sub-screens of the prompts step.
  const [logIn, setLogIn] = useState(false);
  const [checkingCode, setCheckingCode] = useState(false);
  const [authPending, setAuthPending] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [picker, setPicker] = useState<number | null>(null);
  const [writing, setWriting] = useState<string | null>(null);
  const [promptTag, setPromptTag] = useState('All');
  const [answerDraft, setAnswerDraft] = useState('');
  // Orientation for every screenshot in this listing, picked on the media step.
  const [shotLayout, setShotLayout] = useState<ShotLayout>('vertical');

  const usernameState = useUsernameState(draft.username);

  const step = STEPS[draft.step];
  const lastStep = addApp ? ADD_APP_RANGE.last : LAST_STEP;
  const isWelcome = step.kind === 'welcome';
  const isCheckLike = step.kind === 'check';
  const isSummary = step.kind === 'summary' || step.kind === 'summary2';

  const valid = useMemo(() => {
    switch (step.kind) {
      case 'invite':
        return draft.inviteOk;
      case 'link':
        return draft.fetched;
      case 'username':
        return draft.terms && usernameState !== 'taken' && usernameState !== 'invalid';
      case 'pick':
        return picked(step.group!).length > 0 || !!draft.own[step.group!];
      default:
        return true;
    }
  }, [draft.fetched, draft.inviteOk, draft.own, draft.terms, picked, step, usernameState]);

  const invalidMessage = () => {
    switch (step.kind) {
      case 'invite':
        return 'Redeem an invite code first';
      case 'link':
        return 'Fetch your app first';
      case 'username':
        if (usernameState === 'taken') return 'That username is taken';
        if (usernameState === 'invalid') return 'Pick a valid username';
        return 'Agree to the terms to continue';
      default:
        return 'Pick at least one';
    }
  };

  const goBack = () => {
    if (writing) return setWriting(null);
    if (picker !== null) return setPicker(null);

    if (draft.step <= (addApp ? ADD_APP_RANGE.first : 0)) {
      if (addApp) router.back();
      return;
    }
    update((prev) => ({ step: prev.step - 1 }));
  };

  /** Everything the listing steps collected, in the shape the app renders. */
  const draftListing = (): Partial<OwnedApp> => ({
    name: draft.appName || 'Your app',
    sub: draft.appSub,
    hue: draft.appHue,
    // Shown immediately; the uploaded copy replaces it on the next refetch.
    icon: draft.appIcon || undefined,
    cat: draft.appCats[0] ?? 'Productivity',
    stage: stripEmoji(picked('stage')[0] ?? '🧪 In beta or TestFlight'),
    media: draft.shots.map((shot) => ({
      label: shot.label ?? '',
      video: shot.kind === 'video',
      uri: shot.uri,
    })),
    shotLayout,
    prompts: draft.answered.map((id) => [promptLabel(id), draft.answers[id]] as [string, string]),
    ideal: {
      age: picked('ia').join(', ') || 'Any',
      gender: picked('ig')[0] ?? 'Anyone',
      interests: picked('ii').map(stripEmoji).join(', ') || 'Anyone',
      plat: picked('ip').map(stripEmoji).join(', ') || 'iPhone',
      wants: picked('f').join(', ').toLowerCase() || 'anything',
    },
    links: draft.links.web ? [['Web', draft.links.web]] : [],
    // The first listing is the one heys are attributed to by default.
    primary: !addApp,
    // Stored rather than left empty, so a reorder starts from what was shown.
    layout: [...DEFAULT_LAYOUT],
  });

  /** Fills in what the server owns, so a new listing starts from zero. */
  const asOwnedApp = (id: string, app: Partial<OwnedApp>): OwnedApp => ({
    id,
    name: app.name ?? 'Your app',
    sub: app.sub ?? '',
    cat: app.cat ?? 'Productivity',
    plat: 'iOS',
    stage: app.stage ?? 'Idea',
    hue: app.hue ?? 220,
    icon: app.icon,
    builder: store.user.realName,
    role: '',
    style: '',
    likes: '—',
    trades: 0,
    reply: '—',
    views: 0,
    matches: 0,
    media: app.media ?? [],
    shotLayout: app.shotLayout ?? 'vertical',
    prompts: app.prompts ?? [],
    ideal: app.ideal!,
    badges: [],
    links: app.links ?? [],
    primary: app.primary,
    layout: [...DEFAULT_LAYOUT],
  });

  /**
   * Uploads the icon and the shots, then writes the listing and its children.
   * The icon is copied into our own bucket rather than hotlinked, because store
   * artwork URLs expire and would take the listing's icon with them.
   */
  const publish = async (ownerId: string, app: Partial<OwnedApp>) => {
    const [iconPath, uploaded] = await Promise.all([
      draft.appIcon ? uploadAsset(ownerId, draft.appIcon, 'image', 'icon') : null,
      uploadShots(ownerId, draft.shots),
    ]);

    const media = uploaded.filter((row): row is NonNullable<typeof row> => !!row);

    // Said out loud, because a screenshot that quietly vanished looks like the
    // listing dropped it rather than the upload failing.
    if (media.length < uploaded.length) {
      toast(`${uploaded.length - media.length} screenshot(s) did not upload. Add them again.`);
    }

    return createListing(ownerId, {
      app: {
        ...toListingInsert(app),
        ...(iconPath ? { icon_path: iconPath } : {}),
        ...(draft.storeUrl ? { store_url: draft.storeUrl } : {}),
      },
      prompts: draft.answered.map((id) => ({ promptId: id, answer: draft.answers[id] ?? '' })),
      media,
    });
  };

  /**
   * Publishes the listing and hands off to the paywall. `signedInAs` comes from
   * the sign-in that just happened, since the session context has not updated
   * by the time this runs.
   */
  const finish = async (signedInAs?: string) => {
    const app = draftListing();
    const owner = signedInAs ?? userId;
    let serverId: string | null = null;

    if (owner) {
      setPublishing(true);
      try {
        serverId = await publish(owner, app);
        // The listings query may already hold the empty result from just after
        // sign-in, which would otherwise stand for the whole stale window.
        void queryClient.invalidateQueries({ queryKey: queryKeys.myListings(owner) });
      } catch (error) {
        if (isListingLimitError(error)) {
          router.replace('/paywall?from=listing_limit');
          return;
        }
        toast('Could not publish your listing. Try again.');
        return;
      } finally {
        setPublishing(false);
      }
    }

    if (addApp) {
      const id = serverId ?? `app${store.ownedApps.length + 1}`;
      store.addApp(asOwnedApp(id, app));
      captureEvent('listing_published', { source: 'add_app' });
      router.replace({ pathname: '/my-app/[id]', params: { id, setup: '1' } });
      return;
    }

    store.completeOnboarding({
      user: {
        username: draft.username,
        showAs: draft.showAs,
        job: draft.job,
        workplace: draft.workplace,
        tags: draft.sel,
        ownWords: draft.own,
        hidden: Object.fromEntries(
          Object.entries(draft.vis).filter(([, visible]) => visible === false),
        ),
        invitedBy: draft.invitedBy ?? undefined,
        // The server grants the real bonus on publish; this keeps the number on
        // screen honest until the profile refetches.
        bonusMatches: draft.invitedBy ? 3 : 0,
      },
      app: serverId ? asOwnedApp(serverId, app) : app,
    });

    void clear();

    captureEvent('onboarding_completed', {
      prompts: draft.answered.length,
      screenshots: draft.shots.length,
      invited_by: draft.invitedBy,
    });

    router.replace('/paywall?from=onboarding');
  };

  /**
   * Kept local until sign-in, which is when there is an account to upload it
   * under. The draft holds the camera roll uri in the meantime.
   */
  const choosePhoto = async () => {
    const picked = await pickAvatar();
    if (!picked) return;
    if ('error' in picked) {
      toast(picked.error);
      return;
    }

    update({ photo: picked.uri });
    if (userId) {
      const url = await uploadAvatar(userId, picked.uri);
      if (url) {
        store.updateUser({ photo: url });
        void updateMyProfile(userId, { photo_url: url });
      }
    }
  };

  const redeemCode = async () => {
    const code = draft.inviteCode.trim();
    if (!code || checkingCode) return;

    setCheckingCode(true);
    try {
      const status = await checkInviteCode(code);
      if (!status.valid) {
        toast("That code isn't valid");
        return;
      }

      const invitedBy = status.inviter ?? 'a builder';
      update({ inviteOk: true, invitedBy });
      captureEvent('invite_redeemed', { invited_by: invitedBy });
    } catch {
      toast('Could not check that code. Try again.');
    } finally {
      setCheckingCode(false);
    }
  };

  /**
   * Saves what the profile steps collected. The listing itself still lives in
   * the store until listings move server-side.
   */
  const saveProfile = async (userId: string, fullName?: string, photo?: string) => {
    // A provider photo is copied into our own bucket, because an avatar URL
    // from Google or GitHub stops resolving when that account changes.
    const stored = draft.photo || photo ? await uploadAvatar(userId, draft.photo || photo!) : null;

    const fields = {
      ...(fullName ? { real_name: fullName } : {}),
      ...(stored ? { photo_url: stored } : {}),
      display_pref: draft.showAs === 'username' ? ('username' as const) : ('real_name' as const),
      job: draft.job || null,
      workplace: draft.workplace || null,
      looking_for: picked('look'),
      app_interests: picked('cat'),
      life_tags: picked('l'),
      test_devices: picked('d'),
      own_words: draft.own,
      visibility: draft.vis,
    };

    try {
      await updateMyProfile(userId, { ...fields, username: draft.username || null });
    } catch (error) {
      // Someone else claimed the handle between the username step and sign-in.
      // Keep the account and everything else; the handle can be set later.
      if ((error as { code?: string }).code !== '23505') throw error;
      await updateMyProfile(userId, fields);
      toast('That username was taken. Pick another in Profile.');
    }
  };

  const signUpWith = async (provider: AuthProvider) => {
    if (authPending) return;
    setAuthPending(true);

    try {
      const outcome = await signIn(provider);
      if (outcome.status === 'cancelled') return;

      captureEvent('signed_up', { provider });

      if (outcome.status === 'signed-in') {
        // A failed redemption must not cost the user their account.
        try {
          if (draft.inviteCode) await redeemInvite(draft.inviteCode);
        } catch {
          toast('Signed in, but your invite code could not be applied.');
        }
        await saveProfile(outcome.userId, outcome.fullName, outcome.photo);
        await finish(outcome.userId);
        return;
      }

      await finish();
    } catch (error) {
      toast(error instanceof SignInError ? error.message : 'Could not sign in. Try again.');
    } finally {
      setAuthPending(false);
    }
  };

  /** Logging back in skips the listing flow and the new-signup paywall. */
  const logInWith = async (provider: AuthProvider) => {
    if (authPending) return;
    setAuthPending(true);

    try {
      const outcome = await signIn(provider);
      if (outcome.status === 'cancelled') return;

      captureEvent('logged_in', { provider });
      setLogIn(false);
      store.completeOnboarding({});
      router.replace('/(tabs)/discover');
    } catch (error) {
      toast(error instanceof SignInError ? error.message : 'Could not log in. Try again.');
    } finally {
      setAuthPending(false);
    }
  };

  const next = () => {
    if (!valid) {
      toast(invalidMessage());
      return;
    }
    if (draft.step >= lastStep) {
      void finish();
      return;
    }
    update((prev) => ({ step: prev.step + 1 }));
  };

  const summaryRows = (): SummaryRow[] => {
    if (step.kind === 'summary') {
      return [
        { icon: '▣', text: draft.appName || 'Your app' },
        { icon: '◷', text: stripEmoji(picked('stage')[0] ?? 'Stage not set') },
        { icon: '▤', text: `${draft.shots.length} screenshots` },
        { icon: '◎', text: picked('ii').map(stripEmoji).join(', ') || 'Ideal users' },
        { icon: '◔', text: picked('ia').join(', ') || 'Ages' },
        { icon: '⊘', text: 'Prompts', pending: true },
        { icon: '⊘', text: 'Your builder profile', pending: true },
      ];
    }
    return [
      { icon: '◉', text: store.user.realName },
      { icon: '▣', text: draft.job || 'Your job' },
      { icon: '✦', text: picked('look').map(stripEmoji).join(', ') || "What you're looking for" },
      { icon: '♥', text: picked('cat').map(stripEmoji).join(', ') || "Apps you'd try" },
      { icon: '⊘', text: 'Your age', pending: true },
      { icon: '⊘', text: 'Your email', pending: true },
    ];
  };

  // The splash is the one screen that breaks the palette, in light mode only.
  const background = isWelcome && !isDark ? SPLASH_BG.light : c.bg;

  if (!ready) return <View style={{ flex: 1, backgroundColor: background }} />;

  if (isWelcome) {
    return (
      <View style={{ flex: 1, backgroundColor: background, paddingTop: insets.top + 8 }}>
        <WelcomeStep onContinue={() => update({ step: 1 })} onLogIn={() => setLogIn(true)} />

        <Sheet visible={logIn} onClose={() => setLogIn(false)} scroll={false}>
          <View style={{ gap: 16 }}>
            <Txt font="mono" size={18} weight={500}>
              Welcome back
            </Txt>
            <Txt size={14.5} lh={1.5} muted>
              Log in with whichever account you listed your app with.
            </Txt>

            <ProviderButtons verb="Log in with" onPress={logInWith} pending={authPending} />
          </View>
        </Sheet>
      </View>
    );
  }

  const title = writing ? 'Write answer' : picker !== null ? 'Select a prompt' : (step.title ?? '');

  const showBottomBar = !isCheckLike && step.kind !== 'auth' && !writing && picker === null;

  return (
    <View style={{ flex: 1, backgroundColor: background, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: layout.gutter, paddingTop: 10 }}>
        <Progress value={(draft.step + 1) / (lastStep + 1)} />

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 46,
          }}
        >
          <Pressable onPress={goBack} hitSlop={12} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={26} color={c.ink} />
          </Pressable>

          {writing ? (
            <Pressable
              onPress={() => {
                const id = writing;
                const slot = picker ?? draft.answered.length;
                update((prev) => {
                  const answered = [...prev.answered];
                  answered[slot] = id;
                  return {
                    answered: answered.filter(Boolean),
                    answers: { ...prev.answers, [id]: answerDraft.trim() },
                  };
                });
                setWriting(null);
                setPicker(null);
              }}
              hitSlop={10}
            >
              <Txt size={15} weight={600} color={answerDraft.trim() ? c.accentText : c.muted}>
                Done
              </Txt>
            </Pressable>
          ) : step.skip && picker === null ? (
            <Pressable
              onPress={() => update((prev) => ({ step: Math.min(lastStep, prev.step + 1) }))}
              style={{
                paddingHorizontal: 14,
                height: 32,
                borderRadius: radii.pill,
                borderWidth: 1.5,
                borderColor: c.line,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Txt size={13.5} weight={600} muted>
                Skip
              </Txt>
            </Pressable>
          ) : (
            <View style={{ width: 26 }} />
          )}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingTop: isCheckLike ? 0 : isSummary ? 14 : 24,
          paddingBottom: showBottomBar ? 140 : insets.bottom + 40,
          flexGrow: isCheckLike ? 1 : undefined,
        }}
      >
        {!isCheckLike && title ? (
          <Txt font="mono" size={27} weight={500} lh={1.22} style={{ marginBottom: 18 }}>
            {title}
          </Txt>
        ) : null}

        {renderStep()}
      </ScrollView>

      {showBottomBar ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: layout.gutter,
            paddingTop: 12,
            paddingBottom: insets.bottom + 14,
            backgroundColor: background,
            borderTopWidth: 1,
            borderColor: c.line,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
          }}
        >
          {step.vis && step.group ? (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isVisible(step.group) }}
              onPress={() => toggleVisible(step.group!)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  borderWidth: 1.5,
                  borderColor: isVisible(step.group) ? c.ink : c.muted,
                  backgroundColor: isVisible(step.group) ? c.ink : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isVisible(step.group) ? (
                  <Txt size={13} weight={700} color={c.bg}>
                    ✓
                  </Txt>
                ) : null}
              </View>
              <Txt size={14} weight={600}>
                Visible on profile
              </Txt>
            </Pressable>
          ) : (
            <View style={{ flex: 1 }} />
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next"
            onPress={next}
            style={({ pressed }) => ({
              width: 60,
              height: 60,
              borderRadius: 20,
              backgroundColor: valid ? c.ink : c.muted,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Ionicons name="chevron-forward" size={28} color={c.bg} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  function renderStep() {
    if (writing) {
      return (
        <WriteAnswer
          promptId={writing}
          value={answerDraft}
          onChange={setAnswerDraft}
          onChangePrompt={() => setWriting(null)}
        />
      );
    }

    if (picker !== null) {
      return (
        <PromptPicker
          tag={promptTag}
          onChangeTag={setPromptTag}
          used={draft.answered}
          keepVisible={draft.answered[picker]}
          onSelect={(promptId) => {
            setWriting(promptId);
            setAnswerDraft(draft.answers[promptId] ?? '');
          }}
        />
      );
    }

    switch (step.kind) {
      case 'invite':
        return (
          <InviteStep
            code={draft.inviteCode}
            onChangeCode={(code) => update({ inviteCode: code })}
            redeemed={draft.inviteOk}
            invitedBy={draft.invitedBy}
            checking={checkingCode}
            onRedeem={redeemCode}
            onWaitlist={() => toast("We'll email you when a spot opens")}
          />
        );

      case 'check':
        return <CheckStep title={step.title!} onContinue={next} />;

      case 'link':
        return (
          <AddAppStep
            url={draft.appUrl}
            onChangeUrl={(appUrl) => update({ appUrl })}
            fetched={draft.fetched}
            name={draft.appName}
            sub={draft.appSub}
            hue={draft.appHue}
            cats={draft.appCats}
            icon={draft.appIcon || undefined}
            shots={draft.shots}
            links={draft.links}
            onFetch={(result) =>
              update((prev) => ({
                fetched: true,
                appName: result.name,
                appSub: prev.appSub || result.sub,
                appHue: result.hue,
                appCats: result.cats,
                appIcon: result.icon ?? '',
                storeUrl: result.storeUrl ?? '',
                // Store screenshots become the starting carousel. Anything
                // the builder picked from their camera roll is their own work
                // and survives a re-fetch; shots from an earlier lookup are
                // replaced, so pasting a different link does not leave the
                // last app's screenshots behind.
                shots: prev.shots.some((shot) => !/^https?:/i.test(shot.uri))
                  ? prev.shots.filter((shot) => !/^https?:/i.test(shot.uri))
                  : result.shots.map((uri) => ({ uri, kind: 'image' as const })),
                links: { ...prev.links, web: result.web },
              }))
            }
            onChangeName={(appName) => update({ appName })}
            onChangeSub={(appSub) => update({ appSub })}
            onChangeCats={(appCats) => update({ appCats })}
            onChangeLink={(key, value) =>
              update((prev) => ({ links: { ...prev.links, [key]: value } }))
            }
          />
        );

      case 'media':
        return (
          <MediaStep
            shots={draft.shots}
            onChange={(shots) => update({ shots })}
            shotLayout={shotLayout}
            onChangeShotLayout={setShotLayout}
            onError={toast}
          />
        );

      case 'pick':
        return (
          <PickStep
            opts={step.opts!}
            selected={picked(step.group!)}
            single={step.single}
            onToggle={(label) => toggle(step.group!, label, step.single)}
            own={step.own}
            ownText={draft.own[step.group!] ?? ''}
            ownOpen={draft.own[step.group!] !== undefined}
            onOpenOwn={() => update((prev) => ({ own: { ...prev.own, [step.group!]: '' } }))}
            onChangeOwn={(text) =>
              update((prev) => ({ own: { ...prev.own, [step.group!]: text } }))
            }
          />
        );

      case 'summary':
      case 'summary2':
        return <SummaryStep rows={summaryRows()} />;

      case 'prompts':
        return (
          <PromptsStep
            answered={draft.answered}
            answers={draft.answers}
            onPickSlot={(slot) => {
              setPicker(slot);
              setPromptTag('All');
            }}
            onEditSlot={(slot, promptId) => {
              setPicker(slot);
              setWriting(promptId);
              setAnswerDraft(draft.answers[promptId] ?? '');
            }}
          />
        );

      case 'text':
        return (
          <TextStep
            cards={[
              {
                key: 'workplace',
                label: 'Where do you work?',
                hint: 'Optional, but it says a lot about your day-to-day.',
                value: draft.workplace,
                visible: isVisible('workplace'),
              },
              {
                key: 'job',
                label: "What's your job title?",
                hint: 'Full-time indie? Say that.',
                value: draft.job,
                visible: isVisible('job'),
              },
            ]}
            onChange={(key, value) => update({ [key]: value } as never)}
            onToggleVisible={toggleVisible}
          />
        );

      case 'username':
        return (
          <UsernameStep
            realName={store.user.realName}
            photo={draft.photo || store.user.photo}
            onPickPhoto={() => void choosePhoto()}
            username={draft.username}
            onChangeUsername={(username) => update({ username })}
            showAs={draft.showAs}
            onChangeShowAs={(showAs) => update({ showAs })}
            state={usernameState}
            terms={draft.terms}
            onToggleTerms={() => update((prev) => ({ terms: !prev.terms }))}
          />
        );

      case 'auth':
        return (
          <AuthStep
            appName={draft.appName}
            appSub={draft.appSub}
            appHue={draft.appHue}
            appIcon={draft.appIcon || undefined}
            promptCount={draft.answered.length}
            shots={draft.shots.length}
            pending={authPending || publishing}
            signedIn={!!userId}
            onSignIn={signUpWith}
            onPublish={() => void finish()}
          />
        );

      default:
        return null;
    }
  }
}
