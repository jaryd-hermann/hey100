import React from 'react';
import { View } from 'react-native';

import { Btn } from '@/components/ui/Btn';
import { Txt } from '@/components/ui/Txt';
import { useTheme } from '@/theme/ThemeProvider';

/** A centred monospace statement over a soft lime glow, with a Continue pill. */
export function CheckStep({ title, onContinue }: { title: string; onContinue: () => void }) {
  const { c } = useTheme();

  return (
    <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 60 }}>
      <View style={{ alignItems: 'center' }}>
        <View
          style={{
            position: 'absolute',
            width: 280,
            height: 280,
            borderRadius: 140,
            backgroundColor: c.glow,
            opacity: 0.9,
          }}
        />
        <Txt font="mono" size={21} weight={500} lh={1.5} center style={{ paddingHorizontal: 8 }}>
          {title}
        </Txt>
      </View>

      <Btn
        label="Continue"
        variant="accent"
        size="lg"
        full
        onPress={onContinue}
        style={{ marginTop: 56 }}
      />
    </View>
  );
}
