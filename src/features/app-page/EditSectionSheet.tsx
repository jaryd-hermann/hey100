import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/ui/AppIcon';
import { Btn } from '@/components/ui/Btn';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { SearchField } from '@/components/ui/SearchField';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { Label, Txt } from '@/components/ui/Txt';
import { PRICING_MODELS, stripEmoji } from '@/data/mock';
import { DESCRIPTION_MAX, NAME_MAX } from '@/data/repo/metadata';
import { updateMyProfile } from '@/data/repo/profile';
import { PROMPT_LIBRARY, promptLabel } from '@/data/prompts';
import type { IdealUsers, MediaItem, OwnedApp, SectionKey, ShotLayout, Stage } from '@/data/types';
import { BannerCrop } from '@/features/apps/BannerCrop';
import { BANNER_RATIO, pickBanner } from '@/features/apps/pickBanner';
import { MAX_SHOTS, pickDemoVideo, pickShots } from '@/features/apps/pickShots';
import { ShotGrid } from '@/features/apps/ShotGrid';
import { useAuth } from '@/features/auth/AuthProvider';
import { pickAvatar } from '@/features/profile/avatar';
import { assertClean } from '@/lib/contentFilter';
import { ALL_CATEGORIES } from '@/features/onboarding/steps/AddAppStep';
import {
  AGES,
  DEVICES,
  FEEDBACK_AREAS,
  GENDERS,
  IDEAL_USERS,
  SKILLS,
  STAGE_OPTIONS,
} from '@/features/onboarding/steps';
import { PromptPicker, WriteAnswer } from '@/features/onboarding/steps/PromptsStep';
import { BIO_MAX } from '@/features/profile/fields';
import { toProfilePatch } from '@/features/profile/mapProfile';
import { useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

import { sectionName } from './AppPage';

const PROMPT_MAX = 5;

function keyOf(label: string): string {
  return stripEmoji(label).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function matchOptions(stored: string | undefined, options: readonly string[]): string[] {
  const parts = (stored ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const found: string[] = [];
  for (const part of parts) {
    const partKey = keyOf(part);
    const hit =
      options.find((option) => keyOf(option) === partKey) ??
      (partKey === 'any' ? options.find((option) => keyOf(option) === 'anyage') : undefined);
    if (hit && !found.includes(hit)) found.push(hit);
  }
  return found;
}

function matchDevices(stored?: string): string[] {
  const parts = (stored ?? '')
    .split(/[,·]/)
    .map((part) => part.trim())
    .filter(Boolean);
  const found: string[] = [];
  for (const part of parts) {
    const lower = part.toLowerCase();
    const hit =
      matchOptions(part, DEVICES)[0] ??
      (lower.includes('iphone') || lower.includes('ios') ? 'iPhone (iOS)' : undefined) ??
      (lower.includes('android') ? 'Android' : undefined) ??
      (lower.includes('mac') ? 'Mac' : undefined) ??
      (lower.includes('windows') ? 'Windows' : undefined) ??
      (lower.includes('web') ? 'Web' : undefined);
    if (hit && !found.includes(hit)) found.push(hit);
  }
  return found;
}

function matchStage(stored?: string): (typeof STAGE_OPTIONS)[number] {
  const hit = matchOptions(stored, STAGE_OPTIONS)[0];
  if (hit) return hit as (typeof STAGE_OPTIONS)[number];
  const lower = (stored ?? '').toLowerCase();
  if (lower.includes('revenue')) return '💸 Live with revenue';
  if (lower.includes('live')) return '🚀 Live';
  if (lower.includes('beta') || lower.includes('testflight')) return '🧪 In beta or TestFlight';
  return '💡 Idea or prototype';
}

function stageValue(label: string): Stage {
  const lower = stripEmoji(label).toLowerCase();
  if (lower.includes('revenue')) return 'Revenue';
  if (lower.includes('live')) return 'Live';
  if (lower.includes('beta') || lower.includes('testflight')) return 'TestFlight';
  return 'Idea';
}

function joinPicks(options: string[]): string {
  return options.map((option) => stripEmoji(option)).join(', ');
}

function ChipPick({
  label,
  options,
  selected,
  onChange,
  single,
  max,
  search,
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
  single?: boolean;
  max?: number;
  search?: boolean;
}) {
  const [query, setQuery] = useState('');
  const typed = search ? query.trim().toLowerCase() : '';
  const shown = typed
    ? options.filter((option) => stripEmoji(option).toLowerCase().includes(typed))
    : options;
  const extras = selected.filter((option) => !shown.includes(option));

  return (
    <View>
      <Label style={{ marginBottom: 8 }}>{label}</Label>
      {search ? (
        <View style={{ marginBottom: 10 }}>
          <SearchField
            value={query}
            onChangeText={setQuery}
            placeholder={`Search ${options.length} options`}
          />
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {[...extras, ...shown].map((option) => {
          const on = selected.includes(option);
          return (
            <Chip
              key={option}
              label={option}
              selected={on}
              size="sm"
              onPress={() => {
                if (single) {
                  onChange([option]);
                  return;
                }
                if (on) {
                  onChange(selected.filter((item) => item !== option));
                  return;
                }
                if (max && selected.length >= max) return;
                onChange([...selected, option]);
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

export type EditSectionKey = SectionKey | 'listing' | 'description';

export type SectionSave = (patch: Partial<OwnedApp>, opts?: { close?: boolean }) => void;

export type EditSectionSheetProps = {
  /** The section being edited, or null when the sheet is closed. */
  section: EditSectionKey | null;
  app: OwnedApp;
  onClose: () => void;
  onSave: SectionSave;
  /** True while a picked demo video is still uploading. */
  mediaUploading?: boolean;
};

/**
 * Tap-to-edit for the owner's own listing: one sheet per section, like editing
 * a dating profile. Reordering sections stays in the page's Edit layout mode.
 */
export function EditSectionSheet({
  section,
  app,
  onClose,
  onSave,
  mediaUploading,
}: EditSectionSheetProps) {
  const [lockScroll, setLockScroll] = useState(false);

  useEffect(() => {
    if (!section) setLockScroll(false);
  }, [section]);

  return (
    <Sheet visible={!!section} onClose={onClose} scrollEnabled={!lockScroll}>
      {section ? (
        // Keyed by section, so each editor starts from the saved content.
        <SectionEditor
          key={section}
          section={section}
          app={app}
          onClose={onClose}
          onSave={onSave}
          mediaUploading={mediaUploading}
          onDragChange={setLockScroll}
        />
      ) : null}
    </Sheet>
  );
}

type EditorProps = {
  section: EditSectionKey;
  app: OwnedApp;
  onClose: () => void;
  onSave: SectionSave;
  mediaUploading?: boolean;
  onDragChange?: (dragging: boolean) => void;
};

function SectionEditor({
  section,
  app,
  onClose,
  onSave,
  mediaUploading,
  onDragChange,
}: EditorProps) {
  if (section === 'listing') return <ListingEditor app={app} onClose={onClose} onSave={onSave} />;
  if (section === 'description') return <DescriptionEditor app={app} onClose={onClose} onSave={onSave} />;
  if (section === 'shots') {
    return (
      <ShotsEditor
        app={app}
        onClose={onClose}
        onSave={onSave}
        uploading={mediaUploading}
        onDragChange={onDragChange}
      />
    );
  }
  if (section === 'problem') return <ProblemEditor app={app} onClose={onClose} onSave={onSave} />;
  if (section === 'pricing') return <PricingEditor app={app} onClose={onClose} onSave={onSave} />;
  if (section === 'looking') return <IdealEditor app={app} onClose={onClose} onSave={onSave} />;
  if (section === 'builder') return <BuilderEditor app={app} onClose={onClose} onSave={onSave} />;
  if (/^p\d+$/.test(section)) {
    return (
      <PromptEditor slot={Number(section.slice(1))} app={app} onClose={onClose} onSave={onSave} />
    );
  }
  return <ReadOnlyNote section={section} onClose={onClose} />;
}

function Header({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={{ gap: 6, marginBottom: 4 }}>
      <Txt font="mono" size={19} weight={500}>
        {title}
      </Txt>
      {hint ? (
        <Txt size={13.5} lh={1.45} muted>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

/** Save on the right, cancel on the left, as everywhere else in the app. */
function Actions({
  onSave,
  onClose,
  saveLabel = 'Save',
  dim,
  destructive,
}: {
  onSave: () => void;
  onClose: () => void;
  saveLabel?: string;
  dim?: boolean;
  destructive?: { label: string; onPress: () => void };
}) {
  return (
    <View style={{ gap: 10, marginTop: 4 }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Btn label="Cancel" variant="surface" size="lg" style={{ flex: 1 }} onPress={onClose} />
        <Btn
          label={saveLabel}
          variant="accent"
          size="lg"
          dim={dim}
          style={{ flex: 1.4 }}
          onPress={onSave}
        />
      </View>
      {destructive ? (
        <Btn
          label={destructive.label}
          variant="ghost"
          size="md"
          full
          onPress={destructive.onPress}
        />
      ) : null}
    </View>
  );
}

function DescriptionEditor({ app, onClose, onSave }: Omit<EditorProps, 'section'>) {
  const toast = useToast();
  const [description, setDescription] = useState(app.description ?? '');

  return (
    <View style={{ gap: 14 }}>
      <Header
        title="App bio"
        hint="A few sentences under the tags. Builders see this on Discover."
      />
      <Field
        label="Bio"
        value={description}
        onChangeText={(value) => setDescription(value.slice(0, DESCRIPTION_MAX))}
        max={DESCRIPTION_MAX}
        multiline
        minHeight={160}
        placeholder="What does this app do?"
        autoFocus
      />
      <Actions
        saveLabel="Save app bio"
        onClose={onClose}
        onSave={() => {
          try {
            assertClean(description);
            onSave({ description: description.trim() });
          } catch (error) {
            toast(error instanceof Error ? error.message : 'That text is not allowed.');
          }
        }}
      />
    </View>
  );
}

function ListingEditor({ app, onClose, onSave }: Omit<EditorProps, 'section'>) {
  const toast = useToast();
  const [name, setName] = useState(app.name);
  const [sub, setSub] = useState(app.sub);
  const [icon, setIcon] = useState(app.icon ?? '');
  const [cat, setCat] = useState(app.cat || ALL_CATEGORIES[0]);
  const [plats, setPlats] = useState(matchDevices(app.plat));
  const [stage, setStage] = useState(matchStage(app.stage));
  const [picking, setPicking] = useState(false);

  const pick = async () => {
    if (picking) return;
    setPicking(true);
    const result = await pickAvatar();
    setPicking(false);
    if (!result) return;
    if ('error' in result) {
      toast(result.error);
      return;
    }
    setIcon(result.uri);
  };

  return (
    <View style={{ gap: 14 }}>
      <Header
        title="Listing"
        hint="Name, icon, tags and platform — the same fields builders see first."
      />
      <Pressable
        onPress={() => void pick()}
        style={({ pressed }) => ({ alignSelf: 'center', opacity: pressed ? 0.8 : 1 })}
        accessibilityRole="button"
        accessibilityLabel="Change app icon"
      >
        <AppIcon hue={app.hue} name={name || app.name} uri={icon || undefined} size={72} />
      </Pressable>
      <Field
        label="Name"
        value={name}
        onChangeText={setName}
        max={NAME_MAX}
        autoCapitalize="words"
      />
      <Field
        label="Subtitle"
        value={sub}
        onChangeText={setSub}
        max={30}
        placeholder="One line about the app"
      />
      <ChipPick
        label="Category"
        options={[...ALL_CATEGORIES]}
        selected={cat ? [cat] : []}
        single
        onChange={(next) => setCat(next[0] ?? cat)}
      />
      <ChipPick
        label="Platform"
        options={[...DEVICES]}
        selected={plats}
        onChange={setPlats}
      />
      <ChipPick
        label="Stage"
        options={[...STAGE_OPTIONS]}
        selected={stage ? [stage] : []}
        single
        onChange={(next) => setStage((next[0] as (typeof STAGE_OPTIONS)[number]) ?? stage)}
      />
      <Actions
        dim={!name.trim() || !cat || !plats.length || !stage}
        onClose={onClose}
        onSave={() =>
          onSave({
            name: name.trim(),
            sub: sub.trim(),
            cat,
            plat: plats.join(', '),
            stage: stageValue(stage),
            ...(icon ? { icon } : {}),
          })
        }
      />
    </View>
  );
}

function ProblemEditor({ app, onClose, onSave }: Omit<EditorProps, 'section'>) {
  const [problemOf, setProblemOf] = useState(app.problemOf ?? '');
  const [problemFor, setProblemFor] = useState(app.problemFor ?? '');

  return (
    <View style={{ gap: 14 }}>
      <Header title="The problem" />
      <Field
        label="This solves the problem of"
        value={problemOf}
        onChangeText={setProblemOf}
        placeholder="late-night calendar chaos"
        max={80}
        autoCapitalize="none"
      />
      <Field
        label="For"
        value={problemFor}
        onChangeText={setProblemFor}
        placeholder="busy parents"
        max={80}
        autoCapitalize="none"
      />
      <Actions
        onClose={onClose}
        onSave={() => onSave({ problemOf: problemOf.trim(), problemFor: problemFor.trim() })}
      />
    </View>
  );
}

function PricingEditor({ app, onClose, onSave }: Omit<EditorProps, 'section'>) {
  const [model, setModel] = useState(app.pricingModel ?? '');
  const [from, setFrom] = useState(app.priceFrom ?? '');
  const paid = !!model && model !== 'Free';

  return (
    <View style={{ gap: 14 }}>
      <Header title="Pricing" hint="Pick the model that matches how people pay — or don't." />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {PRICING_MODELS.map((option) => (
          <Chip
            key={option}
            label={option}
            selected={model === option}
            onPress={() => setModel(option)}
          />
        ))}
      </View>
      {paid ? (
        <Field
          label="From price"
          value={from}
          onChangeText={setFrom}
          placeholder="$4.99"
          autoCapitalize="none"
        />
      ) : null}
      <Actions
        dim={!model}
        onClose={onClose}
        onSave={() =>
          onSave({
            pricingModel: model,
            priceFrom: paid ? from.trim() : '',
          })
        }
      />
    </View>
  );
}

function insertDemo(prev: MediaItem[], next: MediaItem): MediaItem[] {
  if (!prev.length || prev[0]?.video || !prev[0]?.uri) return [next, ...prev.slice(1)];
  return [next, ...prev].slice(0, MAX_SHOTS);
}

function ShotsEditor({
  app,
  onClose,
  onSave,
  uploading,
  onDragChange,
}: Omit<EditorProps, 'section'> & { uploading?: boolean }) {
  const { c } = useTheme();
  const toast = useToast();
  const [items, setItems] = useState<MediaItem[]>(app.media ?? []);
  const [shotLayout, setShotLayout] = useState<ShotLayout>(app.shotLayout ?? 'vertical');
  const [picking, setPicking] = useState(false);

  const filled = items.filter((item) => !!item.uri).length;
  const firstIsVideo = !!items[0]?.video;

  const commit = (next: MediaItem[]) => {
    setItems(next);
    onSave({ media: next, shotLayout }, { close: false });
  };

  const addShots = async () => {
    if (picking) return;
    setPicking(true);

    const result = await pickShots(MAX_SHOTS - items.length);
    setPicking(false);

    if ('error' in result) {
      toast(result.error);
      return;
    }
    if (!result.shots.length) return;

    commit([
      ...items,
      ...result.shots.map((shot) => ({ label: '', video: shot.kind === 'video', uri: shot.uri })),
    ]);
  };

  const addDemo = async () => {
    if (picking) return;
    if (filled >= MAX_SHOTS && !firstIsVideo) {
      toast('Remove a screenshot first to add a demo video');
      return;
    }

    setPicking(true);
    const result = await pickDemoVideo();
    setPicking(false);

    if ('error' in result) {
      toast(result.error);
      return;
    }
    if (!result.shot) return;

    commit(
      insertDemo(items, {
        label: result.shot.label ?? 'Demo video',
        video: true,
        uri: result.shot.uri,
      }),
    );
  };

  return (
    <View style={{ gap: 14 }}>
      <Header
        title="Screenshots"
        hint="The first slot can be a demo video — a screen recording from Photos, up to 500 MB. Hold a shot to reorder."
      />

      <View style={{ gap: 9 }}>
        <Label>Carousel layout</Label>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(
            [
              ['vertical', 'Vertical · phone'],
              ['horizontal', 'Horizontal · web'],
            ] as const
          ).map(([value, label]) => (
            <Chip
              key={value}
              label={label}
              selected={shotLayout === value}
              onPress={() => setShotLayout(value)}
            />
          ))}
        </View>
      </View>

      {filled && (firstIsVideo || filled >= MAX_SHOTS) ? (
        <Chip
          label={firstIsVideo ? 'Replace demo video' : 'Add demo video'}
          onPress={() => void addDemo()}
          left={<Ionicons name="videocam-outline" size={16} color={c.ink} />}
        />
      ) : null}

      <ShotGrid
        shots={items
          .filter((item) => !!item.uri)
          .map((item) => ({
            uri: item.uri!,
            kind: item.video ? ('video' as const) : ('image' as const),
          }))}
        layout={shotLayout}
        max={MAX_SHOTS}
        busy={picking}
        uploading={uploading}
        onDragChange={onDragChange}
        onReorder={(shots) =>
          setItems((prev) =>
            shots.map((shot) => {
              const kept = prev.find((item) => item.uri === shot.uri);
              return kept ?? { label: '', video: shot.kind === 'video', uri: shot.uri };
            }),
          )
        }
        onRemove={(index) => setItems((prev) => prev.filter((_, at) => at !== index))}
        onAdd={() => void addShots()}
        onAddVideo={() => void addDemo()}
      />

      <Actions onClose={onClose} onSave={() => onSave({ media: items, shotLayout })} />
    </View>
  );
}

function IdealEditor({ app, onClose, onSave }: Omit<EditorProps, 'section'>) {
  const seed = app.ideal ?? { age: '', gender: '', interests: '', plat: '', wants: '' };
  const [ages, setAges] = useState(matchOptions(seed.age, AGES));
  const [gender, setGender] = useState(matchOptions(seed.gender, GENDERS)[0] ?? GENDERS[0]);
  const [interests, setInterests] = useState(matchOptions(seed.interests, IDEAL_USERS));
  const [plats, setPlats] = useState(matchDevices(seed.plat));
  const [wants, setWants] = useState(matchOptions(seed.wants, FEEDBACK_AREAS));

  return (
    <View style={{ gap: 14 }}>
      <Header
        title="Ideal users"
        hint="This is what we match on, so keep it specific. It also shows on your page."
      />
      <ChipPick label="Age" options={AGES} selected={ages} onChange={setAges} />
      <ChipPick
        label="Gender"
        options={GENDERS}
        selected={gender ? [gender] : []}
        single
        onChange={(next) => setGender(next[0] ?? gender)}
      />
      <ChipPick
        label="Who they're into"
        options={IDEAL_USERS}
        selected={interests}
        search
        onChange={setInterests}
      />
      <ChipPick label="Devices they're on" options={[...DEVICES]} selected={plats} onChange={setPlats} />
      <ChipPick
        label="Wants feedback on"
        options={FEEDBACK_AREAS}
        selected={wants}
        max={3}
        onChange={setWants}
      />
      <Actions
        onClose={onClose}
        onSave={() =>
          onSave({
            ideal: {
              age: joinPicks(ages) || 'Any',
              gender,
              interests: joinPicks(interests) || 'Anyone',
              plat: plats.join(', ') || 'iPhone',
              wants: joinPicks(wants).toLowerCase() || 'anything',
            },
          })
        }
      />
    </View>
  );
}

function BuilderEditor({ app, onClose, onSave }: Omit<EditorProps, 'section'>) {
  const store = useStore();
  const { userId } = useAuth();
  const toast = useToast();
  const [role, setRole] = useState(app.role || store.user.job);
  const [bio, setBio] = useState(store.user.bio || app.style || '');
  const [skills, setSkills] = useState<string[]>(store.user.tags.sk ?? app.skills ?? []);

  const toggleSkill = (skill: string) => {
    setSkills((prev) => {
      if (prev.includes(skill)) return prev.filter((item) => item !== skill);
      if (prev.length >= 10) return prev;
      return [...prev, skill];
    });
  };

  return (
    <View style={{ gap: 14 }}>
      <Header
        title="Builder card"
        hint="Your name and avatar come from your profile. Bio and skills show on every listing."
      />

      <Field
        label="Role"
        value={role}
        placeholder="iOS · Supabase"
        minHeight={48}
        onChangeText={setRole}
      />
      <Field
        label="Bio"
        value={bio}
        placeholder="What you build, and how you work with testers"
        max={BIO_MAX}
        multiline
        minHeight={96}
        onChangeText={setBio}
      />

      <View style={{ gap: 8 }}>
        <Label>Skills</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
          {[...new Set([...SKILLS, ...skills])].slice(0, 24).map((skill) => (
            <Chip
              key={skill}
              label={skill}
              size="sm"
              selected={skills.includes(skill)}
              onPress={() => toggleSkill(skill)}
            />
          ))}
        </View>
      </View>

      <Actions
        onClose={onClose}
        onSave={() => {
          const nextBio = bio.trim().slice(0, BIO_MAX);
          const nextRole = role.trim();
          store.updateUser({
            bio: nextBio,
            tags: { ...store.user.tags, sk: skills },
            ownWords: { ...store.user.ownWords, bio: nextBio },
          });
          if (userId) {
            void updateMyProfile(
              userId,
              toProfilePatch({
                bio: nextBio,
                tags: { ...store.user.tags, sk: skills },
                ownWords: { ...store.user.ownWords, bio: nextBio },
              }),
            ).catch(() => toast("Couldn't save your profile"));
          }
          onSave({ role: nextRole, style: nextBio, skills });
        }}
      />
    </View>
  );
}

/** Finds the library prompt behind a stored answer, which keeps only the label. */
function promptIdFor(label?: string): string | null {
  return PROMPT_LIBRARY.find((prompt) => prompt.label === label)?.id ?? null;
}

function PromptEditor({
  slot,
  app,
  onClose,
  onSave,
}: Omit<EditorProps, 'section'> & { slot: number }) {
  const prompts = app.prompts ?? [];
  // A new prompt lands in the first free slot, so the list never gets a hole.
  const index = Math.min(slot, prompts.length);
  const existing = prompts[index];

  const [promptId, setPromptId] = useState(promptIdFor(existing?.[0]));
  const [answer, setAnswer] = useState(existing?.[1] ?? '');
  const [tag, setTag] = useState('All');
  const [picking, setPicking] = useState(!promptIdFor(existing?.[0]));

  const used = prompts
    .map(([label]) => promptIdFor(label))
    .filter((id): id is string => !!id && id !== promptId);

  if (picking) {
    return (
      <View style={{ gap: 14 }}>
        <Header
          title="Select a prompt"
          hint="Pick the one you have the most honest answer to. Builders can tell."
        />
        <PromptPicker
          tag={tag}
          onChangeTag={setTag}
          used={used}
          keepVisible={promptId ?? undefined}
          onSelect={(id) => {
            setPromptId(id);
            setPicking(false);
          }}
        />
        <Btn label="Cancel" variant="surface" size="lg" full onPress={onClose} />
      </View>
    );
  }

  if (!promptId) return null;

  return (
    <View style={{ gap: 14 }}>
      <Header
        title={existing ? `Edit ${sectionName(`p${index}` as SectionKey)}` : 'Write answer'}
        hint={
          prompts.length >= PROMPT_MAX && !existing
            ? 'You already have five prompts. Replace one instead.'
            : 'Up to 225 characters. Specific beats clever.'
        }
      />

      <WriteAnswer
        promptId={promptId}
        value={answer}
        onChange={setAnswer}
        onChangePrompt={() => setPicking(true)}
      />

      <Actions
        onClose={onClose}
        dim={!answer.trim()}
        onSave={() => {
          const next = [...prompts];
          next[index] = [promptLabel(promptId), answer.trim()];
          onSave({ prompts: next });
        }}
        destructive={
          existing
            ? {
                label: 'Remove this prompt',
                onPress: () => onSave({ prompts: prompts.filter((_, i) => i !== index) }),
              }
            : undefined
        }
      />
    </View>
  );
}

/** Stats and badges are earned, not typed, so tapping them explains where they come from. */
function ReadOnlyNote({ section, onClose }: { section: SectionKey; onClose: () => void }) {
  const copy =
    section === 'stats'
      ? 'Heys, trades and replies come from how builders use your listing. Only you see the exact numbers — everyone else sees a band.'
      : 'Badges come from the accounts you connect. Add or drop them in “Verify your traction” above, and they re-sync daily.';

  return (
    <View style={{ gap: 14 }}>
      <Header title={sectionName(section)} hint="This section updates itself." />
      <Card tone="soft" padding={14}>
        <Txt size={14} lh={1.5}>
          {copy}
        </Txt>
      </Card>
      <Btn label="Got it" variant="surface" size="lg" full onPress={onClose} />
    </View>
  );
}

export function BannerEditor({
  app,
  onClose,
  onSave,
}: {
  app: OwnedApp;
  onClose: () => void;
  onSave: (patch: Partial<OwnedApp>) => void;
}) {
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [cover, setCover] = useState(app.cover ?? '');
  const [picking, setPicking] = useState(false);
  const [cropUri, setCropUri] = useState<string | null>(null);

  const pick = async () => {
    if (picking) return;
    setPicking(true);
    const result = await pickBanner();
    setPicking(false);
    if (!result) return;
    if ('error' in result) {
      toast(result.error);
      return;
    }
    setCropUri(result.uri);
  };

  return (
    <View style={{ gap: 14 }}>
      <Header
        title="Listing banner"
        hint="1584 × 528, or any 3:1 crop. This sits above your app icon — screenshots stay in the carousel."
      />

      <Pressable
        onPress={() => void pick()}
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      >
        {cover ? (
          <Image
            source={{ uri: cover }}
            style={{
              width: '100%',
              aspectRatio: BANNER_RATIO,
              borderRadius: radii.cardLg,
              backgroundColor: '#111',
            }}
            contentFit="cover"
          />
        ) : (
          <View
            style={{
              aspectRatio: BANNER_RATIO,
              borderRadius: radii.cardLg,
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: '#888',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Txt size={14} muted>
              {picking ? 'Opening photos…' : 'Pick a photo to crop'}
            </Txt>
          </View>
        )}
      </Pressable>

      <Actions
        onClose={onClose}
        onSave={() => onSave({ cover })}
        destructive={
          cover ? { label: 'Remove banner', onPress: () => onSave({ cover: '' }) } : undefined
        }
      />

      <Modal visible={!!cropUri} animationType="slide" presentationStyle="fullScreen">
        <View
          style={{
            flex: 1,
            backgroundColor: '#111',
            paddingTop: insets.top + 16,
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 16,
            gap: 16,
          }}
        >
          <Txt font="mono" size={20} weight={500} color="#fff">
            Crop banner
          </Txt>
          {cropUri ? (
            <BannerCrop
              uri={cropUri}
              onDone={(uri) => {
                setCover(uri);
                setCropUri(null);
                onSave({ cover: uri });
              }}
              onCancel={() => setCropUri(null)}
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}
