import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, View } from 'react-native';

import { HeroLogo } from '@/components/brand/Logo';
import { Btn } from '@/components/ui/Btn';
import { Txt } from '@/components/ui/Txt';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

const STEPS = [
  ['01', 'Build a "dating profile" for your product.'],
  ['02', 'Match with other devs who are also building things.'],
  ['03', 'Trade: you use theirs, they use yours.'],
];

export function WelcomeStep({
  onContinue,
  onLogIn,
}: {
  onContinue: () => void;
  onLogIn: () => void;
}) {
  const { c } = useTheme();

  return (
    <View style={{ flex: 1, paddingHorizontal: 28, paddingBottom: 44 }}>
      {/* Returning users need a way in that skips building a listing. */}
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
          borderColor: c.line,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Ionicons name="log-in-outline" size={16} color={c.ink} />
        <Txt size={13.5} weight={600}>
          Log in
        </Txt>
      </Pressable>

      <View style={{ flex: 1, justifyContent: 'center', gap: 18 }}>
        <Txt size={15.5} weight={600} lh={1.45} muted>
          Building is now the easy part.{'\n'}Finding users is what&apos;s hard!
        </Txt>

        <HeroLogo />

        <Txt size={22} weight={600} lh={1.25} tracking={-0.22}>
          Find 100 people to try your product.{'\n'}DM users, get feedback, & chat with other app
          builders
        </Txt>

        <View style={{ gap: 12, marginTop: 8 }}>
          {STEPS.map(([n, copy]) => (
            <View key={n} style={{ flexDirection: 'row', gap: 14 }}>
              {/* Matching line boxes keeps the number on the copy's first line when it wraps. */}
              <Txt font="mono" size={13} weight={600} lh={1.615} color={c.accentText}>
                {n}
              </Txt>
              <Txt size={15} lh={1.4} style={{ flex: 1 }}>
                {copy}
              </Txt>
            </View>
          ))}
        </View>
      </View>

      <Btn label="Continue" variant="accent" size="lg" full onPress={onContinue} />

      <Txt size={12.5} muted center style={{ marginTop: 16 }}>
        For builders &amp; devs with real products
      </Txt>
    </View>
  );
}
