import React from 'react';
import { View } from 'react-native';

import { Label, Txt } from '@/components/ui/Txt';
import type { GroupPowerStats } from '@/data/repo/community';
import { useTheme } from '@/theme/ThemeProvider';

export function GroupPower({
  power,
}: {
  power?: GroupPowerStats | null;
}) {
  const { c } = useTheme();
  if (!power) return null;

  return (
    <View style={{ gap: 8 }}>
      <Label>Group power</Label>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(
          [
            [power.revenue, 'Combined Revenue'],
            [power.customers, 'Combined Customers'],
            [power.commits, 'Combined Commits'],
          ] as const
        ).map(([value, label]) => (
          <View
            key={label}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 14,
              backgroundColor: c.raised,
              borderWidth: 1,
              borderColor: c.line,
              gap: 3,
            }}
          >
            <Txt font="mono" size={16} weight={500} numberOfLines={1} adjustsFontSizeToFit>
              {value}
            </Txt>
            <Txt size={11} muted numberOfLines={2}>
              {label}
            </Txt>
          </View>
        ))}
      </View>
    </View>
  );
}
