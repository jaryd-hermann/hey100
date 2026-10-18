import React, { useState } from 'react';
import { TextInput, View } from 'react-native';

import { HandMark } from '@/components/brand/Logo';
import { AppIcon } from '@/components/ui/AppIcon';
import { Btn } from '@/components/ui/Btn';
import { Card } from '@/components/ui/Card';
import { Sheet } from '@/components/ui/Sheet';
import { Label, Txt } from '@/components/ui/Txt';
import { shortName } from '@/data/mock';
import type { AppListing } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radii } from '@/theme/tokens';

import type { HeyTarget } from '../app-page/AppPage';

export type HeySheetProps = {
  visible: boolean;
  listing: AppListing | null;
  target: HeyTarget | null;
  heysLeft: number;
  unlimited: boolean;
  /** The user's app the hey will be attributed to. */
  viaAppName: string;
  onClose: () => void;
  onSend: (note: string) => void;
};

export function HeySheet({
  visible,
  listing,
  target,
  heysLeft,
  unlimited,
  viaAppName,
  onClose,
  onSend,
}: HeySheetProps) {
  const { c } = useTheme();
  const [note, setNote] = useState('');

  if (!listing || !target) return <Sheet visible={false} onClose={onClose} children={null} />;

  const about =
    target.type === 'app'
      ? 'app'
      : target.type === 'prompt'
        ? 'prompt'
        : 'screenshot';

  return (
    <Sheet
      visible={visible}
      onClose={() => {
        setNote('');
        onClose();
      }}
    >
      <View style={{ gap: 16 }}>
        <Txt font="mono" size={19} weight={500} lh={1.3}>
          Say hey to {shortName(listing.name)} about their {about}
        </Txt>

        <Card tone="raised" padding={14} style={{ flexDirection: 'row', gap: 12 }}>
          <AppIcon hue={listing.hue} name={listing.name} uri={listing.icon} size={38} />
          <View style={{ flex: 1 }}>
            <Label size={10}>{target.type === 'app' ? 'Their app' : target.label}</Label>
            <Txt size={14} lh={1.4} numberOfLines={3} style={{ marginTop: 4 }}>
              {target.type === 'app' ? listing.sub : target.label}
            </Txt>
          </View>
        </Card>

        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Add a note. Say what caught your eye."
          placeholderTextColor={c.muted}
          multiline
          style={{
            minHeight: 104,
            borderRadius: radii.input,
            backgroundColor: c.surface,
            borderWidth: 1.5,
            borderColor: c.line,
            padding: 14,
            color: c.ink,
            fontFamily: fonts.body,
            fontSize: 15.5,
            lineHeight: 22,
            textAlignVertical: 'top',
          }}
        />

        <Btn
          label="Say hey"
          variant="accent"
          size="lg"
          full
          left={<HandMark size={19} />}
          onPress={() => {
            onSend(note.trim());
            setNote('');
          }}
        />

        <Txt size={12.5} center muted lh={1.45}>
          {unlimited ? 'Unlimited heys on Pro' : `${heysLeft} heys left today`}. A note doubles your
          reply rate.
          {'\n'}
          <Txt size={12.5} muted>
            Sent via {viaAppName}
          </Txt>
        </Txt>
      </View>
    </Sheet>
  );
}
