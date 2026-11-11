import React from 'react';
import { TextInput, View } from 'react-native';

import { Txt } from '@/components/ui/Txt';
import { fonts } from '@/theme/tokens';

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
    <View style={{ gap: 14, paddingTop: 8 }}>
      <Txt font="mono" size={30} weight={600} lh={1.12} tracking={-1.5}>
        This solves the problem of
      </Txt>
      <CountBox
        value={problemOf}
        onChangeText={onChangeOf}
        placeholder="late-night calendar chaos"
      />
      <Txt font="mono" size={30} weight={600} lh={1.12} tracking={-1.5} style={{ paddingTop: 6 }}>
        For
      </Txt>
      <CountBox value={problemFor} onChangeText={onChangeFor} placeholder="busy parents" />
    </View>
  );
}

function CountBox({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  return (
    <View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 4,
          bottom: -4,
          borderRadius: 18,
          backgroundColor: '#111111',
        }}
      />
      <View
        style={{
          borderRadius: 18,
          borderWidth: 2,
          borderColor: '#111111',
          backgroundColor: '#FFFFFF',
          minHeight: 88,
        }}
      >
        <TextInput
          value={value}
          onChangeText={(next) => onChangeText(next.slice(0, LINE_MAX))}
          placeholder={placeholder}
          placeholderTextColor="rgba(17,17,17,0.4)"
          multiline
          style={{
            minHeight: 72,
            paddingTop: 14,
            paddingHorizontal: 16,
            paddingBottom: 26,
            color: '#111111',
            fontFamily: fonts.bodyMedium,
            fontSize: 18,
            lineHeight: 24,
            textAlignVertical: 'top',
          }}
        />
        <Txt
          font="mono"
          size={11}
          weight={600}
          color="#5B625C"
          style={{ position: 'absolute', right: 14, bottom: 10 }}
        >
          {value.length}/{LINE_MAX}
        </Txt>
      </View>
    </View>
  );
}
