import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Btn } from '@/components/ui/Btn';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { Label, Txt } from '@/components/ui/Txt';
import { PROMPT_LIBRARY, promptLabel } from '@/data/prompts';
import type { IdealUsers, MediaItem, OwnedApp, SectionKey, ShotLayout } from '@/data/types';
import { MAX_SHOTS, pickShots } from '@/features/apps/pickShots';
import { PromptPicker, WriteAnswer } from '@/features/onboarding/steps/PromptsStep';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

import { sectionName } from './AppPage';

const PROMPT_MAX = 5;

export type EditSectionSheetProps = {
  /** The section being edited, or null when the sheet is closed. */
  section: SectionKey | null;
  app: OwnedApp;
  onClose: () => void;
  onSave: (patch: Partial<OwnedApp>) => void;
};

/**
 * Tap-to-edit for the owner's own listing: one sheet per section, like editing
 * a dating profile. Reordering sections stays in the page's Edit layout mode.
 */
export function EditSectionSheet({ section, app, onClose, onSave }: EditSectionSheetProps) {
  return (
    <Sheet visible={!!section} onClose={onClose}>
      {section ? (
        // Keyed by section, so each editor starts from the saved content.
        <SectionEditor
          key={section}
          section={section}
          app={app}
          onClose={onClose}
          onSave={onSave}
        />
      ) : null}
    </Sheet>
  );
}

type EditorProps = {
  section: SectionKey;
  app: OwnedApp;
  onClose: () => void;
  onSave: (patch: Partial<OwnedApp>) => void;
};

function SectionEditor({ section, app, onClose, onSave }: EditorProps) {
  if (section === 'shots') return <ShotsEditor app={app} onClose={onClose} onSave={onSave} />;
  if (section === 'looking') return <IdealEditor app={app} onClose={onClose} onSave={onSave} />;
  if (section === 'builder') return <BuilderEditor app={app} onClose={onClose} onSave={onSave} />;
  if (section.startsWith('p')) {
    return (
      <PromptEditor slot={Number(section.slice(1))} app={app} onClose={onClose} onSave={onSave} />
    );
  }
  return <ReadOnlyNote section={section} onClose={onClose} />;
}

function Header({ title, hint }: { title: string; hint: string }) {
  return (
    <View style={{ gap: 6, marginBottom: 4 }}>
      <Txt font="mono" size={19} weight={500}>
        {title}
      </Txt>
      <Txt size={13.5} lh={1.45} muted>
        {hint}
      </Txt>
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

function ShotsEditor({ app, onClose, onSave }: Omit<EditorProps, 'section'>) {
  const { c } = useTheme();
  const toast = useToast();
  const [items, setItems] = useState<MediaItem[]>(app.media ?? []);
  const [shotLayout, setShotLayout] = useState<ShotLayout>(app.shotLayout ?? 'vertical');
  const [picking, setPicking] = useState(false);

  const addShots = async () => {
    if (picking) return;
    setPicking(true);

    const result = await pickShots(MAX_SHOTS - items.length);
    setPicking(false);

    if ('error' in result) {
      toast(result.error);
      return;
    }

    setItems((prev) => [
      ...prev,
      ...result.shots.map((shot) => ({ label: '', video: shot.kind === 'video', uri: shot.uri })),
    ]);
  };

  return (
    <View style={{ gap: 14 }}>
      <Header
        title="Screenshots"
        hint="The first one is your cover. Every screenshot in this listing uses the layout you pick."
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

      <View style={{ gap: 9 }}>
        <Label>Media</Label>

        {items.map((item, index) => (
          <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {item.uri ? (
              <Image
                source={{ uri: item.uri }}
                style={{ width: 34, height: 48, borderRadius: 8, backgroundColor: c.raised }}
                contentFit="cover"
              />
            ) : null}
            <Field
              value={item.label}
              placeholder="What this screenshot shows"
              minHeight={48}
              style={{ flex: 1 }}
              onChangeText={(label) =>
                setItems((prev) =>
                  prev.map((entry, i) => (i === index ? { ...entry, label } : entry)),
                )
              }
            />
            {index === 0 ? (
              <Chip label="Cover" size="sm" tone="accent" />
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${item.label}`}
                hitSlop={8}
                onPress={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: c.line,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="close" size={16} color={c.ink} />
              </Pressable>
            )}
          </View>
        ))}

        {items.length < MAX_SHOTS ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void addShots()}
            style={({ pressed }) => ({
              minHeight: 48,
              borderRadius: radii.option,
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: c.muted,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons name={picking ? 'hourglass-outline' : 'add'} size={18} color={c.muted} />
            <Txt size={14.5} weight={500} muted>
              {picking ? 'Opening photos…' : 'Add a screenshot'}
            </Txt>
          </Pressable>
        ) : null}
      </View>

      <Actions onClose={onClose} onSave={() => onSave({ media: items, shotLayout })} />
    </View>
  );
}

function IdealEditor({ app, onClose, onSave }: Omit<EditorProps, 'section'>) {
  const [ideal, setIdeal] = useState<IdealUsers>(
    app.ideal ?? { age: '', gender: '', interests: '', plat: '', wants: '' },
  );

  const rows: [keyof IdealUsers, string, string][] = [
    ['age', 'Age', '25–34, 35–44'],
    ['gender', 'Gender', 'Anyone'],
    ['interests', 'Into', 'Coffee, cooking'],
    ['plat', 'On', 'iPhone'],
    ['wants', 'Wants feedback on', 'onboarding, pricing'],
  ];

  return (
    <View style={{ gap: 14 }}>
      <Header
        title="Ideal users"
        hint="This is what we match on, so keep it specific. It also shows on your page."
      />

      {rows.map(([key, label, placeholder]) => (
        <Field
          key={key}
          label={label}
          value={ideal[key]}
          placeholder={placeholder}
          minHeight={48}
          onChangeText={(value) => setIdeal((prev) => ({ ...prev, [key]: value }))}
        />
      ))}

      <Actions onClose={onClose} onSave={() => onSave({ ideal })} />
    </View>
  );
}

function BuilderEditor({ app, onClose, onSave }: Omit<EditorProps, 'section'>) {
  const [role, setRole] = useState(app.role ?? '');
  const [style, setStyle] = useState(app.style ?? '');

  return (
    <View style={{ gap: 14 }}>
      <Header
        title="Builder card"
        hint="Your name and avatar come from your profile. This is what you build with, and how you give feedback."
      />

      <Field
        label="Role"
        value={role}
        placeholder="iOS · Supabase"
        minHeight={48}
        onChangeText={setRole}
      />
      <Field
        label="Feedback style"
        value={style}
        placeholder="Balanced feedback · replies within a day"
        minHeight={48}
        onChangeText={setStyle}
      />

      <Actions
        onClose={onClose}
        onSave={() => onSave({ role: role.trim(), style: style.trim() })}
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
