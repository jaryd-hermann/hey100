import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Avatar } from '@/components/ui/AppIcon';
import { Card } from '@/components/ui/Card';
import { Txt } from '@/components/ui/Txt';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radii } from '@/theme/tokens';

import { USERNAME_PATTERN, generateUsername } from '../useOnboardingDraft';

export type UsernameStepProps = {
  realName: string;
  username: string;
  onChangeUsername: (username: string) => void;
  showAs: 'username' | 'realName';
  onChangeShowAs: (showAs: 'username' | 'realName') => void;
  terms: boolean;
  onToggleTerms: () => void;
};

export function UsernameStep({
  realName,
  username,
  onChangeUsername,
  showAs,
  onChangeShowAs,
  terms,
  onToggleTerms,
}: UsernameStepProps) {
  const { c } = useTheme();
  const [editing, setEditing] = useState(false);

  const valid = USERNAME_PATTERN.test(username);

  return (
    <View style={{ gap: 16 }}>
      <Card padding={16} style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Avatar name={realName} size={56} />

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
                  borderColor: valid ? c.line : c.danger,
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

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: terms }}
        onPress={onToggleTerms}
        style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 4 }}
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
        <Txt size={13.5} lh={1.5} muted style={{ flex: 1 }}>
          I agree to the Terms of Use, acknowledge the Privacy Policy, and confirm I&apos;m at least
          18.
        </Txt>
      </Pressable>
    </View>
  );
}
