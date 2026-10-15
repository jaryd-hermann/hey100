import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

import { Txt } from './Txt';

export type OptionRowProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Radio circle for single-select, check square for multi-select. */
  single?: boolean;
};

export function OptionRow({ label, selected, onPress, single }: OptionRowProps) {
  const { c } = useTheme();

  return (
    <Pressable
      accessibilityRole={single ? 'radio' : 'checkbox'}
      accessibilityState={{ checked: selected }}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={({ pressed }) => ({
        minHeight: 58,
        borderRadius: radii.option,
        paddingHorizontal: 18,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: selected ? c.raised : c.surface,
        borderWidth: 1.5,
        borderColor: selected ? c.ink : c.line,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Txt size={16} weight={selected ? 500 : 400} style={{ flex: 1 }}>
        {label}
      </Txt>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: single ? 11 : 6,
          borderWidth: 1.5,
          borderColor: selected ? c.ink : c.muted,
          backgroundColor: selected ? c.ink : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected ? (
          <Txt size={13} weight={700} color={c.bg}>
            ✓
          </Txt>
        ) : null}
      </View>
    </Pressable>
  );
}
