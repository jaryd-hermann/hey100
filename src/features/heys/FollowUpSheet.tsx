import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Btn } from '@/components/ui/Btn';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Sheet } from '@/components/ui/Sheet';
import { Label, Txt } from '@/components/ui/Txt';

export type FollowUpSheetProps = {
  visible: boolean;
  appName: string;
  /** The note that went with the original hey, quoted for context. */
  originalNote: string;
  onClose: () => void;
  onSend: (note: string) => void;
};

/** The one-shot follow-up note on a sent hey, unlocked 24h after sending. */
export function FollowUpSheet({
  visible,
  appName,
  originalNote,
  onClose,
  onSend,
}: FollowUpSheetProps) {
  const [note, setNote] = useState('');

  useEffect(() => {
    if (visible) setNote('');
  }, [visible]);

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ gap: 15 }}>
        <View style={{ gap: 6 }}>
          <Txt font="mono" size={19} weight={500} lh={1.3}>
            One follow-up to {appName}
          </Txt>
          <Txt size={13.5} lh={1.45} muted>
            They get notified once. Your note lands under the first one with a Very interested
            badge.
          </Txt>
        </View>

        <Card tone="raised" padding={14} style={{ gap: 6 }}>
          <Label size={10}>Your first note</Label>
          <Txt size={14} lh={1.45} numberOfLines={4}>
            {originalNote}
          </Txt>
        </Card>

        <Field
          value={note}
          onChangeText={setNote}
          placeholder="Still keen. Say what would make it easy for them to say yes."
          multiline
          minHeight={104}
          max={180}
          hint="This is your only follow-up on this hey."
        />

        <Btn
          label="Send follow-up"
          variant="accent"
          size="lg"
          full
          disabled={!note.trim()}
          onPress={() => onSend(note.trim())}
        />
      </View>
    </Sheet>
  );
}
