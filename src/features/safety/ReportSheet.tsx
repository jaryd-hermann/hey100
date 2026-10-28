import React from 'react';
import { Pressable, View } from 'react-native';

import { Sheet } from '@/components/ui/Sheet';
import { Txt } from '@/components/ui/Txt';
import { REPORT_REASONS } from '@/features/community/seed';
import { useTheme } from '@/theme/ThemeProvider';

export function ReportSheet({
  visible,
  title = 'Report',
  onClose,
  onPick,
}: {
  visible: boolean;
  title?: string;
  onClose: () => void;
  onPick: (reason: string) => void;
}) {
  const { c } = useTheme();

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ gap: 10 }}>
        <Txt font="mono" size={20} weight={500}>
          {title}
        </Txt>
        <Txt size={14} muted>
          The Hey100 team reviews every report. They are not told who sent it.
        </Txt>
        {REPORT_REASONS.map((reason) => (
          <Pressable
            key={reason}
            onPress={() => onPick(reason)}
            style={({ pressed }) => ({
              minHeight: 52,
              borderRadius: 16,
              backgroundColor: c.raised,
              paddingHorizontal: 16,
              justifyContent: 'center',
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Txt size={16} weight={500}>
              {reason}
            </Txt>
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}
