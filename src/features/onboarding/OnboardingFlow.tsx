import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glyph, glyphs } from '@/components/brand/Glyph';
import { Sheet } from '@/components/ui/Sheet';
import { Txt } from '@/components/ui/Txt';
import { useToast } from '@/components/ui/Toast';
import { DEFAULT_LAYOUT, stripEmoji } from '@/data/mock';
import { promptLabel } from '@/data/prompts';
import { checkInviteCode, redeemInvite } from '@/data/repo/invites';
import { queryKeys } from '@/data/repo/keys';
import { createListing, isListingLimitError } from '@/data/repo/listings';
import { recordOnboardingBlocks, updateMyProfile } from '@/data/repo/profile';
import { toListingInsert } from '@/features/apps/mapListing';
import { uploadAsset, uploadShots } from '@/features/apps/uploadShots';
import { useAuth } from '@/features/auth/AuthProvider';
import { SignInError, signIn, signInWithPassword, signUpWithPassword } from '@/features/auth/signIn';
import { pickAvatar, uploadAvatar } from '@/features/profile/avatar';
import { captureEvent } from '@/lib/analytics';
import { useStore } from '@/store/AppStore';
import { ThemeOverride } from '@/theme/ThemeProvider';
import { layout } from '@/theme/tokens';
import {
  BRIDGES,
  INK,
  LIME,
  segmentCounter,
  segmentProgress,
  showsChromeTitle,
  stepLook,
  stepPalette,
} from './look';
import { type OwnedApp, type ShotLayout } from '@/data/types';
import { blockGain, blocksThrough } from './blocks';
import { EarnToast } from './EarnToast';
import { FlowButton } from './FlowButton';
import { ADD_APP_RANGE, LAST_STEP, STEPS } from './steps';
import { useOnboardingDraft } from './useOnboardingDraft';
import { useUsernameState } from './useUsernameState';
import { AddAppStep } from './steps/AddAppStep';
import { ProblemStep } from './steps/ProblemStep';
import { AuthStep, EmailAuthForm, EmailOption, OrRule, ProviderButtons, type AuthProvider } from './steps/AuthStep';
import { InviteStep } from './steps/InviteStep';
import { MediaStep } from './steps/MediaStep';
import { PickStep } from './steps/PickStep';
import { PromptPicker, PromptsStep, WriteAnswer } from './steps/PromptsStep';
import { SummaryStep } from './steps/SummaryStep';
import { RoleStep, WorkStep } from './steps/WorkStep';
import { UsernameStep } from './steps/UsernameStep';
import { WelcomeStep } from './steps/WelcomeStep';
import { StoryStep } from './steps/StoryStep';
import { WhyStep } from './steps/WhyStep';
import { JoiningStep } from './steps/JoiningStep';

export type OnboardingMode = 'full' | 'addApp';

const DRAFT_KEY = 'hey100.onboarding-draft';

/** Part 1 keeps the Discover heart. Matching uses heart-eyes. Part 2 uses the handshake. */
function bridgeMark(step: number) {
  if (step === 16) return glyphs.handshake;
  if (step === 9) return glyphs.heartEyes;
  return glyphs.heartSolid;
}

export function OnboardingFlow({ mode = 'full' }: { mode?: OnboardingMode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const store = useStore();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const { invite } = useLocalSearchParams<{ invite?: string }>();

  const addApp = mode === 'addApp';
  const { draft, ready, update, toggle, picked, isVisible, toggleVisible, clear } =
    useOnboardingDraft(addApp ? ADD_APP_RANGE.first : 0, addApp ? null : DRAFT_KEY);

  // Prompt picker and answer writer are sub-screens of the prompts step.
  const [logIn, setLogIn] = useState(false);
  const [emailLogIn, setEmailLogIn] = useState(false);
  const [checkingCode, setCheckingCode] = useState(false);
  const [earn, setEarn] = useState<{ from: number; to: number; gain: number; key: number } | null>(null);
  const earnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reachedRef = useRef(0);
  const [authPending, setAuthPending] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [picker, setPicker] = useState<number | null>(null);
  const [writing, setWriting] = useState<string | null>(null);
  const [promptTag, setPromptTag] = useState('All');
  const [answerDraft, setAnswerDraft] = useState('');
  // Orientation for every screenshot in this listing, picked on the media step.
  const [shotLayout, setShotLayout] = useState<ShotLayout>('vertical');
  const [joining, setJoining] = useState<string | null>(null);
  const [askInvite, setAskInvite] = useState(false);

  const usernameState = useUsernameState(draft.username);

  const step = STEPS[draft.step] ?? STEPS[0];
  const realName = [draft.firstName, draft.lastName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ');
  const lastStep = addApp ? ADD_APP_RANGE.last : LAST_STEP;
  const isWelcome = step.kind === 'welcome';
  const isStory = step.kind === 'story';
  const isWhy = step.kind === 'why';
  const isCheckLike = step.kind === 'check';
  const isSummary = step.kind === 'summary';
  const welcomed = useRef(false);
  const appliedInvite = useRef<string | null>(null);
  const triedCode = useRef('');
  const scrollRef = useRef<ScrollView>(null);

  const acceptInvite = useCallback(
    (invitedBy: string) => {
      captureEvent('invite_redeemed', { invited_by: invitedBy });
      toast('You got 3 extra free matches');
      update({
        inviteOk: true,
        invitedBy,
      });
    },
    [toast, update],
  );

  useEffect(() => {
    if (step.kind !== 'auth') return;
    const show = Keyboard.addListener('keyboardDidShow', () => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
    return () => show.remove();
  }, [step.kind]);

  useEffect(() => {
    if (!ready || addApp || !isWelcome || welcomed.current) return;
    welcomed.current = true;
    captureEvent('welcome_viewed');
  }, [ready, addApp, isWelcome]);

  useEffect(() => {
    if (!ready || addApp) return;
    const code = typeof invite === 'string' ? invite.trim() : '';
    if (!code || appliedInvite.current === code) return;
    appliedInvite.current = code;

    let cancelled = false;
    update({
      inviteCode: code,
      inviteOk: false,
      invitedBy: null,
    });
    void (async () => {
      try {
        const status = await checkInviteCode(code);
        if (cancelled) return;
        if (!status.valid) {
          toast("That code isn't valid");
          return;
        }
        acceptInvite(status.inviter ?? 'a builder');
      } catch {
        if (!cancelled) toast('Could not check that code. Try again.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [acceptInvite, ready, addApp, invite, toast, update]);

  const valid = useMemo(() => {
    switch (step.kind) {
      case 'link':
        return draft.fetched;
      case 'username':
        return (
          !!draft.firstName.trim() &&
          !!draft.lastName.trim() &&
          draft.terms &&
          usernameState !== 'taken' &&
          usernameState !== 'invalid'
        );
      case 'pick':
        return picked(step.group!).length > 0 || !!draft.own[step.group!];
      default:
        return true;
    }
  }, [
    draft.fetched,
    draft.firstName,
    draft.lastName,
    draft.own,
    draft.terms,
    picked,
    step,
    usernameState,
  ]);

  const invalidMessage = () => {
    switch (step.kind) {
      case 'link':
        return 'Fetch your app first';
      case 'username':
        if (!draft.firstName.trim() || !draft.lastName.trim()) return 'Add your first and last name';
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

  reachedRef.current = draft.blocksReached ?? draft.step;

  const showEarn = (from: number, gain: number) => {
    setEarn({ from, to: from + gain, gain, key: Date.now() });
    if (earnTimer.current) clearTimeout(earnTimer.current);
    earnTimer.current = setTimeout(() => setEarn(null), 2300);
  };

  /**
   * Moves to a step. Continue pays for the step being left, the first time.
   * Skip passes `pay: false`, so a skipped step adds nothing.
   */
  const goTo = (step: number, options?: { pay?: boolean }) => {
    const leaving = draft.step;
    const reached = reachedRef.current;
    if (options?.pay !== false && !addApp && leaving > reached && leaving > 0) {
      const from = draft.blocks ?? blocksThrough(reached);
      const gain = blockGain(leaving);
      reachedRef.current = leaving;
      if (gain > 0) showEarn(from, gain);
      update({ step, blocks: from + gain, blocksReached: leaving });
      return;
    }
    update({ step });
  };

  /** Everything the listing steps collected, in the shape the app renders. */
  const draftListing = (): Partial<OwnedApp> => ({
    name: draft.appName || 'Your app',
    sub: draft.appSub,
    hue: draft.appHue,
    // Shown immediately; the uploaded copy replaces it on the next refetch.
    icon: draft.appIcon || undefined,
    cat: draft.appCats.slice(0, 2).join(' · ') || 'Productivity',
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
      wants: (picked('f').join(', ') || draft.own.f || '').toLowerCase() || 'anything',
    },
    problemOf: draft.problemOf.trim() || undefined,
    problemFor: draft.problemFor.trim() || undefined,
    storeRating: draft.storeRating,
    storeRatingCount: draft.storeRatingCount,
    storeUrl: draft.storeUrl || undefined,
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
    builder: realName || store.user.realName,
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
    problemOf: app.problemOf,
    problemFor: app.problemFor,
    storeRating: app.storeRating,
    storeRatingCount: app.storeRatingCount,
    storeUrl: app.storeUrl,
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
        console.warn('listing publish failed', error);
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
        realName: realName || store.user.realName,
        username: draft.username,
        showAs: draft.showAs,
        job: draft.job,
        workplace: draft.workplace,
        industry: draft.industry,
        companySize: draft.companySize,
        department: draft.department,
        yearsExperience: draft.yearsExperience,
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

    captureEvent('listing_published', { source: 'onboarding' });
    captureEvent('onboarding_completed', {
      prompts: draft.answered.length,
      screenshots: draft.shots.length,
      invited_by: draft.invitedBy,
    });

    setAskInvite(true);
  };

  const continueAfterInvite = () => {
    if (draft.inviteCode.trim()) {
      void redeemInvite(draft.inviteCode).catch(() => {});
    }
    setAskInvite(false);
    setJoining(draft.appName || 'your product');
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
    triedCode.current = code;

    setCheckingCode(true);
    try {
      const status = await checkInviteCode(code);
      if (!status.valid) {
        toast("That code isn't valid");
        return;
      }

      acceptInvite(status.inviter ?? 'a builder');
    } catch {
      toast('Could not check that code. Try again.');
    } finally {
      setCheckingCode(false);
    }
  };

  useEffect(() => {
    if (step.kind !== 'invite' || draft.inviteOk || checkingCode) return;
    const code = draft.inviteCode.trim();
    if (code.length < 6 || triedCode.current === code) return;
    const timer = setTimeout(() => {
      triedCode.current = code;
      void redeemCode();
    }, 450);
    return () => clearTimeout(timer);
  }, [checkingCode, draft.inviteCode, draft.inviteOk, step.kind]);

  /**
   * Saves what the profile steps collected. The listing itself still lives in
   * the store until listings move server-side.
   */
  const saveProfile = async (userId: string, fullName?: string, photo?: string) => {
    // A provider photo is copied into our own bucket, because an avatar URL
    // from Google or GitHub stops resolving when that account changes.
    const stored = draft.photo || photo ? await uploadAvatar(userId, draft.photo || photo!) : null;

    const fields = {
      ...((realName || fullName) ? { real_name: realName || fullName } : {}),
      ...(stored ? { photo_url: stored } : {}),
      display_pref: draft.showAs === 'username' ? ('username' as const) : ('real_name' as const),
      job: draft.job || null,
      workplace: draft.workplace || null,
      industry: draft.industry || null,
      company_size: draft.companySize || null,
      department: draft.department || null,
      years_experience: draft.yearsExperience || null,
      looking_for: picked('look'),
      app_interests: picked('cat'),
      test_devices: picked('d'),
      skills: picked('sk'),
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

    // Signing in completes the step you're on. Continue already paid the earlier ones.
    const reached = reachedRef.current;
    const base = draft.blocks ?? blocksThrough(reached);
    const earned =
      !addApp && draft.step > reached && draft.step > 0 ? base + blockGain(draft.step) : base;
    if (earned !== base) {
      reachedRef.current = draft.step;
      update({ blocks: earned, blocksReached: draft.step });
    }
    if (earned > 0) {
      try {
        await recordOnboardingBlocks(earned);
        await queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      } catch {
        toast('Signed in, but your blocks could not be saved.');
      }
    }
  };

  const completeSignUp = async (
    outcome: Awaited<ReturnType<typeof signIn>>,
    provider: string,
  ) => {
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
  };

  const signUpWith = async (provider: AuthProvider) => {
    if (authPending) return;
    setAuthPending(true);

    try {
      await completeSignUp(await signIn(provider), provider);
    } catch (error) {
      toast(error instanceof SignInError ? error.message : 'Could not sign in. Try again.');
    } finally {
      setAuthPending(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    if (authPending) return;
    setAuthPending(true);

    try {
      const outcome = await signUpWithPassword(email, password);
      if (outcome.status === 'unavailable') {
        toast('Sign-in is not available in this build.');
        return;
      }
      await completeSignUp(outcome, 'Email');
    } catch (error) {
      toast(error instanceof SignInError ? error.message : 'Could not create that account. Try again.');
    } finally {
      setAuthPending(false);
    }
  };

  /** Logging back in skips the listing flow and the new-signup paywall. */
  const finishLogIn = (provider: string) => {
    captureEvent('logged_in', { provider });
    setLogIn(false);
    store.completeOnboarding({});
    router.replace('/(tabs)/discover');
  };

  const logInWith = async (provider: AuthProvider) => {
    if (authPending) return;
    setAuthPending(true);

    try {
      const outcome = await signIn(provider);
      if (outcome.status === 'cancelled') return;
      finishLogIn(provider);
    } catch (error) {
      toast(error instanceof SignInError ? error.message : 'Could not log in. Try again.');
    } finally {
      setAuthPending(false);
    }
  };

  const logInWithEmail = async (email: string, password: string) => {
    if (authPending) return;
    setAuthPending(true);

    try {
      const outcome = await signInWithPassword(email, password);
      if (outcome.status === 'cancelled') return;
      if (outcome.status === 'unavailable') {
        toast('Sign-in is not available in this build.');
        return;
      }
      finishLogIn('Email');
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
    goTo(draft.step + 1);
  };

  const summary = () => {
    const age = picked('ia').map(stripEmoji).join(', ');
    const gender = stripEmoji(picked('ig')[0] ?? '');
    return {
      name: draft.appName || 'Your app',
      subtitle: draft.appSub,
      icon: draft.appIcon || undefined,
      hue: draft.appHue,
      stage: stripEmoji(picked('stage')[0] ?? 'Stage not set'),
      devices: picked('ip').map(stripEmoji).join(', '),
      shotLabel: `${draft.shots.length} · ${shotLayout}`,
      looking: picked('ii').map(stripEmoji).join(', '),
      ageGender: [age, gender].filter(Boolean).join(' · '),
      feedback: picked('f').map(stripEmoji).join(', ') || draft.own.f || '',
    };
  };

  const look = stepLook(draft.step);
  const background = look.bg;
  const inviteCodeReady = /^(?:[A-Z0-9]{2,12}-[A-Z0-9]{2,6}|[A-Z0-9]{6,16})$/.test(
    draft.inviteCode.trim().toUpperCase(),
  );
  const segments = segmentProgress(addApp ? Math.max(draft.step, 3) : draft.step);
  const counter = segmentCounter(draft.step);

  if (askInvite) {
    return (
      <ThemeOverride c={{ bg: '#FFFFFF', ink: '#FF5900', muted: '#FF5900', surface: '#FFFFFF' }}>
        <View style={{ flex: 1, backgroundColor: '#FFFFFF', paddingTop: insets.top }}>
          <View style={{ paddingHorizontal: 22, paddingTop: 14, gap: 9 }}>
            <Txt font="mono" size={29} weight={600} lh={1.12} tracking={-1.45} color="#FF5900">
              Did someone invite you?
            </Txt>
            <Txt size={16} lh={1.45} color="#FF5900">
              Paste the code so you both get free matches.
            </Txt>
          </View>
          <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
            <InviteStep
              code={draft.inviteCode}
              onChangeCode={(code) => update({ inviteCode: code })}
              redeemed={draft.inviteOk}
              invitedBy={draft.invitedBy}
              checking={checkingCode}
            />
          </View>
          <View style={{ flex: 1 }} />
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: Math.max(insets.bottom, 34),
              gap: 10,
            }}
          >
            <FlowButton
              label={
                draft.inviteOk
                  ? 'Continue'
                  : checkingCode
                    ? 'Checking…'
                    : inviteCodeReady
                      ? 'Yes, Redeem'
                      : 'Nope, Continue'
              }
              bg={LIME}
              fg={INK}
              shadow={INK}
              dim={checkingCode && !draft.inviteOk}
              onPress={draft.inviteOk || !inviteCodeReady ? continueAfterInvite : redeemCode}
            />
            {!draft.inviteOk && inviteCodeReady ? (
              <Pressable
                onPress={continueAfterInvite}
                style={{ height: 30, alignItems: 'center', justifyContent: 'center' }}
              >
                <Txt size={14.5} weight={700} color="#FF5900" style={{ textDecorationLine: 'underline' }}>
                  Skip for now
                </Txt>
              </Pressable>
            ) : null}
          </View>
        </View>
      </ThemeOverride>
    );
  }

  if (joining) {
    return (
      <JoiningStep
        appName={joining}
        onDone={() => {
          router.replace({
            pathname: '/setup/notifications',
            params: { appId: store.primaryApp.id, then: 'paywall' },
          });
        }}
      />
    );
  }

  if (!addApp && store.onboarded) {
    return <Redirect href="/(tabs)/discover" />;
  }

  if (!ready) return <View style={{ flex: 1, backgroundColor: background }} />;

  if (isWelcome) {
    return (
      <ThemeOverride c={stepPalette(look)} isDark>
      <View style={{ flex: 1, backgroundColor: background, paddingTop: insets.top + 8 }}>
        <WelcomeStep onContinue={() => goTo(1)} onLogIn={() => setLogIn(true)} />

        <ThemeOverride
          isDark={false}
          c={{
            bg: '#FFFFFF',
            surface: '#FFFFFF',
            raised: '#F2F3EF',
            ink: '#111111',
            muted: 'rgba(17,17,17,0.62)',
            line: 'rgba(17,17,17,0.16)',
          }}
        >
          <Sheet
            visible={logIn}
            onClose={() => {
              setLogIn(false);
              setEmailLogIn(false);
            }}
          >
            <View style={{ gap: 16 }}>
              <Txt font="mono" size={18} weight={500}>
                Welcome back
              </Txt>
              <Txt size={14.5} lh={1.5} muted>
                Log in with whichever account you listed your app with.
              </Txt>

              <ProviderButtons verb="Log in with" onPress={logInWith} pending={authPending} />
              {emailLogIn ? (
                <View style={{ gap: 12 }}>
                  <OrRule />
                  <EmailAuthForm mode="log-in" pending={authPending} onSubmit={logInWithEmail} />
                </View>
              ) : (
                <EmailOption verb="Log in with" pending={authPending} onPress={() => setEmailLogIn(true)} />
              )}
            </View>
          </Sheet>
        </ThemeOverride>
      </View>
      </ThemeOverride>
    );
  }

  if (isStory || isWhy) {
    return (
      <ThemeOverride c={stepPalette(look)} isDark={look.dark}>
        <View style={{ flex: 1, backgroundColor: look.bg, paddingTop: insets.top }}>
          <View style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 4 }}>
              <Pressable onPress={goBack} accessibilityLabel="Back" style={{ width: 40, height: 40 }}>
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 3,
                    bottom: -3,
                    borderRadius: 20,
                    backgroundColor: look.shadow,
                  }}
                />
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    borderWidth: 2,
                    borderColor: '#111111',
                    backgroundColor: '#FFFFFF',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="arrow-back" size={18} color="#111111" />
                </View>
              </Pressable>
          </View>
          {isStory ? (
            <StoryStep onContinue={() => goTo(draft.step + 1)} />
          ) : (
            <WhyStep onContinue={() => goTo(draft.step + 1)} />
          )}
          {earn ? <EarnToast key={earn.key} from={earn.from} to={earn.to} gain={earn.gain} top={insets.top + 4} /> : null}
        </View>
      </ThemeOverride>
    );
  }

  const title = writing ? 'Write answer' : picker !== null ? 'Select a prompt' : (step.title ?? '');

  const showBottomBar = step.kind !== 'auth' && !writing && picker === null;
  const bridge = BRIDGES[draft.step];
  const showTitle = showsChromeTitle(step) && !writing && picker === null;

  return (
    <ThemeOverride c={stepPalette(look)} isDark={look.dark}>
      <View style={{ flex: 1, backgroundColor: background, paddingTop: insets.top }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable onPress={goBack} accessibilityLabel="Back" style={{ width: 40, height: 40 }}>
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 3,
                  bottom: -3,
                  borderRadius: 20,
                  backgroundColor: look.shadow,
                }}
              />
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  borderWidth: 2,
                  borderColor: '#111111',
                  backgroundColor: '#FFFFFF',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="arrow-back" size={18} color="#111111" />
              </View>
            </Pressable>
            <View style={{ flex: 1, flexDirection: 'row', gap: 5 }}>
              {segments.map((value, index) => (
                <View
                  key={index}
                  style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: look.track, overflow: 'hidden' }}
                >
                  <View
                    style={{
                      width: `${Math.round(value * 100)}%`,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: look.fill,
                    }}
                  />
                </View>
              ))}
            </View>
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
                <Txt size={15} weight={700} color={answerDraft.trim() ? look.fill : look.muted}>
                  Done
                </Txt>
              </Pressable>
            ) : (
              <Txt
                font="mono"
                size={11.5}
                weight={700}
                color={look.ink}
                style={{ minWidth: 44, textAlign: 'right' }}
              >
                {counter}
              </Txt>
            )}
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={{
            paddingHorizontal: 22,
            paddingTop: 14,
            paddingBottom: showBottomBar ? 150 : insets.bottom + 40,
            flexGrow: isCheckLike ? 1 : undefined,
            justifyContent: isCheckLike ? 'center' : undefined,
          }}
        >
          {isCheckLike && bridge ? (
            <View style={{ flexGrow: 1, justifyContent: 'center', gap: 22, paddingHorizontal: 4, paddingBottom: 30 }}>
              <View style={{ width: 104, height: 109, transform: [{ rotate: '-10deg' }] }}>
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 5,
                    width: 104,
                    height: 104,
                    borderRadius: 52,
                    backgroundColor: '#111111',
                  }}
                />
                <View
                  style={{
                    width: 104,
                    height: 104,
                    borderRadius: 52,
                    backgroundColor: LIME,
                    borderWidth: 2,
                    borderColor: '#111111',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Glyph source={bridgeMark(draft.step)} size={52} color="#111111" />
                </View>
              </View>
              <View
                style={{
                  alignSelf: 'flex-start',
                  paddingVertical: 6,
                  paddingHorizontal: 11,
                  borderRadius: 9,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 2,
                  borderColor: '#111111',
                }}
              >
                <Txt font="mono" size={11} weight={700} color="#111111" tracking={1.1}>
                  {bridge.part}
                </Txt>
              </View>
              <Txt font="mono" size={31} weight={600} lh={1.14} tracking={-1.55} color={look.ink}>
                {bridge.text}
              </Txt>
            </View>
          ) : null}

          {showTitle && title ? (
            <View style={{ gap: 9, marginBottom: 18 }}>
              {step.meta ? (
                <Txt font="mono" size={11} weight={700} color={look.ink} tracking={1.1}>
                  {step.meta}
                </Txt>
              ) : null}
              <Txt font="mono" size={29} weight={600} lh={1.12} tracking={-1.45} color={look.ink}>
                {title}
              </Txt>
              {step.subtitle ? (
                <Txt size={16} lh={1.45} color={look.muted}>
                  {step.subtitle}
                </Txt>
              ) : null}
            </View>
          ) : null}

          {isCheckLike ? null : renderStep()}
        </ScrollView>

        {showBottomBar ? (
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: Math.max(insets.bottom, 16),
              backgroundColor: background,
              gap: 10,
            }}
          >
            <FlowButton
              label="Continue"
              bg={look.ctaBg}
              fg={look.ctaFg}
              shadow={look.shadow}
              dim={!valid}
              onPress={next}
            />
            {step.skip ? (
              <Pressable
                onPress={() => goTo(Math.min(lastStep, draft.step + 1), { pay: false })}
                style={{ height: 30, alignItems: 'center', justifyContent: 'center' }}
              >
                <Txt size={14.5} weight={700} color={look.ink} style={{ textDecorationLine: 'underline' }}>
                  Skip
                </Txt>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {earn ? <EarnToast key={earn.key} from={earn.from} to={earn.to} gain={earn.gain} top={insets.top + 4} /> : null}
      </View>
    </ThemeOverride>
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
      case 'check':
        return null;

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
            shotLayout={shotLayout}
            links={draft.links}
            onFetch={(result) => {
              const keepLocal = draft.shots.some((shot) => !/^https?:/i.test(shot.uri));
              if (!keepLocal) setShotLayout(result.shotLayout ?? 'vertical');
              update((prev) => ({
                fetched: true,
                appName: result.name,
                appSub: prev.appSub || result.sub,
                appHue: result.hue,
                appCats: result.cats.slice(0, 2),
                appIcon: result.icon ?? '',
                storeUrl: result.storeUrl ?? '',
                storeRating: result.rating,
                storeRatingCount: result.ratingCount,
                // Store screenshots become the starting carousel. Anything
                // the builder picked from their camera roll is their own work
                // and survives a re-fetch; shots from an earlier lookup are
                // replaced, so pasting a different link does not leave the
                // last app's screenshots behind.
                shots: prev.shots.some((shot) => !/^https?:/i.test(shot.uri))
                  ? prev.shots.filter((shot) => !/^https?:/i.test(shot.uri))
                  : result.shots.map((uri) => ({ uri, kind: 'image' as const })),
                links: { ...prev.links, web: result.web },
              }));
            }}
            onChangeName={(appName) => update({ appName })}
            onChangeSub={(appSub) => update({ appSub })}
            onChangeCats={(appCats) => update({ appCats: appCats.slice(0, 2) })}
            onChangeIcon={(appIcon) => update({ appIcon })}
            onToast={toast}
            onChangeLink={(key, value) =>
              update((prev) => ({ links: { ...prev.links, [key]: value } }))
            }
          />
        );

      case 'problem':
        return (
          <ProblemStep
            problemOf={draft.problemOf}
            problemFor={draft.problemFor}
            onChangeOf={(problemOf) => update({ problemOf })}
            onChangeFor={(problemFor) => update({ problemFor })}
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
            key={step.group ?? draft.step}
            opts={step.opts ?? []}
            selected={picked(step.group!)}
            single={step.single}
            onToggle={(label) => {
              const group = step.group!;
              const chosen = picked(group);
              if (step.max && chosen.length >= step.max && !chosen.includes(label)) {
                toast(`Pick up to ${step.max}. Unpick one to change it.`);
                return;
              }
              // "Any age" is exclusive: a band list and "any" cannot both be true.
              if (group === 'ia' && label === 'Any age') {
                toggle(group, label, true);
                return;
              }
              if (group === 'ia' && chosen.includes('Any age')) {
                update((prev) => ({ sel: { ...prev.sel, ia: [label] } }));
                return;
              }
              toggle(group, label, step.single);
            }}
            subtitle={step.subtitle ?? (step.max ? `Pick up to ${step.max}` : undefined)}
            search={step.search}
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
        return <SummaryStep {...summary()} />;

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
            onRemoveSlot={(slot) => {
              update((prev) => {
                const id = prev.answered[slot];
                const answers = { ...prev.answers };
                if (id) delete answers[id];
                return { answered: prev.answered.filter((_, index) => index !== slot), answers };
              });
            }}
          />
        );

      case 'work':
        return (
          <WorkStep
            industry={draft.industry}
            onChangeIndustry={(industry) => update({ industry })}
            companySize={draft.companySize}
            onChangeCompanySize={(companySize) => update({ companySize })}
            workplace={{
              label: 'Where do you work?',
              hint: 'The company, studio, or “indie”.',
              value: draft.workplace,
              visible: isVisible('workplace'),
              onChange: (workplace) => update({ workplace }),
              onToggleVisible: () => toggleVisible('workplace'),
            }}
          />
        );

      case 'role':
        return (
          <RoleStep
            department={draft.department}
            onChangeDepartment={(department) => update({ department })}
            years={draft.yearsExperience}
            onChangeYears={(yearsExperience) => update({ yearsExperience })}
            job={{
              label: "What's your job title?",
              hint: 'Full-time indie? Say that.',
              value: draft.job,
              visible: isVisible('job'),
              onChange: (job) => update({ job }),
              onToggleVisible: () => toggleVisible('job'),
            }}
          />
        );

      case 'username':
        return (
          <UsernameStep
            firstName={draft.firstName}
            lastName={draft.lastName}
            onChangeFirstName={(firstName) => update({ firstName })}
            onChangeLastName={(lastName) => update({ lastName })}
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
            appHue={draft.appHue}
            appIcon={draft.appIcon || undefined}
            mediaCount={draft.shots.length}
            promptCount={draft.answered.length}
            username={draft.username}
            realName={realName || store.user.realName}
            photo={draft.photo || store.user.photo}
            blocks={draft.blocks ?? 0}
            pending={authPending || publishing}
            signedIn={!!userId}
            onSignIn={signUpWith}
            onEmail={signUpWithEmail}
            onPublish={() => void finish()}
          />
        );

      default:
        return null;
    }
  }
}

