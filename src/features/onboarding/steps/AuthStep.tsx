import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { Card } from '@/components/ui/Card';
import { Label, Txt } from '@/components/ui/Txt';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

export type AuthProvider = 'Apple' | 'Google' | 'GitHub';

const PROVIDERS: { id: AuthProvider; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { id: 'Apple', icon: 'logo-apple' },
  { id: 'Google', icon: 'logo-google' },
  { id: 'GitHub', icon: 'logo-github' },
];

/** Shared so signing up and logging back in can never drift apart. */
export function ProviderButtons({
  onPress,
  verb = 'Continue with',
}: {
  onPress: (provider: AuthProvider) => void;
  verb?: string;
}) {
  const { c } = useTheme();

  return (
    <View style={{ gap: 10 }}>
      {PROVIDERS.map((provider) => (
        <Pressable
          key={provider.id}
          accessibilityRole="button"
          onPress={() => onPress(provider.id)}
          style={({ pressed }) => ({
            height: 56,
            borderRadius: radii.pill,
            backgroundColor: provider.id === 'Apple' ? c.ink : c.surface,
            borderWidth: provider.id === 'Apple' ? 0 : 1.5,
            borderColor: c.line,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Ionicons name={provider.icon} size={19} color={provider.id === 'Apple' ? c.bg : c.ink} />
          <Txt size={15.5} weight={600} color={provider.id === 'Apple' ? c.bg : c.ink}>
            {verb} {provider.id}
          </Txt>
        </Pressable>
      ))}
    </View>
  );
}

export type AuthStepProps = {
  appName: string;
  appSub: string;
  appHue: number;
  promptCount: number;
  shots: number;
  onSignIn: (provider: AuthProvider) => void;
};

/** Sign-in comes last, once the user has put the work in. */
export function AuthStep({
  appName,
  appSub,
  appHue,
  promptCount,
  shots,
  onSignIn,
}: AuthStepProps) {
  const { c } = useTheme();

  return (
    <View style={{ gap: 18 }}>
      <Txt size={15.5} lh={1.5} muted>
        Sign in so your listing is saved and you can get back to it.
      </Txt>

      <Card padding={16} style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <AppIcon hue={appHue} name={appName || 'A'} size={52} />
          <View style={{ flex: 1 }}>
            <Txt font="mono" size={15} weight={500} numberOfLines={1}>
              {appName || 'Your app'}
            </Txt>
            <Txt size={13.5} muted numberOfLines={1}>
              {appSub || 'Ready to publish'}
            </Txt>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 20, borderTopWidth: 1, borderColor: c.line, paddingTop: 13 }}>
          <View>
            <Label>Screenshots</Label>
            <Txt font="mono" size={16} weight={500}>
              {shots}
            </Txt>
          </View>
          <View>
            <Label>Prompts</Label>
            <Txt font="mono" size={16} weight={500}>
              {promptCount}
            </Txt>
          </View>
        </View>
      </Card>

      <ProviderButtons onPress={onSignIn} />

      <Txt size={12} lh={1.5} muted center>
        By continuing you agree to the Terms of Use and Privacy Policy.
      </Txt>
    </View>
  );
}
