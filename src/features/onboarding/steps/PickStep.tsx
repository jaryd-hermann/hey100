import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { OptionRow } from '@/components/ui/OptionRow';
import { Txt } from '@/components/ui/Txt';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radii } from '@/theme/tokens';

export type PickStepProps = {
  opts: string[];
  selected: string[];
  single?: boolean;
  onToggle: (label: string) => void;
  /** The dashed "own words" expander on multi-select steps. */
  own?: boolean;
  ownText: string;
  ownOpen: boolean;
  onOpenOwn: () => void;
  onChangeOwn: (text: string) => void;
  subtitle?: string;
};

export function PickStep({
  opts,
  selected,
  single,
  onToggle,
  own,
  ownText,
  ownOpen,
  onOpenOwn,
  onChangeOwn,
  subtitle,
}: PickStepProps) {
  const { c } = useTheme();

  return (
    <View style={{ gap: 10 }}>
      {subtitle ? (
        <Txt size={15} lh={1.45} muted style={{ marginBottom: 4 }}>
          {subtitle}
        </Txt>
      ) : null}

      {opts.map((label) => (
        <OptionRow
          key={label}
          label={label}
          selected={selected.includes(label)}
          single={single}
          onPress={() => onToggle(label)}
        />
      ))}

      {own ? (
        ownOpen ? (
          <TextInput
            value={ownText}
            onChangeText={onChangeOwn}
            placeholder="In your own words"
            placeholderTextColor={c.muted}
            multiline
            autoFocus
            style={{
              minHeight: 92,
              marginTop: 6,
              borderRadius: radii.option,
              backgroundColor: c.surface,
              borderWidth: 1.5,
              borderColor: c.line,
              padding: 15,
              color: c.ink,
              fontFamily: fonts.body,
              fontSize: 15.5,
              lineHeight: 22,
              textAlignVertical: 'top',
            }}
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={onOpenOwn}
            style={({ pressed }) => ({
              marginTop: 6,
              minHeight: 58,
              borderRadius: radii.option,
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: c.muted,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons name="add" size={18} color={c.muted} />
            <Txt size={14.5} muted style={{ flex: 1 }}>
              Share more in your own words
            </Txt>
          </Pressable>
        )
      ) : null}
    </View>
  );
}
