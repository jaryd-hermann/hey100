import React from 'react';
import { TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radii } from '@/theme/tokens';

import { Label, Txt } from './Txt';

export type FieldProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  hint?: string;
  /** Shows a remaining-characters counter, as on name, subtitle and answers. */
  max?: number;
  mono?: boolean;
  minHeight?: number;
  style?: StyleProp<ViewStyle>;
};

export function Field({ label, hint, max, mono, minHeight = 52, style, value, ...rest }: FieldProps) {
  const { c } = useTheme();
  const length = typeof value === 'string' ? value.length : 0;

  return (
    <View style={style}>
      {label ? <Label style={{ marginBottom: 8 }}>{label}</Label> : null}

      <TextInput
        value={value}
        placeholderTextColor={c.muted}
        maxLength={max}
        style={{
          minHeight,
          backgroundColor: c.surface,
          borderRadius: radii.input,
          borderWidth: 1.5,
          borderColor: c.line,
          paddingHorizontal: 15,
          paddingTop: rest.multiline ? 14 : 0,
          paddingBottom: rest.multiline ? 14 : 0,
          color: c.ink,
          fontFamily: mono ? fonts.monoMedium : fonts.body,
          fontSize: 16,
          textAlignVertical: rest.multiline ? 'top' : 'center',
        }}
        {...rest}
      />

      {hint || max ? (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 12,
            marginTop: 7,
            paddingHorizontal: 2,
          }}
        >
          <Txt size={12.5} muted lh={1.35} style={{ flex: 1 }}>
            {hint ?? ''}
          </Txt>
          {max ? (
            <Txt font="mono" size={12} color={length >= max ? c.danger : c.muted}>
              {max - length}
            </Txt>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
