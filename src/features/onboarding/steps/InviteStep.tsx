import React from 'react';
import { TextInput, View } from 'react-native';

import { Txt } from '@/components/ui/Txt';
import { fonts } from '@/theme/tokens';

import { INK, LIME } from '../look';

export type InviteStepProps = {
  code: string;
  onChangeCode: (code: string) => void;
  redeemed: boolean;
  invitedBy: string | null;
  checking?: boolean;
};

/** The HTML invite card: a white sticker with a dashed code field. */
export function InviteStep({ code, onChangeCode, redeemed, invitedBy, checking = false }: InviteStepProps) {
  return (
    <View style={{ gap: 16 }}>
      <View>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 5,
            bottom: -5,
            borderRadius: 22,
            backgroundColor: INK,
          }}
        />
        <View
          style={{
            paddingVertical: 20,
            paddingHorizontal: 18,
            borderRadius: 22,
            backgroundColor: '#FFFFFF',
            borderWidth: 2,
            borderColor: INK,
            gap: 10,
          }}
        >
          <Txt font="mono" size={10.5} weight={700} color="#5B625C" tracking={1.05}>
            INVITE CODE
          </Txt>
          <TextInput
            value={code}
            onChangeText={(next) => onChangeCode(next.toUpperCase())}
            placeholder="ABCD-123"
            placeholderTextColor="rgba(17,17,17,0.42)"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={16}
            editable={!redeemed && !checking}
            style={{
              height: 56,
              borderRadius: 15,
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: INK,
              backgroundColor: '#F4F5F1',
              paddingHorizontal: 16,
              color: INK,
              fontFamily: fonts.monoBold,
              fontSize: 22,
              letterSpacing: 1.76,
            }}
          />
        </View>
      </View>

      {redeemed ? (
        <View style={{ transform: [{ rotate: '-1.5deg' }] }}>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 5,
              bottom: -5,
              borderRadius: 20,
              backgroundColor: INK,
            }}
          />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              padding: 14,
              borderRadius: 20,
              backgroundColor: LIME,
              borderWidth: 2,
              borderColor: INK,
            }}
          >
            <Txt font="logo" size={30} color={INK}>
              +3
            </Txt>
            <Txt size={15} weight={700} lh={1.35} color={INK} style={{ flex: 1 }}>
              Invited by {invitedBy || 'a builder'} · you both get +3 matches.
            </Txt>
          </View>
        </View>
      ) : null}
    </View>
  );
}
