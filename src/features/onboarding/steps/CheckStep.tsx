import React from 'react';
import { View } from 'react-native';

import { Btn } from '@/components/ui/Btn';
import { Glow } from '@/components/ui/Glow';
import { Txt } from '@/components/ui/Txt';

/** A centred monospace statement over a soft lime glow, with a Continue pill. */
export function CheckStep({ title, onContinue }: { title: string; onContinue: () => void }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 60 }}>
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Glow size={340} />
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
