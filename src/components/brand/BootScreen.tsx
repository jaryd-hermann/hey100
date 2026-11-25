import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View } from 'react-native';

import { SPLASH_BG } from '@/theme/tokens';

import { Btn } from '../ui/Btn';
import { Txt } from '../ui/Txt';
import { Wordmark } from './Logo';

/**
 * Full-screen hold while the session or account is loading; matches the native
 * splash. With `onRetry` it becomes the load-failed state.
 */
export function BootScreen({ onRetry }: { onRetry?: () => void }) {
  return (
    <View
      style={{ flex: 1, backgroundColor: SPLASH_BG, alignItems: 'center', justifyContent: 'center', gap: 28 }}
    >
      <StatusBar style="light" />
      <Wordmark size={40} />
      {onRetry ? (
        <View style={{ alignItems: 'center', gap: 14 }}>
          <Txt size={14} muted>
            Couldn't reach htg.chat.
          </Txt>
          <Btn label="Try again" variant="surface" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}
