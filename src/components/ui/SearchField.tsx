import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radii } from '@/theme/tokens';

export type SearchFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
};

/** Filters a long list in place, so a question with fifty answers stays usable. */
export function SearchField({ value, onChangeText, placeholder = 'Search' }: SearchFieldProps) {
  const { c } = useTheme();

  return (
    <View
      style={{
        height: 48,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        backgroundColor: c.surface,
        borderRadius: radii.input,
        borderWidth: 1.5,
        borderColor: c.line,
      }}
    >
      <Ionicons name="search" size={17} color={c.muted} />

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.muted}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="never"
        style={{
          flex: 1,
          height: '100%',
          color: c.ink,
          fontFamily: fonts.body,
          fontSize: 16,
        }}
      />

      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          onPress={() => onChangeText('')}
          hitSlop={10}
        >
          <Ionicons name="close-circle" size={18} color={c.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}
