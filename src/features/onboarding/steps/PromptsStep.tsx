import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Label, Txt } from '@/components/ui/Txt';
import { ANSWER_MAX, PROMPT_LIBRARY, PROMPT_TAGS, promptLabel } from '@/data/prompts';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radii } from '@/theme/tokens';

const SLOTS = [0, 1, 2, 3, 4];

export type PromptsStepProps = {
  /** Prompt ids in slot order. */
  answered: string[];
  answers: Record<string, string>;
  onPickSlot: (slot: number) => void;
  onEditSlot: (slot: number, promptId: string) => void;
};

/** Five slots: three suggested, two optional. */
export function PromptsStep({ answered, answers, onPickSlot, onEditSlot }: PromptsStepProps) {
  const { c } = useTheme();

  return (
    <View style={{ gap: 12 }}>
      <Txt size={15.5} lh={1.5} muted>
        Three is plenty to start. Specific answers get more heys than clever ones.
      </Txt>

      {SLOTS.map((slot) => {
        const promptId = answered[slot];
        const optional = slot >= 3;

        if (!promptId) {
          return (
            <Pressable
              key={slot}
              accessibilityRole="button"
              onPress={() => onPickSlot(Math.min(slot, answered.length))}
              style={({ pressed }) => ({
                minHeight: optional ? 92 : 112,
                borderRadius: radii.cardLg,
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: c.muted,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Txt size={15} weight={500} muted>
                + Pick prompt
              </Txt>
              {optional ? <Label size={10}>Optional</Label> : null}
            </Pressable>
          );
        }

        return (
          <Card key={slot} padding={16} radius={radii.cardLg} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Label style={{ flex: 1 }}>{promptLabel(promptId)}</Label>
              <Pressable onPress={() => onEditSlot(slot, promptId)} hitSlop={8}>
                <Txt size={13} weight={600} color={c.accentText}>
                  Edit
                </Txt>
              </Pressable>
            </View>
            <Txt size={17} lh={1.38}>
              {answers[promptId]}
            </Txt>
          </Card>
        );
      })}
    </View>
  );
}

export type PromptPickerProps = {
  tag: string;
  onChangeTag: (tag: string) => void;
  /** Already-used prompts are hidden, except the one being replaced. */
  used: string[];
  keepVisible?: string;
  onSelect: (promptId: string) => void;
};

export function PromptPicker({ tag, onChangeTag, used, keepVisible, onSelect }: PromptPickerProps) {
  const { c } = useTheme();

  const list = PROMPT_LIBRARY.filter(
    (prompt) =>
      (tag === 'All' || prompt.tag === tag) &&
      (!used.includes(prompt.id) || prompt.id === keepVisible),
  );

  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {PROMPT_TAGS.map((option) => (
          <Chip
            key={option}
            label={option}
            size="sm"
            selected={tag === option}
            onPress={() => onChangeTag(option)}
          />
        ))}
      </View>

      <Card tone="soft" padding={14}>
        <Txt size={14} lh={1.45} color={c.accentText}>
          Pick the prompt you have the most honest answer to. Builders can tell.
        </Txt>
      </Card>

      <View style={{ gap: 10 }}>
        {list.map((prompt) => (
          <Pressable
            key={prompt.id}
            accessibilityRole="button"
            onPress={() => onSelect(prompt.id)}
            style={({ pressed }) => ({
              minHeight: 58,
              borderRadius: radii.option,
              backgroundColor: c.surface,
              borderWidth: 1.5,
              borderColor: c.line,
              paddingHorizontal: 16,
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Txt size={15.5} lh={1.35} style={{ flex: 1 }}>
              {prompt.label}
            </Txt>
            <Ionicons name="chevron-forward" size={17} color={c.muted} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export type WriteAnswerProps = {
  promptId: string;
  value: string;
  onChange: (text: string) => void;
  onChangePrompt: () => void;
};

export function WriteAnswer({ promptId, value, onChange, onChangePrompt }: WriteAnswerProps) {
  const { c } = useTheme();

  return (
    <View style={{ gap: 14 }}>
      <Card padding={16} radius={radii.cardLg} style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Label style={{ flex: 1 }}>{promptLabel(promptId)}</Label>
          <Pressable onPress={onChangePrompt} hitSlop={8}>
            <Txt size={13} weight={600} color={c.accentText}>
              ✎ Change prompt
            </Txt>
          </Pressable>
        </View>

        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="In your own words"
          placeholderTextColor={c.muted}
          multiline
          autoFocus
          maxLength={ANSWER_MAX}
          style={{
            minHeight: 150,
            color: c.ink,
            fontFamily: fonts.body,
            fontSize: 19,
            lineHeight: 27,
            textAlignVertical: 'top',
          }}
        />

        <Txt
          font="mono"
          size={12}
          color={value.length >= ANSWER_MAX ? c.danger : c.muted}
          style={{ textAlign: 'right' }}
        >
          {ANSWER_MAX - value.length}
        </Txt>
      </Card>

      <Card tone="soft" padding={14}>
        <Txt size={14} lh={1.45} color={c.accentText}>
          Be specific. &ldquo;Six taps to log a brew, should be two&rdquo; beats &ldquo;feedback on
          UX&rdquo;.
        </Txt>
      </Card>
    </View>
  );
}