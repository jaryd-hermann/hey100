import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, View } from 'react-native';

import { AppIcon, Avatar } from '@/components/ui/AppIcon';
import { Card } from '@/components/ui/Card';
import { Txt } from '@/components/ui/Txt';
import type { AuthProviderId } from '@/features/auth/signIn';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

/** Aliased so the buttons and the sign-in calls cannot drift apart. */
export type AuthProvider = AuthProviderId;

const PROVIDERS: { id: AuthProvider; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { id: 'Apple', icon: 'logo-apple' },
  { id: 'Google', icon: 'logo-google' },
  { id: 'GitHub', icon: 'logo-github' },
];

/** Shared so signing up and logging back in can never drift apart. */
export function ProviderButtons({
  onPress,
  verb = 'Continue with',
  pending = false,
}: {
  onPress: (provider: AuthProvider) => void;
  verb?: string;
  /** Stops a second provider being started while one is still in flight. */
  pending?: boolean;
}) {
  const { c } = useTheme();

  return (
    <View style={{ gap: 10 }}>
      {PROVIDERS.map((provider) => (
        <Pressable
          key={provider.id}
          accessibilityRole="button"
          disabled={pending}
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
            opacity: pending ? 0.5 : pressed ? 0.8 : 1,
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
  appIcon?: string;
  username: string;
  realName?: string;
  photo?: string;
  pending?: boolean;
  /** Set when a session already exists, e.g. the app was killed mid-flow. */
  signedIn?: boolean;
  onSignIn: (provider: AuthProvider) => void;
  onPublish: () => void;
};

/** Sign-in comes last, once the user has put the work in. */
export function AuthStep({
  appName,
  appSub,
  appHue,
  appIcon,
  username,
  realName,
  photo,
  pending = false,
  signedIn = false,
  onSignIn,
  onPublish,
}: AuthStepProps) {
  const { c } = useTheme();

  return (
    <View style={{ gap: 18 }}>
      <Txt size={15.5} lh={1.5} muted>
        {signedIn
          ? "You're signed in. Publishing puts this listing in Discover."
          : 'Sign in to save your details and get started'}
      </Txt>

      <Card padding={16} style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <AppIcon hue={appHue} name={appName || 'A'} uri={appIcon} size={52} />
          <View style={{ flex: 1 }}>
            <Txt font="mono" size={15} weight={500} numberOfLines={1}>
              {appName || 'Your app'}
            </Txt>
            <Txt size={13.5} muted numberOfLines={1}>
              {appSub || 'Ready to publish'}
            </Txt>
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            borderTopWidth: 1,
            borderColor: c.line,
            paddingTop: 13,
          }}
        >
          <Avatar name={realName || username || 'Y'} uri={photo} size={28} />
          <Txt font="mono" size={14} weight={500} numberOfLines={1} style={{ flex: 1 }}>
            @{username || 'you'}
          </Txt>
        </View>
      </Card>

      {signedIn ? (
        <Pressable
          accessibilityRole="button"
          disabled={pending}
          onPress={onPublish}
          style={({ pressed }) => ({
            height: 56,
            borderRadius: radii.pill,
            backgroundColor: c.ink,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pending ? 0.5 : pressed ? 0.8 : 1,
          })}
        >
          <Txt size={15.5} weight={600} color={c.bg}>
            {pending ? 'Publishing…' : 'Publish my listing'}
          </Txt>
        </Pressable>
      ) : (
        <ProviderButtons onPress={onSignIn} pending={pending} />
      )}

      <Txt size={12} lh={1.5} muted center>
        By continuing you agree to the Terms of Use and Privacy Policy.
      </Txt>
    </View>
  );
}
