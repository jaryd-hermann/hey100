import React, { useEffect } from 'react';
import { View } from 'react-native';

import { Btn } from '@/components/ui/Btn';
import { Sheet } from '@/components/ui/Sheet';
import { Txt } from '@/components/ui/Txt';
import { captureEvent } from '@/lib/analytics';

export function ProductHint({
  visible,
  surface,
  title,
  body,
  onClose,
}: {
  visible: boolean;
  surface: string;
  title: string;
  body: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (visible) captureEvent('product_hint_shown', { surface });
  }, [surface, visible]);

  return (
    <Sheet visible={visible} onClose={onClose} scroll={false}>
      <View style={{ gap: 16 }}>
        <Txt font="mono" size={20} weight={500} lh={1.25}>
          {title}
        </Txt>
        <Txt size={15.5} lh={1.5}>
          {body}
        </Txt>
        <Btn
          label="Got it"
          variant="accent"
          size="lg"
          full
          onPress={() => {
            captureEvent('product_hint_dismissed', { surface });
            onClose();
          }}
        />
      </View>
    </Sheet>
  );
}
