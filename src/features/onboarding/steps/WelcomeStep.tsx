import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, View } from 'react-native';

import { HeroLogo } from '@/components/brand/Logo';
import { Btn } from '@/components/ui/Btn';
import { Txt } from '@/components/ui/Txt';
import { radii } from '@/theme/tokens';

const ink = '#111111';

export function WelcomeStep({
  onContinue,
  onLogIn,
}: {
  onContinue: () => void;
  onLogIn: () => void;
}) {
  return (
    <View style={{ flex: 1, paddingHorizontal: 28, paddingBottom: 44 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log in"
        onPress={onLogIn}
        hitSlop={10}
        style={({ pressed }) => ({
          alignSelf: 'flex-end',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 13,
          height: 34,
          borderRadius: radii.pill,
          borderWidth: 1.5,
          borderColor: ink,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Ionicons name="log-in-outline" size={16} color={ink} />
        <Txt size={13.5} weight={600} color={ink}>
          Log in
        </Txt>
      </Pressable>

      <View style={{ flex: 1, justifyContent: 'center', gap: 22 }}>
        <HeroLogo onLight />

        <Txt size={22} weight={400} lh={1.35} tracking={-0.2} color={ink}>
          <Txt size={22} weight={700} lh={1.35} tracking={-0.2} color={ink}>
            Find people to try your product.{' '}
          </Txt>
          DM users, get feedback, and chat with other builders.
        </Txt>
      </View>

      <Btn
        label="Continue"
        variant="accent"
        size="lg"
        full
        onPress={onContinue}
        style={{ borderColor: ink }}
      />

      <Txt size={12.5} color={ink} center style={{ marginTop: 16 }}>
        For builders &amp; devs with real products
      </Txt>
    </View>
  );
}
