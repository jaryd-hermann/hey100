import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppIcon, Avatar } from '@/components/ui/AppIcon';
import { Btn } from '@/components/ui/Btn';
import { Field } from '@/components/ui/Field';
import { Txt } from '@/components/ui/Txt';
import { emailLooksOk, passwordLooksOk, type AuthProviderId } from '@/features/auth/signIn';
import { LIME } from '@/features/onboarding/look';
import { openLegal } from '@/lib/legal';
import { ThemeOverride, useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

const COIN = require('../../../../assets/images/block-coin.png');
const INK = '#111111';

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
        variant={signingUp ? 'accent' : 'surface'}
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
  /** Block Points already earned. Signing in is what keeps them. */
  blocks?: number;
  pending?: boolean;
  /** Set when a session already exists, e.g. the app was killed mid-flow. */
  signedIn?: boolean;
  onSignIn: (provider: AuthProvider) => void;
  onEmail: (email: string, password: string) => void;
  onPublish: () => void;
};

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
  blocks = 0,
  pending = false,
  signedIn = false,
  onSignIn,
  onEmail,
  onPublish,
}: AuthStepProps) {
  const [emailOpen, setEmailOpen] = useState(false);
  const shots = `${mediaCount} screenshot${mediaCount === 1 ? '' : 's'}`;
  const prompts = `${promptCount} prompt${promptCount === 1 ? '' : 's'}`;

  return (
    <View style={{ gap: 12 }}>
      <View style={{ marginBottom: 8, transform: [{ rotate: '-1.2deg' }] }}>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 5,
            bottom: -5,
            borderRadius: 22,
            backgroundColor: LIME,
          }}
        />
        <View
          style={{
            padding: 16,
            borderRadius: 22,
            backgroundColor: '#3C3C3B',
            borderWidth: 2,
            borderColor: INK,
            gap: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 13,
                borderWidth: 2,
                borderColor: INK,
                overflow: 'hidden',
              }}
            >
              <AppIcon hue={appHue} name={appName || 'A'} uri={appIcon} size={48} />
            </View>
            <View style={{ flex: 1, gap: 1 }}>
              <Txt font="mono" size={16} weight={700} color="#FFFFFF" numberOfLines={1}>
                {appName || 'Your app'}
              </Txt>
              <Txt font="mono" size={11.5} weight={500} color="rgba(255,255,255,0.62)" numberOfLines={1}>
                {shots} · {prompts}
              </Txt>
            </View>
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingTop: 11,
              borderTopWidth: 1.5,
              borderTopColor: 'rgba(255,255,255,0.14)',
            }}
          >
            <View style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: '#FFFFFF', overflow: 'hidden' }}>
              <Avatar name={realName || username || 'You'} seed={username} uri={photo} size={32} />
            </View>
            <Txt size={14} weight={700} color="#FFFFFF" numberOfLines={1}>
              {realName || 'You'}
            </Txt>
            <Txt font="mono" size={12.5} weight={500} color="rgba(255,255,255,0.62)" numberOfLines={1}>
              @{username || 'you'}
            </Txt>
          </View>
          {blocks > 0 ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingTop: 11,
                borderTopWidth: 1.5,
                borderTopColor: 'rgba(255,255,255,0.14)',
              }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: LIME,
                  borderWidth: 2,
                  borderColor: INK,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Image source={COIN} style={{ width: 22, height: 22 }} contentFit="contain" />
              </View>
              <Txt font="mono" size={16} weight={700} color="#FFFFFF">
                {blocks.toLocaleString()}
              </Txt>
              <Txt font="mono" size={11} weight={600} color="rgba(255,255,255,0.62)" tracking={0.6} style={{ flex: 1 }}>
                BLOCKS · SIGN IN TO KEEP THEM
              </Txt>
            </View>
          ) : null}
        </View>
      </View>

      {signedIn ? (
        <Pressable
          accessibilityRole="button"
          disabled={pending}
          onPress={onPublish}
          style={({ pressed }) => ({
            height: 54,
            borderRadius: 27,
            backgroundColor: LIME,
            borderWidth: 2,
            borderColor: INK,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pending ? 0.5 : pressed ? 0.85 : 1,
          })}
        >
          <Txt size={16} weight={700} color={INK}>
            {pending ? 'Publishing…' : 'Publish my listing'}
          </Txt>
        </Pressable>
      ) : (
        <View style={{ gap: 10 }}>
          {PROVIDERS.map((provider) => (
            <View key={provider.id}>
              <Pressable
                accessibilityRole="button"
                disabled={pending}
                onPress={() => onSignIn(provider.id)}
                style={({ pressed }) => ({
                  height: 54,
                  borderRadius: 27,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 2,
                  borderColor: '#FFFFFF',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  opacity: pending ? 0.5 : pressed ? 0.85 : 1,
                })}
              >
                <Ionicons name={provider.icon} size={20} color={INK} />
                <Txt size={16} weight={700} color={INK}>
                  Continue with {provider.id}
                </Txt>
              </Pressable>
              {provider.id === 'Apple' ? (
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    top: -8,
                    right: 18,
                    paddingHorizontal: 7,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: '#FFFF00',
                    borderWidth: 1.5,
                    borderColor: INK,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Txt font="mono" size={9} weight={700} color={INK} tracking={0.4}>
                    MOST USED
                  </Txt>
                </View>
              ) : null}
            </View>
          ))}
          {emailOpen ? (
            <ThemeOverride
              isDark={false}
              c={{
                bg: '#FFFFFF',
                surface: '#FFFFFF',
                raised: '#F2F3EF',
                ink: INK,
                muted: 'rgba(17,17,17,0.62)',
                line: 'rgba(17,17,17,0.2)',
                accent: LIME,
                accentInk: INK,
              }}
            >
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 18,
                  borderWidth: 2,
                  borderColor: '#FFFFFF',
                  padding: 14,
                }}
              >
                <EmailAuthForm mode="sign-up" pending={pending} onSubmit={onEmail} />
              </View>
            </ThemeOverride>
          ) : (
            <Pressable
              accessibilityRole="button"
              disabled={pending}
              onPress={() => setEmailOpen(true)}
              style={({ pressed }) => ({
                height: 54,
                borderRadius: 27,
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderColor: 'rgba(255,255,255,0.4)',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pending ? 0.5 : pressed ? 0.85 : 1,
              })}
            >
              <Txt size={16} weight={700} color="#FFFFFF">
                or Continue with Email
              </Txt>
            </Pressable>
          )}
        </View>
      )}

      <Txt size={12.5} lh={1.45} color="rgba(255,255,255,0.8)" center style={{ paddingTop: 10 }}>
        By continuing you agree to the{' '}
        <Txt size={12.5} color="rgba(255,255,255,0.8)" accessibilityRole="link" onPress={() => openLegal('terms')} style={{ textDecorationLine: 'underline' }}>
          Terms
        </Txt>{' '}
        and{' '}
        <Txt size={12.5} color="rgba(255,255,255,0.8)" accessibilityRole="link" onPress={() => openLegal('privacy')} style={{ textDecorationLine: 'underline' }}>
          Privacy Policy
        </Txt>
        .
      </Txt>
    </View>
  );
}
