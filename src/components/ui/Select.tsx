import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

import { OptionSheet } from './OptionSheet';
import { Label, Txt } from './Txt';

export type SelectProps = {
  label: string;
  /** Empty means unanswered, which is allowed on an optional one. */
  value: string;
  placeholder: string;
  options: string[];
  /** Tapping the current answer again clears it. */
  optional?: boolean;
  onChange: (value: string) => void;
};

/** One structured answer: a row that opens a searchable list, dropdown-style. */
export function Select({ label, value, placeholder, options, optional, onChange }: SelectProps) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Label style={{ flex: 1 }}>{label}</Label>
        {optional ? <Label size={10}>Optional</Label> : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || 'not set'}`}
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          setOpen(true);
        }}
        style={({ pressed }) => ({
          minHeight: 52,
          borderRadius: radii.input,
          backgroundColor: c.surface,
          borderWidth: 1.5,
          borderColor: value ? c.ink : c.line,
          paddingHorizontal: 15,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          opacity: pressed ? 0.75 : 1,
        })}
      >
        <Txt size={16} weight={value ? 500 : 400} muted={!value} style={{ flex: 1 }}>
          {value || placeholder}
        </Txt>
        <Ionicons name="chevron-down" size={17} color={c.muted} />
      </Pressable>

      <OptionSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={label}
        options={options}
        selected={value ? [value] : []}
        single
        onToggle={(option) => onChange(option === value && optional ? '' : option)}
      />
    </View>
  );
}
