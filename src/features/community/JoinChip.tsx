import React from 'react';
import { Pressable, View } from 'react-native';

import { Avatar } from '@/components/ui/AppIcon';
import { Txt } from '@/components/ui/Txt';
import { shortName } from '@/data/mock';
import { useTheme } from '@/theme/ThemeProvider';

import { firstName } from './time';

export function JoinChip({
  name,
  photo,
  appName,
  label,
  onPress,
}: {
  name: string;
  photo?: string;
  appName?: string;
  /** Overrides the default “joined with” copy, as on testing chips. */
  label?: string;
  onPress?: () => void;
}) {
  const { c } = useTheme();
  const who = firstName(name);
  const listed = appName ? shortName(appName) : '';
  const text = label ?? (listed ? `${who} joined with ${listed}` : `${who} joined`);
  const inner = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        maxWidth: '92%',
        paddingVertical: 5,
        paddingLeft: 5,
        paddingRight: 12,
        borderRadius: 999,
        backgroundColor: c.raised,
        borderWidth: 1,
        borderColor: c.line,
      }}
    >
      <Avatar name={name} uri={photo} size={20} />
      <Txt size={12.5} muted numberOfLines={1} style={{ flexShrink: 1 }}>
        {text}
      </Txt>
    </View>
  );

  return (
    <View style={{ alignItems: 'center', paddingVertical: 8 }}>
      {onPress ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={text}
          style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
        >
          {inner}
        </Pressable>
      ) : (
        inner
      )}
    </View>
  );
}
