import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, View } from 'react-native';

import { Txt } from '@/components/ui/Txt';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

export type HeysTab = 'received' | 'sent';

const TABS: [HeysTab, string][] = [
  ['received', 'Received'],
  ['sent', 'Sent'],
];

/** Two-option segmented control for the Heys header. Received is the default. */
export function HeysSwitcher({
  value,
  onChange,
}: {
  value: HeysTab;
  onChange: (next: HeysTab) => void;
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
      {TABS.map(([tab, label]) => {
        const active = tab === value;

        return (
          <Pressable
            key={tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (active) return;
              Haptics.selectionAsync().catch(() => {});
              onChange(tab);
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
              {label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}
