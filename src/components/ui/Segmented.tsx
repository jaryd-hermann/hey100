import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, View } from 'react-native';

import { Txt } from '@/components/ui/Txt';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

export type Segment<T extends string> = { id: T; label: string };

/** Pill switcher used in the Heys and Chat headers. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (next: T) => void;
  options: Segment<T>[];
}) {
  const { c } = useTheme();

  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        flexShrink: 0,
        padding: 3,
        gap: 2,
        borderRadius: radii.pill,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.line,
      }}
    >
      {options.map((option) => {
        const active = option.id === value;

        return (
          <Pressable
            key={option.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (active) return;
              Haptics.selectionAsync().catch(() => {});
              onChange(option.id);
            }}
            style={({ pressed }) => ({
              height: 28,
              paddingHorizontal: 12,
              borderRadius: radii.pill,
              justifyContent: 'center',
              backgroundColor: active ? c.ink : 'transparent',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Txt size={12.5} weight={600} color={active ? c.bg : c.muted}>
              {option.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}
