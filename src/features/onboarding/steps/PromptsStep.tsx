import React from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { Txt } from '@/components/ui/Txt';
import { ANSWER_MAX, PROMPT_TAGS } from '@/data/prompts';
import { usePromptLabel, usePromptLibrary } from '@/data/repo/prompts';
import { LIME } from '@/features/onboarding/look';
import { fonts } from '@/theme/tokens';

const SLOTS = [0, 1, 2, 3, 4];

export type PromptsStepProps = {
  /** Prompt ids in slot order. */
  answered: string[];
  answers: Record<string, string>;
  onPickSlot: (slot: number) => void;
  onEditSlot: (slot: number, promptId: string) => void;
  onRemoveSlot: (slot: number) => void;
};

/** Five slots: three suggested, two optional. */
export function PromptsStep({ answered, answers, onPickSlot, onEditSlot, onRemoveSlot }: PromptsStepProps) {
  const label = usePromptLabel();

  return (
    <View style={{ gap: 12 }}>
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
                minHeight: 56,
                borderRadius: 20,
                borderWidth: 2,
                borderStyle: 'dashed',
                borderColor: '#FFFFFF',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                paddingVertical: 16,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Txt size={15} weight={600} color="#FFFFFF">
                + Pick a prompt
              </Txt>
              {optional ? (
                <Txt font="mono" size={11} weight={600} color="#FFFFFF" tracking={0.7} style={{ opacity: 0.85 }}>
                  OPTIONAL
                </Txt>
              ) : null}
            </Pressable>
          );
        }

        const answer = answers[promptId] ?? '';
        return (
          <View key={slot} style={{ marginBottom: 4 }}>
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
                  paddingTop: 14,
                  paddingHorizontal: 14,
                  paddingBottom: 10,
                  borderRadius: 20,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 2,
                  borderColor: '#111111',
                  gap: 6,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Txt font="mono" size={11} weight={700} color="#5B625C" tracking={0.4} style={{ flex: 1, textTransform: 'uppercase' }}>
                    {label(promptId)}
                  </Txt>
                  <Pressable
                    accessibilityLabel="Remove prompt"
                    onPress={() => onRemoveSlot(slot)}
                    hitSlop={8}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 13,
                      borderWidth: 1.5,
                      borderColor: 'rgba(17,17,17,0.2)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <Txt size={12} weight={600} color="#111111">
                      ✕
                    </Txt>
                  </Pressable>
                </View>
                <Pressable onPress={() => onEditSlot(slot, promptId)}>
                  <Txt size={16} weight={500} lh={1.4} color="#111111">
                    {answer || 'Write your answer'}
                  </Txt>
                </Pressable>
                <Txt font="mono" size={11} weight={600} color="#5B625C" style={{ textAlign: 'right' }}>
                  {answer.length}/{ANSWER_MAX}
                </Txt>
              </View>
          </View>
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
  const library = usePromptLibrary();

  const list = library.filter(
    (prompt) =>
      (tag === 'All' || prompt.tag === tag) &&
      (!used.includes(prompt.id) || prompt.id === keepVisible),
  );

  return (
    <View style={{ gap: 14 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>
        {PROMPT_TAGS.map((option) => {
          const selected = tag === option;
          return (
            <Pressable
              key={option}
              onPress={() => onChangeTag(option)}
              style={{
                height: 34,
                paddingHorizontal: 14,
                borderRadius: 17,
                borderWidth: 2,
                borderColor: '#111111',
                backgroundColor: selected ? '#111111' : '#FFFFFF',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Txt size={13} weight={700} color={selected ? '#FFFFFF' : '#111111'}>
                {option}
              </Txt>
            </Pressable>
          );
        })}
      </ScrollView>

      <View
        style={{
          padding: 14,
          borderRadius: 16,
          backgroundColor: 'rgba(255,255,255,0.14)',
        }}
      >
        <Txt size={14} lh={1.45} color={LIME}>
          Pick the prompt you have the most honest answer to. Builders can tell.
        </Txt>
      </View>

      <View style={{ gap: 8 }}>
        {list.map((prompt) => (
          <Pressable
            key={prompt.id}
            accessibilityRole="button"
            onPress={() => onSelect(prompt.id)}
            style={({ pressed }) => ({
              borderRadius: 15,
              backgroundColor: '#FFFFFF',
              borderWidth: 2,
              borderColor: '#111111',
              paddingHorizontal: 14,
              paddingVertical: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Txt size={14.5} weight={600} lh={1.35} color="#111111" style={{ flex: 1 }}>
              {prompt.label}
            </Txt>
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: LIME,
                borderWidth: 1.5,
                borderColor: '#111111',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Txt size={15} weight={700} color="#111111">
                +
              </Txt>
            </View>
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
  const label = usePromptLabel();

  return (
    <View style={{ gap: 14 }}>
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
            padding: 16,
            borderRadius: 20,
            backgroundColor: '#FFFFFF',
            borderWidth: 2,
            borderColor: '#111111',
            gap: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Txt font="mono" size={11} weight={700} color="#5B625C" tracking={0.4} style={{ flex: 1, textTransform: 'uppercase' }}>
              {label(promptId)}
            </Txt>
            <Pressable onPress={onChangePrompt} hitSlop={8}>
              <Txt size={13} weight={600} color="#111111">
                Change
              </Txt>
            </Pressable>
          </View>

          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder="Write your answer"
            placeholderTextColor="rgba(17,17,17,0.4)"
            multiline
            autoFocus
            maxLength={ANSWER_MAX}
            style={{
              minHeight: 120,
              color: '#111111',
              fontFamily: fonts.bodyMedium,
              fontSize: 16,
              lineHeight: 22,
              textAlignVertical: 'top',
            }}
          />

          <Txt font="mono" size={11} weight={600} color="#5B625C" style={{ textAlign: 'right' }}>
            {value.length}/{ANSWER_MAX}
          </Txt>
        </View>
      </View>
    </View>
  );
}
