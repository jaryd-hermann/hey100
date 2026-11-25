import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable } from 'react-native';

import { openAccountMenu } from './accountActions';

/** `···` with Log out and Delete account, for screens before Settings exists. */
export function AccountMenuButton({ color = '#FFFFFF' }: { color?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Account options"
      hitSlop={12}
      onPress={openAccountMenu}
      style={({ pressed }) => ({
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Ionicons name="ellipsis-horizontal" size={22} color={color} />
    </Pressable>
  );
}
