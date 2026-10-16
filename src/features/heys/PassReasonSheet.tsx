import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Btn } from '@/components/ui/Btn';
import { Field } from '@/components/ui/Field';
import { OptionRow } from '@/components/ui/OptionRow';
import { Sheet } from '@/components/ui/Sheet';
import { Txt } from '@/components/ui/Txt';
import { PASS_REASONS, type PassReason } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';

export type PassReasonSheetProps = {
  visible: boolean;
  appName: string;
  /**
   * Dismissing the sheet still passes, with no reason, so a tap on Pass is
   * never swallowed by a sheet the user swiped away.
   */
  onClose: (stopAsking: boolean) => void;
  onSubmit: (reason: string, stopAsking: boolean) => void;
};

/** Captures an optional "why" after a pass. The pass itself already happened. */
export function PassReasonSheet({ visible, appName, onClose, onSubmit }: PassReasonSheetProps) {
  const { c } = useTheme();
  const [reason, setReason] = useState<PassReason | null>(null);
  const [other, setOther] = useState('');
  const [stopAsking, setStopAsking] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setReason(null);
    setOther('');
    setStopAsking(false);
  }, [visible]);

  const resolved =
    reason === 'Something else' && other.trim() ? other.trim() : (reason ?? '');

  return (
    <Sheet visible={visible} onClose={() => onClose(stopAsking)}>
      <View style={{ gap: 14 }}>
        <View style={{ gap: 6 }}>
          <Txt font="mono" size={19} weight={500} lh={1.3}>
            Why the pass?
          </Txt>
          <Txt size={13.5} lh={1.45} muted>
            {appName} never sees this. It tunes what Discover shows you next.
          </Txt>
        </View>

        <View style={{ gap: 9 }}>
          {PASS_REASONS.map((option) => (
            <OptionRow
              key={option}
              label={option}
              single
              selected={reason === option}
              onPress={() => setReason(reason === option ? null : option)}
            />
          ))}
        </View>

        {reason === 'Something else' ? (
          <Field
            value={other}
            onChangeText={setOther}
            placeholder="In your own words"
            max={60}
            hint="Optional."
          />
        ) : null}

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: stopAsking }}
          onPress={() => setStopAsking((on) => !on)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 11,
            paddingVertical: 10,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 6,
              borderWidth: 1.5,
              borderColor: stopAsking ? c.ink : c.muted,
              backgroundColor: stopAsking ? c.ink : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {stopAsking ? (
              <Txt size={12} weight={700} color={c.bg}>
                ✓
              </Txt>
            ) : null}
          </View>
          <Txt size={14} lh={1.4} muted style={{ flex: 1 }}>
            Don&apos;t ask me this again
          </Txt>
        </Pressable>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Btn
            label="Skip"
            variant="surface"
            size="lg"
            style={{ flex: 1 }}
            onPress={() => onClose(stopAsking)}
          />
          <Btn
            label="Save reason"
            variant="ink"
            size="lg"
            disabled={!resolved}
            style={{ flex: 1.4 }}
            onPress={() => onSubmit(resolved, stopAsking)}
          />
        </View>

        <Txt size={12} center muted lh={1.4} style={{ marginBottom: 4 }}>
          Either way the pass is already done.
        </Txt>
      </View>
    </Sheet>
  );
}
