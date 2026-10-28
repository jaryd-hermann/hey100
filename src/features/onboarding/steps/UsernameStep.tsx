import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Avatar } from '@/components/ui/AppIcon';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Txt } from '@/components/ui/Txt';
import { LegalLink } from '@/features/legal/LegalLinks';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radii } from '@/theme/tokens';

import { USERNAME_PATTERN, generateUsername } from '../useOnboardingDraft';
import type { UsernameState } from '../useUsernameState';

export type UsernameStepProps = {
  firstName: string;
  lastName: string;
  onChangeFirstName: (firstName: string) => void;
  onChangeLastName: (lastName: string) => void;
  photo?: string;
  /** Null while the pick is in flight, so the avatar can show it is busy. */
  onPickPhoto: () => void;
  username: string;
  onChangeUsername: (username: string) => void;
  showAs: 'username' | 'realName';
  onChangeShowAs: (showAs: 'username' | 'realName') => void;
  /** Server-checked availability, so a collision surfaces before sign-in. */
  state: UsernameState;
  terms: boolean;
  onToggleTerms: () => void;
};

export function UsernameStep({
  firstName,
  lastName,
  onChangeFirstName,
  onChangeLastName,
  photo,
  onPickPhoto,
  username,
  onChangeUsername,
  showAs,
  onChangeShowAs,
  state,
  terms,
  onToggleTerms,
}: UsernameStepProps) {
  const { c } = useTheme();
  const [editing, setEditing] = useState(false);

  const valid = USERNAME_PATTERN.test(username);
  const taken = state === 'taken';
  const realName = [firstName, lastName].map((part) => part.trim()).filter(Boolean).join(' ');

  return (
    <View style={{ gap: 16 }}>
      <Txt font="mono" size={27} weight={500} lh={1.22}>
        Claim your @username to get started{' '}
        <Ionicons name="checkmark-circle" size={24} color={c.accentText} />
      </Txt>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Field
          label="First name"
          value={firstName}
          onChangeText={onChangeFirstName}
          placeholder="First"
          autoCapitalize="words"
          autoCorrect={false}
          textContentType="givenName"
          autoComplete="name-given"
          style={{ flex: 1 }}
        />
        <Field
          label="Last name"
          value={lastName}
          onChangeText={onChangeLastName}
          placeholder="Last"
          autoCapitalize="words"
          autoCorrect={false}
          textContentType="familyName"
          autoComplete="name-family"
          style={{ flex: 1 }}
        />
      </View>

      <Card padding={16} style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={photo ? 'Change your photo' : 'Add a photo'}
            onPress={onPickPhoto}
            style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
          >
            <Avatar name={realName || username} seed={username} uri={photo} size={56} />
            <View
              style={{
                position: 'absolute',
                right: -2,
                bottom: -2,
                paddingHorizontal: 6,
                height: 20,
                borderRadius: 10,
                backgroundColor: c.ink,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Txt font="mono" size={9} weight={700} color={c.bg} upper>
                {photo ? 'Edit' : 'Add'}
              </Txt>
            </View>
          </Pressable>

          <View style={{ flex: 1 }}>
            {editing ? (
              <TextInput
                value={username}
                onChangeText={(next) => onChangeUsername(next.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
                onBlur={() => setEditing(false)}
                style={{
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: c.bg,
                  borderWidth: 1.5,
                  borderColor: valid && !taken ? c.line : c.danger,
                  paddingHorizontal: 10,
                  color: c.ink,
                  fontFamily: fonts.monoMedium,
                  fontSize: 16,
                }}
              />
            ) : (
              <Txt font="mono" size={17} weight={500}>
                @{username}
              </Txt>
            )}

            <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
              <Pressable onPress={() => setEditing(true)} hitSlop={8}>
                <Txt size={13} weight={600} color={c.accentText}>
                  ✎ Edit
                </Txt>
              </Pressable>
              <Pressable onPress={() => onChangeUsername(generateUsername())} hitSlop={8}>
                <Txt size={13} weight={600} color={c.accentText}>
                  ↻ Shuffle
                </Txt>
              </Pressable>
            </View>
          </View>
        </View>

        {!valid ? (
          <Txt size={12.5} color={c.danger}>
            Lowercase letters, numbers and underscores, up to 20 characters.
          </Txt>
        ) : state === 'taken' ? (
          <Txt size={12.5} color={c.danger}>
            @{username} is taken. Try another, or shuffle.
          </Txt>
        ) : state === 'checking' ? (
          <Txt size={12.5} muted>
            Checking…
          </Txt>
        ) : state === 'available' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="checkmark-circle" size={16} color={c.accentText} />
            <Txt size={12.5} color={c.accentText}>
              @{username} is yours
            </Txt>
          </View>
        ) : null}
      </Card>

      <Card padding={16} style={{ gap: 12 }}>
        <Txt size={14.5} weight={600}>
          In Discover, show my:
        </Txt>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(
            [
              ['username', 'Username'],
              ['realName', 'Real name'],
            ] as const
          ).map(([key, label]) => {
            const active = showAs === key;
            return (
              <Pressable
                key={key}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                onPress={() => onChangeShowAs(key)}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: radii.pill,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: active ? c.ink : 'transparent',
                  borderWidth: 1.5,
                  borderColor: active ? c.ink : c.line,
                }}
              >
                <Txt size={14} weight={600} color={active ? c.bg : c.ink}>
                  {label}
                </Txt>
              </Pressable>
            );
          })}
        </View>

        <Txt size={12.5} lh={1.45} muted>
          Your real name is only shown once you match and start chatting.
        </Txt>
      </Card>

      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 4 }}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: terms }}
          onPress={onToggleTerms}
          hitSlop={8}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              borderWidth: 1.5,
              borderColor: terms ? c.ink : c.muted,
              backgroundColor: terms ? c.ink : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 1,
            }}
          >
            {terms ? (
              <Txt size={13} weight={700} color={c.bg}>
                ✓
              </Txt>
            ) : null}
          </View>
        </Pressable>
        <Txt size={13.5} lh={1.5} muted style={{ flex: 1 }}>
          I agree to the <LegalLink page="terms" size={13.5} />, acknowledge the{' '}
          <LegalLink page="privacy" size={13.5} />, and confirm I&apos;m at least 13.
        </Txt>
      </View>
    </View>
  );
}
