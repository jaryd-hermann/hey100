import React from 'react';
import { View } from 'react-native';

import { Field } from '@/components/ui/Field';
import { Txt } from '@/components/ui/Txt';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

const LINE_MAX = 80;

function TitleChip({ emoji, label }: { emoji: string; label: string }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 3,
        paddingLeft: 8,
        paddingRight: 12,
        borderRadius: radii.pill,
        borderWidth: 1.5,
        borderColor: c.ink,
        backgroundColor: c.surface,
      }}
    >
      <Txt size={16}>{emoji}</Txt>
      <Txt font="mono" size={16} weight={500}>
        {label}
      </Txt>
    </View>
  );
}

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
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          columnGap: 8,
          rowGap: 10,
        }}
      >
        <Txt font="mono" size={27} weight={500} lh={1.22}>
          This solves the problem of
        </Txt>
        <TitleChip emoji="😣" label="what pain" />
        <Txt font="mono" size={27} weight={500} lh={1.22}>
          for
        </Txt>
        <TitleChip emoji="🧑" label="who" />
      </View>

      <Field
        label="This solves the problem of"
        value={problemOf}
        onChangeText={onChangeOf}
        placeholder="late-night calendar chaos"
        max={LINE_MAX}
        autoCapitalize="none"
        multiline
        minHeight={96}
      />
      <Field
        label="For"
        value={problemFor}
        onChangeText={onChangeFor}
        placeholder="busy parents"
        max={LINE_MAX}
        autoCapitalize="none"
        multiline
        minHeight={96}
      />
    </View>
  );
}
