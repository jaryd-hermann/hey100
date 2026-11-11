import React, { useRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Avatar } from '@/components/ui/AppIcon';
import { Txt } from '@/components/ui/Txt';
import { openLegal } from '@/lib/legal';
import { fonts } from '@/theme/tokens';

import { LIME } from '../look';
import { generateUsername } from '../useOnboardingDraft';
import type { UsernameState } from '../useUsernameState';

const INK = '#111111';

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
  const usernameRef = useRef<TextInput>(null);
  const realName = [firstName, lastName].map((part) => part.trim()).filter(Boolean).join(' ');

  const cleanUsername = (next: string) =>
    onChangeUsername(next.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20));

  return (
    <View style={{ gap: 16 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={photo ? 'Change your photo' : 'Add a photo'}
        onPress={onPickPhoto}
        style={{ width: 98, height: 96, alignSelf: 'flex-start' }}
      >
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: 4,
            width: 92,
            height: 92,
            borderRadius: 46,
            backgroundColor: INK,
          }}
        />
        <View
          style={{
            width: 92,
            height: 92,
            borderRadius: 46,
            borderWidth: 2,
            borderColor: INK,
            overflow: 'hidden',
            backgroundColor: '#FFFFFF',
          }}
        >
          <Avatar name={realName || username || 'You'} seed={username} uri={photo} size={92} />
        </View>
        <View
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            paddingVertical: 4,
            paddingHorizontal: 9,
            borderRadius: 10,
            backgroundColor: INK,
          }}
        >
          <Txt size={11} weight={700} color="#FFFFFF">
            Edit
          </Txt>
        </View>
      </Pressable>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <NameField label="First name" value={firstName} onChange={onChangeFirstName} given />
        <NameField label="Last name" value={lastName} onChange={onChangeLastName} />
      </View>

      <View style={{ gap: 6 }}>
        <Txt size={13.5} weight={700} color={INK}>
          Username
        </Txt>
        <View style={{ marginBottom: 3 }}>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 3,
              bottom: -3,
              borderRadius: 16,
              backgroundColor: INK,
            }}
          />
          <View
            style={{
              height: 54,
              paddingLeft: 14,
              paddingRight: 6,
              borderRadius: 16,
              borderWidth: 2,
              borderColor: INK,
              backgroundColor: '#FFFFFF',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Txt font="mono" size={16} weight={700} color={INK}>
              @
            </Txt>
            <TextInput
              ref={usernameRef}
              value={username}
              onChangeText={cleanUsername}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
              style={{
                flex: 1,
                minWidth: 0,
                height: 50,
                color: INK,
                fontFamily: fonts.monoSemi,
                fontSize: 16,
              }}
            />
            <Pressable
              onPress={() => usernameRef.current?.focus()}
              style={{
                height: 38,
                paddingHorizontal: 12,
                borderRadius: 11,
                borderWidth: 1.5,
                borderColor: INK,
                backgroundColor: '#FFFFFF',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Txt size={13} weight={700} color={INK}>
                Edit
              </Txt>
            </Pressable>
            <Pressable
              onPress={() => onChangeUsername(generateUsername())}
              style={{
                height: 38,
                paddingHorizontal: 12,
                borderRadius: 11,
                backgroundColor: INK,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Txt size={13} weight={700} color="#FFFFFF">
                Shuffle
              </Txt>
            </Pressable>
          </View>
        </View>
        <Txt size={12.5} lh={1.4} color={INK}>
          Lowercase letters, numbers and underscores. Up to 20.
        </Txt>
        {state === 'taken' ? (
          <Txt size={12.5} lh={1.4} color="#FF0000">
            @{username} is taken. Try another, or shuffle.
          </Txt>
        ) : null}
      </View>

      <View style={{ gap: 8 }}>
        <Txt size={13.5} weight={700} color={INK}>
          In Discover and public groups, show my:
        </Txt>
        <View
          style={{
            flexDirection: 'row',
            padding: 4,
            borderRadius: 16,
            backgroundColor: '#FFFFFF',
            borderWidth: 2,
            borderColor: INK,
          }}
        >
          <ShowOption
            label="Username"
            preview={`@${username || 'you'}`}
            selected={showAs === 'username'}
            onPress={() => onChangeShowAs('username')}
          />
          <ShowOption
            label="Real name"
            preview={realName || 'Your name'}
            selected={showAs === 'realName'}
            onPress={() => onChangeShowAs('realName')}
          />
        </View>
        <Txt size={13} lh={1.4} color={INK}>
          Your real name is only shown once you match and start chatting.
        </Txt>
      </View>

      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: terms }}
          onPress={onToggleTerms}
          hitSlop={8}
        >
          <View
            style={{
              width: 26,
              height: 26,
              borderRadius: 8,
              borderWidth: 2,
              borderColor: INK,
              backgroundColor: terms ? LIME : '#FFFFFF',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {terms ? (
              <Txt size={14} weight={700} color={INK}>
                ✓
              </Txt>
            ) : null}
          </View>
        </Pressable>
        <Txt size={13.5} weight={500} lh={1.45} color={INK} style={{ flex: 1 }}>
          I agree to the{' '}
          <Txt
            size={13.5}
            weight={500}
            color={INK}
            accessibilityRole="link"
            onPress={() => openLegal('terms')}
            style={{ textDecorationLine: 'underline' }}
          >
            Terms
          </Txt>
          , acknowledge the{' '}
          <Txt
            size={13.5}
            weight={500}
            color={INK}
            accessibilityRole="link"
            onPress={() => openLegal('privacy')}
            style={{ textDecorationLine: 'underline' }}
          >
            Privacy Policy
          </Txt>
          , and confirm I'm at least 13.
        </Txt>
      </View>
    </View>
  );
}

function NameField({
  label,
  value,
  onChange,
  given,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  given?: boolean;
}) {
  return (
    <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
      <Txt size={13.5} weight={700} color={INK}>
        {label}
      </Txt>
      <View style={{ marginBottom: 3 }}>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 3,
            bottom: -3,
            borderRadius: 15,
            backgroundColor: INK,
          }}
        />
        <TextInput
          value={value}
          onChangeText={onChange}
          autoCapitalize="words"
          autoCorrect={false}
          textContentType={given ? 'givenName' : 'familyName'}
          autoComplete={given ? 'name-given' : 'name-family'}
          style={{
            height: 50,
            paddingHorizontal: 14,
            borderRadius: 15,
            borderWidth: 2,
            borderColor: INK,
            backgroundColor: '#FFFFFF',
            color: INK,
            fontFamily: fonts.bodySemi,
            fontSize: 15.5,
          }}
        />
      </View>
    </View>
  );
}

function ShowOption({
  label,
  preview,
  selected,
  onPress,
}: {
  label: string;
  preview: string;
  selected: boolean;
  onPress: () => void;
}) {
  const fg = selected ? '#FFFFFF' : INK;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={{
        flex: 1,
        height: 44,
        borderRadius: 11,
        backgroundColor: selected ? INK : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Txt size={14} weight={700} color={fg}>
        {label}
      </Txt>
      <Txt font="mono" size={10.5} weight={500} color={fg} style={{ opacity: 0.75 }}>
        {preview}
      </Txt>
    </Pressable>
  );
}
