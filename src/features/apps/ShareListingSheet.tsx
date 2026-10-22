import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import React from 'react';
import { Pressable, Share, View } from 'react-native';

import { Btn } from '@/components/ui/Btn';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { Label, Txt } from '@/components/ui/Txt';
import { shortName, slugify } from '@/data/mock';
import type { OwnedApp } from '@/data/types';
import { captureEvent } from '@/lib/analytics';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

export function ShareListingSheet({
  visible,
  app,
  onClose,
}: {
  visible: boolean;
  app: OwnedApp | null;
  onClose: () => void;
}) {
  const { c } = useTheme();
  const toast = useToast();
  if (!app) return <Sheet visible={false} onClose={onClose} children={null} />;

  const slug = app.slug ?? slugify(app.name);
  const url = `hey100.com/${slug}`;

  const copy = () => {
    Clipboard.setStringAsync(`https://${url}`).catch(() => {});
    toast('Link copied');
    captureEvent('share_opened', { kind: 'listing', channel: 'Copy link' });
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ gap: 14 }}>
        <Label>Share {shortName(app.name)}</Label>
        <Pressable
          onPress={copy}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 9,
            backgroundColor: c.surface,
            borderRadius: radii.card,
            paddingHorizontal: 13,
            paddingVertical: 13,
            borderWidth: 1.5,
            borderColor: c.line,
          }}
        >
          <Ionicons name="link-outline" size={16} color={c.muted} />
          <Txt font="mono" size={14} style={{ flex: 1 }} numberOfLines={1}>
            {url}
          </Txt>
          <Ionicons name="copy-outline" size={16} color={c.ink} />
        </Pressable>
        <Btn
          label="Copy link"
          variant="accent"
          size="lg"
          full
          onPress={copy}
        />
        <Btn
          label="Share"
          variant="surface"
          size="md"
          full
          onPress={() => {
            captureEvent('share_opened', { kind: 'listing', channel: 'Share' });
            Share.share({
              message: `${shortName(app.name)} is on Hey100: https://${url}`,
            }).catch(() => {});
          }}
        />
      </View>
    </Sheet>
  );
}
