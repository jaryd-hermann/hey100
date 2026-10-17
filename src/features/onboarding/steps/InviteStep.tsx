import React from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Btn } from '@/components/ui/Btn';
import { Card } from '@/components/ui/Card';
import { Txt } from '@/components/ui/Txt';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radii } from '@/theme/tokens';

export type InviteStepProps = {
  code: string;
  onChangeCode: (code: string) => void;
  redeemed: boolean;
  invitedBy: string | null;
  /** The server decides whether a code is valid, so the step only reports the press. */
  onRedeem: () => void;
  checking?: boolean;
  onWaitlist: () => void;
};

export function InviteStep({
  code,
  onChangeCode,
  redeemed,
  invitedBy,
  onRedeem,
  checking = false,
  onWaitlist,
}: InviteStepProps) {
  const { c } = useTheme();

  return (
    <View style={{ gap: 18 }}>
      <Txt size={15.5} lh={1.5} muted>
        Every builder here was vouched for by another builder. Enter the code you were sent.
      </Txt>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TextInput
          value={code}
          onChangeText={(next) => onChangeCode(next.toUpperCase())}
          placeholder="INVITE CODE"
          placeholderTextColor={c.muted}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={16}
          editable={!redeemed && !checking}
          style={{
            flex: 1,
            height: 58,
            borderRadius: radii.input,
            backgroundColor: c.surface,
            borderWidth: 1.5,
            borderColor: redeemed ? c.accent : c.line,
            paddingHorizontal: 16,
            color: c.ink,
            fontFamily: fonts.monoMedium,
            fontSize: 17,
            letterSpacing: 2.5,
          }}
        />
        <Btn
          label={redeemed ? 'Redeemed' : checking ? 'Checking…' : 'Redeem'}
          variant={redeemed ? 'surface' : 'ink'}
          size="lg"
          disabled={redeemed || checking || !code.trim()}
          onPress={onRedeem}
        />
      </View>

      {redeemed ? (
        <Card tone="soft" padding={14}>
          <Txt size={14.5} weight={600} color={c.accentText}>
            Invited by {invitedBy} · you both get +3 matches
          </Txt>
        </Card>
      ) : null}

      <Pressable onPress={onWaitlist} style={{ paddingVertical: 6 }}>
        <Txt size={14.5} weight={600} style={{ textDecorationLine: 'underline' }}>
          No code? Join the waitlist
        </Txt>
      </Pressable>
    </View>
  );
}
