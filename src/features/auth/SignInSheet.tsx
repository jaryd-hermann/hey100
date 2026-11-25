import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Field } from '@/components/ui/Field';
import { Sheet } from '@/components/ui/Sheet';
import { Txt } from '@/components/ui/Txt';
import { openLegal } from '@/lib/legal';
import { ThemeOverride } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

import {
  emailLooksOk,
  passwordLooksOk,
  signIn,
  SignInError,
  signInWithPassword,
  signUpWithPassword,
  type SignInOutcome,
} from './signIn';

const INK = '#111111';
const APPLE = require('../../../assets/images/glyphs/apple-white.svg');

/** The sheet is white, so inputs inside it take a light palette. */
const LIGHT = {
  bg: '#FFFFFF',
  surface: '#F2F3EF',
  raised: '#E6E9E2',
  ink: INK,
  muted: '#5B625C',
  line: 'rgba(17,17,17,0.16)',
  accentText: INK,
  danger: '#D5342A',
};

type Mode = 'choose' | 'sign-up' | 'log-in';

export function SignInSheet({
  visible,
  onClose,
  onSignedIn,
}: {
  visible: boolean;
  onClose: () => void;
  onSignedIn: (outcome: Extract<SignInOutcome, { status: 'signed-in' }>) => void;
}) {
  const [mode, setMode] = useState<Mode>('choose');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const run = async (attempt: () => Promise<SignInOutcome>) => {
    setPending(true);
    setError(null);
    try {
      const outcome = await attempt();
      if (outcome.status === 'signed-in') onSignedIn(outcome);
      else if (outcome.status === 'unavailable') setError('Sign-in is not configured in this build.');
    } catch (caught) {
      setError(caught instanceof SignInError ? caught.message : 'Sign-in failed. Try again.');
    } finally {
      setPending(false);
    }
  };

  const submitEmail = () => {
    if (!emailLooksOk(email)) return setError('Enter a real email address.');
    if (!passwordLooksOk(password)) return setError('Password needs at least 6 characters.');
    void run(() => (mode === 'sign-up' ? signUpWithPassword(email, password) : signInWithPassword(email, password)));
  };

  return (
    <Sheet
      visible={visible}
      onClose={pending ? () => {} : onClose}
      onClosed={() => {
        setMode('choose');
        setError(null);
        setPassword('');
      }}
      light
    >
      <ThemeOverride c={LIGHT} isDark={false}>
        <View style={{ gap: 10, paddingBottom: 6 }}>
          <Txt font="mono" size={22} weight={500} color={INK} tracking={-0.9} style={{ paddingTop: 6, paddingBottom: 4 }}>
            {mode === 'log-in' ? 'Log in with email' : mode === 'sign-up' ? 'Sign up with email' : 'Sign in to htg.chat'}
          </Txt>

          {mode === 'choose' ? (
            <>
              <PillButton
                dark
                label="Continue with Apple"
                icon={<Image source={APPLE} style={{ width: 18, height: 18 }} />}
                disabled={pending}
                onPress={() => void run(() => signIn('Apple'))}
              />
              <PillButton
                label="Continue with Google"
                icon={
                  <Txt size={17} weight={700} color="#4285F4">
                    G
                  </Txt>
                }
                disabled={pending}
                onPress={() => void run(() => signIn('Google'))}
              />
              <PillButton
                label="Continue with email"
                icon={<Ionicons name="mail-outline" size={18} color={INK} />}
                disabled={pending}
                onPress={() => {
                  setError(null);
                  setMode('sign-up');
                }}
              />
            </>
          ) : (
            <View style={{ gap: 10 }}>
              <Field
                label="Email"
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  setError(null);
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
                  setError(null);
                }}
                placeholder={mode === 'sign-up' ? 'At least 6 characters' : 'Your password'}
                secureTextEntry
                revealable
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete={mode === 'sign-up' ? 'new-password' : 'password'}
                textContentType={mode === 'sign-up' ? 'newPassword' : 'password'}
                editable={!pending}
                onSubmitEditing={submitEmail}
              />
              <PillButton
                dark
                label={pending ? 'One sec…' : mode === 'sign-up' ? 'Create account' : 'Log in'}
                disabled={pending}
                onPress={submitEmail}
              />
              <Txt
                size={14}
                weight={600}
                color={INK}
                center
                accessibilityRole="button"
                onPress={() => {
                  setError(null);
                  setMode(mode === 'sign-up' ? 'log-in' : 'sign-up');
                }}
                style={{ padding: 8 }}
              >
                {mode === 'sign-up' ? 'I already have an account' : 'Create a new account'}
              </Txt>
            </View>
          )}

          {error ? (
            <Txt size={13} color={LIGHT.danger} center>
              {error}
            </Txt>
          ) : null}

          <Txt size={11.5} color={LIGHT.muted} center lh={1.45} style={{ paddingTop: 4 }}>
            By continuing you agree to the{' '}
            <Txt size={11.5} color={LIGHT.muted} accessibilityRole="link" onPress={() => openLegal('terms')} style={{ textDecorationLine: 'underline' }}>
              Terms
            </Txt>{' '}
            and{' '}
            <Txt size={11.5} color={LIGHT.muted} accessibilityRole="link" onPress={() => openLegal('privacy')} style={{ textDecorationLine: 'underline' }}>
              Privacy Policy
            </Txt>
            .
          </Txt>
        </View>
      </ThemeOverride>
    </Sheet>
  );
}

function PillButton({
  label,
  icon,
  dark = false,
  disabled,
  onPress,
}: {
  label: string;
  icon?: React.ReactNode;
  dark?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        height: 54,
        borderRadius: radii.pill,
        backgroundColor: dark ? INK : '#FFFFFF',
        borderWidth: dark ? 0 : 2,
        borderColor: INK,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
      })}
    >
      {icon}
      <Txt size={15.5} weight={700} color={dark ? '#FFFFFF' : INK}>
        {label}
      </Txt>
    </Pressable>
  );
}
