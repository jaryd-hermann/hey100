import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Progress } from '@/components/ui/Progress';
import { Txt } from '@/components/ui/Txt';
import { useToast } from '@/components/ui/Toast';
import { DEFAULT_LAYOUT, MY_MEDIA, stripEmoji } from '@/data/mock';
import { promptLabel } from '@/data/prompts';
import { captureEvent } from '@/lib/analytics';
import { useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { SPLASH_BG, layout, radii } from '@/theme/tokens';
import type { OwnedApp } from '@/data/types';

import { ADD_APP_RANGE, LAST_STEP, STEPS } from './steps';
import { useOnboardingDraft } from './useOnboardingDraft';
import { AddAppStep } from './steps/AddAppStep';
import { AuthStep } from './steps/AuthStep';
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

export function OnboardingFlow({ mode = 'full' }: { mode?: OnboardingMode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c, isDark } = useTheme();
  const toast = useToast();
  const store = useStore();

  const addApp = mode === 'addApp';
  const { draft, update, toggle, picked, isVisible, toggleVisible } = useOnboardingDraft(
    addApp ? ADD_APP_RANGE.first : 0,
  );

  // Prompt picker and answer writer are sub-screens of the prompts step.
  const [picker, setPicker] = useState<number | null>(null);
  const [writing, setWriting] = useState<string | null>(null);
  const [promptTag, setPromptTag] = useState('All');
  const [answerDraft, setAnswerDraft] = useState('');

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
        return draft.terms;
      case 'pick':
        return picked(step.group!).length > 0 || !!draft.own[step.group!];
      default:
        return true;
    }
  }, [draft.fetched, draft.inviteOk, draft.own, draft.terms, picked, step]);

  const invalidMessage = () => {
    switch (step.kind) {
      case 'invite':
        return 'Redeem an invite code first';
      case 'link':
        return 'Fetch your app first';
      case 'username':
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

  /** Builds the listing and hands off to the paywall, or publishes a second app. */
  const finish = () => {
    const app: Partial<OwnedApp> = {
      name: draft.appName || 'Your app',
      sub: draft.appSub,
      hue: draft.appHue,
      cat: draft.appCats[0] ?? 'Productivity',
      stage: stripEmoji(picked('stage')[0] ?? '🧪 In beta or TestFlight'),
      media: MY_MEDIA.slice(0, Math.max(1, draft.shots)).map((label) => ({
        label,
        video: /demo video/i.test(label),
      })),
      prompts: draft.answered.map((id) => [promptLabel(id), draft.answers[id]] as [string, string]),
      ideal: {
        age: picked('ia').join(', ') || 'Any',
        gender: picked('ig')[0] ?? 'Anyone',
        interests: picked('ii').map(stripEmoji).join(', ') || 'Anyone',
        plat: picked('ip').map(stripEmoji).join(', ') || 'iPhone',
        wants: picked('f').join(', ').toLowerCase() || 'anything',
      },
      links: draft.links.web ? [['Web', draft.links.web]] : [],
    };

    if (addApp) {
      const id = `app${store.ownedApps.length + 1}`;
      store.addApp({
        id,
        name: app.name!,
        sub: app.sub ?? '',
        cat: app.cat!,
        plat: 'iOS',
        stage: app.stage!,
        hue: app.hue!,
        builder: store.user.realName,
        role: 'iOS · Supabase',
        style: 'Balanced feedback · replies within a day',
        likes: '—',
        trades: 0,
        reply: '—',
        views: 0,
        matches: 0,
        media: app.media!,
        prompts: app.prompts!,
        ideal: app.ideal!,
        badges: [],
        links: app.links!,
        layout: [...DEFAULT_LAYOUT],
      });
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
        bonusMatches: draft.invitedBy ? 3 : 0,
      },
      app,
    });

    captureEvent('onboarding_completed', {
      prompts: draft.answered.length,
      screenshots: draft.shots,
      invited_by: draft.invitedBy,
    });

    router.replace('/paywall?from=onboarding');
  };

  const next = () => {
    if (!valid) {
      toast(invalidMessage());
      return;
    }
    if (draft.step >= lastStep) {
      finish();
      return;
    }
    update((prev) => ({ step: prev.step + 1 }));
  };

  const summaryRows = (): SummaryRow[] => {
    if (step.kind === 'summary') {
      return [
        { icon: '▣', text: draft.appName || 'Your app' },
        { icon: '◷', text: stripEmoji(picked('stage')[0] ?? 'Stage not set') },
        { icon: '▤', text: `${draft.shots} screenshots` },
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

  if (isWelcome) {
    return (
      <View style={{ flex: 1, backgroundColor: background, paddingTop: insets.top + 8 }}>
        <WelcomeStep onContinue={() => update({ step: 1 })} />
      </View>
    );
  }

  const title = writing
    ? 'Write answer'
    : picker !== null
      ? 'Select a prompt'
      : (step.title ?? '');

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
            onRedeem={(invitedBy) => {
              if (!invitedBy) {
                toast("That code isn't valid");
                return;
              }
              update({ inviteOk: true, invitedBy });
              captureEvent('invite_redeemed', { invited_by: invitedBy });
            }}
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
            links={draft.links}
            onFetch={(result) =>
              update((prev) => ({
                fetched: true,
                appName: result.name,
                appSub: prev.appSub || result.sub,
                appHue: result.hue,
                appCats: result.cats,
                shots: Math.max(prev.shots, 3),
                links: { ...prev.links, web: result.web },
              }))
            }
            onChangeName={(appName) => update({ appName })}
            onChangeSub={(appSub) => update({ appSub })}
            onChangeLink={(key, value) =>
              update((prev) => ({ links: { ...prev.links, [key]: value } }))
            }
          />
        );

      case 'media':
        return <MediaStep filled={draft.shots} onChange={(shots) => update({ shots })} />;

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
            username={draft.username}
            onChangeUsername={(username) => update({ username })}
            showAs={draft.showAs}
            onChangeShowAs={(showAs) => update({ showAs })}
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
            promptCount={draft.answered.length}
            shots={draft.shots}
            onSignIn={(provider) => {
              captureEvent('signed_up', { provider });
              finish();
            }}
          />
        );

      default:
        return null;
    }
  }
}