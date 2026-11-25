import { Image, type ImageSource } from 'expo-image';
import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { Txt } from './Txt';

export function EmptyState({
  icon,
  title,
  body,
  children,
}: {
  icon: ImageSource;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  const { c } = useTheme();

  return (
    <View style={{ alignItems: 'center', gap: 12, paddingVertical: 48, paddingHorizontal: 12 }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          backgroundColor: c.raised,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Image source={icon} style={{ width: 26, height: 26 }} tintColor={c.ink} />
      </View>
      <Txt font="mono" size={18} weight={500} center tracking={-0.6}>
        {title}
      </Txt>
      <Txt size={14.5} lh={1.45} muted center>
        {body}
      </Txt>
      {children}
    </View>
  );
}
