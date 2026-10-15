import React from 'react';
import { View } from 'react-native';

import { Glass } from '@/components/ui/Glass';
import { Txt } from '@/components/ui/Txt';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

export type SummaryRow = {
  icon: string;
  text: string;
  /** Greyed with an eye-off icon: still to come, not yet shared. */
  pending?: boolean;
};

export function SummaryStep({ rows }: { rows: SummaryRow[] }) {
  const { c } = useTheme();

  return (
    <Glass radius={radii.cardLg} intensity={30}>
      <View style={{ padding: 6 }}>
        {rows.map((row, index) => (
          <View
            key={`${row.icon}-${index}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              paddingVertical: 14,
              paddingHorizontal: 12,
              borderTopWidth: index === 0 ? 0 : 1,
              borderColor: c.line,
            }}
          >
            <Txt font="mono" size={15} color={row.pending ? c.muted : c.accentText}>
              {row.pending ? '⊘' : row.icon}
            </Txt>
            <Txt
              size={15}
              weight={row.pending ? 400 : 500}
              color={row.pending ? c.muted : c.ink}
              style={{ flex: 1 }}
              numberOfLines={2}
            >
              {row.text}
            </Txt>
          </View>
        ))}
      </View>
    </Glass>
  );
}
