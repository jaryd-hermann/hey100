import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';

import { Txt } from '@/components/ui/Txt';
import { useTheme } from '@/theme/ThemeProvider';

export function OfficialMark({
  size = 13,
  label = false,
}: {
  size?: number;
  label?: boolean;
}) {
  const { c } = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 0 }}>
      <Ionicons name="checkmark-circle" size={size} color={c.accentText} />
      {label ? (
        <Txt size={11} weight={600} color={c.accentText}>
          Official
        </Txt>
      ) : null}
    </View>
  );
}
