import React from 'react';
import { View } from 'react-native';

import { HeroLogo } from '@/components/brand/Logo';
import { Btn } from '@/components/ui/Btn';
import { Txt } from '@/components/ui/Txt';
import { useTheme } from '@/theme/ThemeProvider';

const STEPS = [
  ['01', 'Build a "dating profile" for your product.'],
  ['02', "Like apps you'd use. Match when they like yours."],
  ['03', 'Trade: you use theirs, they use yours.'],
];

export function WelcomeStep({ onContinue }: { onContinue: () => void }) {
  const { c } = useTheme();

  return (
    <View style={{ flex: 1, paddingHorizontal: 28, paddingBottom: 44 }}>
      <View style={{ flex: 1, justifyContent: 'center', gap: 18 }}>
        <Txt size={15.5} weight={600} lh={1.45} muted>
          Building is now the easy part.{'\n'}Finding users is what&apos;s hard!
        </Txt>

        <HeroLogo />

        <Txt size={22} weight={600} lh={1.25} tracking={-0.22}>
          Find your first 100 users.
        </Txt>

        <Txt size={16} lh={1.5} muted style={{ maxWidth: 300 }}>
          It&apos;s a match-making app with other developers.
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
