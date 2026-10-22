import React from 'react';
import { View } from 'react-native';

import { Field } from '@/components/ui/Field';
import { Txt } from '@/components/ui/Txt';

const LINE_MAX = 80;

export function ProblemStep({
  problemOf,
  problemFor,
  onChangeOf,
  onChangeFor,
}: {
  problemOf: string;
  problemFor: string;
  onChangeOf: (value: string) => void;
  onChangeFor: (value: string) => void;
}) {
  return (
    <View style={{ gap: 16 }}>
      <Txt size={15.5} lh={1.5} muted>
        One line each. Skip if you are not sure — you can finish this on your listing later.
      </Txt>
      <Txt size={18} weight={600} lh={1.4}>
        This solves the problem of…
      </Txt>
      <Field
        value={problemOf}
        onChangeText={onChangeOf}
        placeholder="late-night calendar chaos"
        max={LINE_MAX}
        autoCapitalize="none"
      />
      <Txt size={18} weight={600} lh={1.4}>
        for…
      </Txt>
      <Field
        value={problemFor}
        onChangeText={onChangeFor}
        placeholder="busy parents"
        max={LINE_MAX}
        autoCapitalize="none"
      />
    </View>
  );
}
