import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppIcon, Avatar } from '@/components/ui/AppIcon';
import { Btn } from '@/components/ui/Btn';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { Txt } from '@/components/ui/Txt';
import { emailLooksOk, passwordLooksOk, type AuthProviderId } from '@/features/auth/signIn';
import { LegalLink } from '@/features/legal/LegalLinks';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

/** Aliased so the buttons and the sign-in calls cannot drift apart. */
export type AuthProvider = AuthProviderId;

const PROVIDERS: { id: AuthProvider; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { id: 'Apple', icon: 'logo-apple' },
  { id: 'Google', icon: 'logo-google' },
  { id: 'GitHub', icon: 'logo-github' },
];

export function OrRule() {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
      <Txt size={12} muted>
        or
      </Txt>
      <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
    </View>
  );
}

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

export function EmailAuthForm({
  mode,
  pending = false,
  onSubmit,
}: {
  mode: 'sign-up' | 'log-in';
  pending?: boolean;
  onSubmit: (email: string, password: string) => void;
}) {
  const { c } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const signingUp = mode === 'sign-up';

  const submit = () => {
    if (!emailLooksOk(email)) {
      setHint('Enter a real email address.');
      return;
    }
    if (!passwordLooksOk(password)) {
      setHint('Password needs at least 6 characters.');
      return;
    }
    if (signingUp && password !== confirm) {
      setHint('Those passwords do not match.');
      return;
    }
    setHint(null);
    onSubmit(email.trim(), password);
  };

  return (
    <View style={{ gap: 12 }}>
      <Field
        label="Email"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setHint(null);
        }}
        placeholder="you@yourapp.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        editable={!pending}
      />
      <Field
        label="Password"
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          setHint(null);
        }}
        placeholder={signingUp ? 'At least 6 characters' : 'Your password'}
        secureTextEntry
        revealable
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={signingUp ? 'new-password' : 'password'}
        textContentType={signingUp ? 'newPassword' : 'password'}
        editable={!pending}
      />
      {signingUp ? (
        <Field
          label="Confirm password"
          value={confirm}
          onChangeText={(value) => {
            setConfirm(value);
            setHint(null);
          }}
          placeholder="Type it again"
          secureTextEntry
          revealable
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          editable={!pending}
        />
      ) : null}
      {hint ? (
        <Txt size={13} color={c.danger}>
          {hint}
        </Txt>
      ) : null}
      <Btn
        label={pending ? (signingUp ? 'Creating account…' : 'Logging in…') : signingUp ? 'Create account' : 'Log in'}
        variant="surface"
        size="lg"
        full
        disabled={pending}
        onPress={submit}
      />
    </View>
  );
}

/** Quieter than the SSO row. Email is available; it is not the path we push. */
export function EmailOption({
  verb = 'Continue with',
  pending = false,
  onPress,
}: {
  verb?: string;
  pending?: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();

  return (
    <View style={{ gap: 12 }}>
      <OrRule />
      <Pressable
        accessibilityRole="button"
        disabled={pending}
        onPress={onPress}
        style={({ pressed }) => ({
          height: 52,
          borderRadius: radii.pill,
          backgroundColor: c.bg,
          borderWidth: 1.5,
          borderColor: c.line,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          opacity: pending ? 0.5 : pressed ? 0.8 : 1,
        })}
      >
        <Ionicons name="mail-outline" size={18} color={c.ink} />
        <Txt size={15} weight={600}>
          {verb} Email
        </Txt>
      </Pressable>
    </View>
  );
}

export type AuthStepProps = {
  appName: string;
  appHue: number;
  appIcon?: string;
  mediaCount: number;
  promptCount: number;
  username: string;
  realName?: string;
  photo?: string;
  pending?: boolean;
  /** Set when a session already exists, e.g. the app was killed mid-flow. */
  signedIn?: boolean;
  onSignIn: (provider: AuthProvider) => void;
  onEmail: (email: string, password: string) => void;
  onPublish: () => void;
};

function ReadyTag({ label }: { label: string }) {
  const { c } = useTheme();
  return (
    <Chip
      size="sm"
      label={label}
      right={<Ionicons name="checkmark-circle" size={14} color={c.accentText} />}
    />
  );
}

/** Sign-in comes last, once the user has put the work in. */
export function AuthStep({
  appName,
  appHue,
  appIcon,
  mediaCount,
  promptCount,
  username,
  realName,
  photo,
  pending = false,
  signedIn = false,
  onSignIn,
  onEmail,
  onPublish,
}: AuthStepProps) {
  const { c } = useTheme();
  const [emailOpen, setEmailOpen] = useState(false);

  return (
    <View style={{ gap: 18 }}>
      <Txt size={15.5} lh={1.5} muted>
        {signedIn
          ? "You're signed in. Publishing puts this listing in Discover."
          : 'Sign in to save your details and get started'}
      </Txt>

      <Card padding={16} style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <AppIcon hue={appHue} name={appName || 'A'} uri={appIcon} size={52} />
          <View style={{ flex: 1, gap: 8, paddingTop: 2 }}>
            <Txt font="mono" size={15} weight={500} numberOfLines={1}>
              {appName || 'Your app'}
            </Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <ReadyTag label={`${mediaCount} pic${mediaCount === 1 ? '' : 's'}`} />
              <ReadyTag label={`${promptCount} prompt${promptCount === 1 ? '' : 's'}`} />
              <ReadyTag label="Info" />
            </View>
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            borderTopWidth: 1,
            borderColor: c.line,
            paddingTop: 13,
          }}
        >
          <Avatar name={realName || username || 'Y'} seed={username} uri={photo} size={52} />
          <View style={{ flex: 1 }}>
            <Txt size={15} weight={600} numberOfLines={1}>
              {realName || 'You'}
            </Txt>
            <Txt font="mono" size={12.5} muted numberOfLines={1} style={{ marginTop: 2 }}>
              AKA @{username || 'you'}
            </Txt>
          </View>
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
        <View style={{ gap: 14 }}>
          <ProviderButtons onPress={onSignIn} pending={pending} />
          {emailOpen ? (
            <View style={{ gap: 12 }}>
              <OrRule />
              <EmailAuthForm mode="sign-up" pending={pending} onSubmit={onEmail} />
            </View>
          ) : (
            <EmailOption pending={pending} onPress={() => setEmailOpen(true)} />
          )}
        </View>
      )}

      <Txt size={12} lh={1.5} muted center>
        By continuing you agree to the <LegalLink page="terms" size={12} /> and{' '}
        <LegalLink page="privacy" size={12} />.
      </Txt>
    </View>
  );
}
