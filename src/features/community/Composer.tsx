import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Glass } from '@/components/ui/Glass';
import { Txt } from '@/components/ui/Txt';
import { useToast } from '@/components/ui/Toast';
import type { MediaItem } from '@/data/types';
import { useMediaPicker } from '@/features/chat/useMediaPicker';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

export function Composer({
  placeholder,
  sendLabel,
  onSend,
  disabled,
}: {
  placeholder: string;
  sendLabel: string;
  onSend: (text: string, media: MediaItem[]) => Promise<void> | void;
  disabled?: boolean;
}) {
  const { c } = useTheme();
  const toast = useToast();
  const pick = useMediaPicker();
  const [text, setText] = useState('');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [busy, setBusy] = useState(false);
  const ready = (!!text.trim() || media.length > 0) && !busy && !disabled;

  return (
    <View style={{ gap: 8 }}>
      {media.length ? (
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
          {media.map((item, index) => (
            <Pressable
              key={`${item.uri}-${index}`}
              onPress={() => setMedia((prev) => prev.filter((_, i) => i !== index))}
            >
              {item.uri ? (
                <Image source={{ uri: item.uri }} style={{ width: 52, height: 52, borderRadius: 12 }} />
              ) : (
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 12,
                    backgroundColor: c.raised,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Txt size={11} muted>
                    File
                  </Txt>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      ) : null}

      <Glass radius={26} intensity={55} style={{ minHeight: 52 }}>
        <View
          style={{
            minHeight: 52,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingLeft: 18,
            paddingRight: 6,
          }}
        >
          <Pressable
            onPress={async () => {
              const result = await pick();
              if (result.denied) {
                toast('Allow photos to attach a file.');
                return;
              }
              setMedia((prev) => [...prev, ...result.items].slice(0, 4));
            }}
            hitSlop={8}
            accessibilityLabel="Attach"
          >
            <Txt size={26} weight={400} style={{ lineHeight: 28, marginTop: -2 }}>
              +
            </Txt>
          </Pressable>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={placeholder}
            placeholderTextColor={c.muted}
            multiline
            style={{
              flex: 1,
              minHeight: 40,
              maxHeight: 100,
              paddingTop: 10,
              color: c.ink,
              fontFamily: fonts.body,
              fontSize: 16,
            }}
          />
          {ready ? (
            <Pressable
              onPress={async () => {
                const next = text.trim();
                const files = media;
                setBusy(true);
                try {
                  await onSend(next, files);
                  setText('');
                  setMedia([]);
                } finally {
                  setBusy(false);
                }
              }}
              style={{
                height: 40,
                paddingHorizontal: 16,
                borderRadius: 20,
                backgroundColor: c.accent,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Txt size={14.5} weight={700} color={c.accentInk}>
                {sendLabel}
              </Txt>
            </Pressable>
          ) : null}
        </View>
      </Glass>
    </View>
  );
}
