import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { MediaPlaceholder } from '@/components/ui/MediaPlaceholder';
import { Txt } from '@/components/ui/Txt';
import { EMOJI_TRAY } from '@/data/mock';
import type { MediaItem } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, layout, radii } from '@/theme/tokens';

const THUMB = 56;

export type ComposerProps = {
  value: string;
  onChangeText: (next: string) => void;
  /** Picked but not sent yet. */
  attachments: MediaItem[];
  onAttach: () => void;
  onRemoveAttachment: (index: number) => void;
  onSend: () => void;
  hue: number;
  /** Safe-area bottom, since the composer sits on the home indicator. */
  bottomInset: number;
};

/** Attach, emoji tray, auto-growing input and send. */
export function Composer({
  value,
  onChangeText,
  attachments,
  onAttach,
  onRemoveAttachment,
  onSend,
  hue,
  bottomInset,
}: ComposerProps) {
  const { c } = useTheme();
  const [emojiOpen, setEmojiOpen] = useState(false);

  const canSend = !!value.trim() || attachments.length > 0;

  const send = () => {
    if (!canSend) return;
    setEmojiOpen(false);
    onSend();
  };

  return (
    <View>
      {emojiOpen ? (
        <View
          style={{
            flexDirection: 'row',
            gap: 6,
            paddingHorizontal: layout.gutter,
            paddingVertical: 8,
          }}
        >
          {EMOJI_TRAY.map((emoji) => (
            <Pressable key={emoji} onPress={() => onChangeText(value + emoji)} hitSlop={4}>
              <Txt size={23}>{emoji}</Txt>
            </Pressable>
          ))}
        </View>
      ) : null}

      {attachments.length ? (
        <View
          style={{
            flexDirection: 'row',
            gap: 8,
            paddingHorizontal: layout.gutter,
            paddingTop: 10,
          }}
        >
          {attachments.map((item, index) => (
            <View key={`${item.label}-${index}`} style={{ width: THUMB, height: THUMB }}>
              {item.uri && !item.video ? (
                <Image
                  source={{ uri: item.uri }}
                  contentFit="cover"
                  style={{
                    width: THUMB,
                    height: THUMB,
                    borderRadius: 12,
                    backgroundColor: c.raised,
                  }}
                />
              ) : (
                <MediaPlaceholder
                  label={item.label}
                  hue={hue}
                  video={item.video}
                  radius={12}
                  style={{ width: THUMB, height: THUMB }}
                />
              )}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${item.label}`}
                hitSlop={8}
                onPress={() => onRemoveAttachment(index)}
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: c.ink,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="close" size={14} color={c.bg} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: 9,
          paddingHorizontal: layout.gutter,
          paddingTop: 8,
          paddingBottom: bottomInset + 8,
          borderTopWidth: 1,
          borderColor: c.line,
        }}
      >
        <Pressable
          onPress={onAttach}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Attach photo or video"
          style={{ height: 44, justifyContent: 'center' }}
        >
          <Ionicons name="add-circle-outline" size={25} color={c.muted} />
        </Pressable>

        <Pressable
          onPress={() => setEmojiOpen((prev) => !prev)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Emoji"
          style={{ height: 44, justifyContent: 'center' }}
        >
          <Ionicons name="happy-outline" size={23} color={emojiOpen ? c.accentText : c.muted} />
        </Pressable>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Message"
          placeholderTextColor={c.muted}
          multiline
          style={{
            flex: 1,
            maxHeight: 112,
            minHeight: 44,
            borderRadius: radii.input,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.line,
            paddingHorizontal: 14,
            paddingTop: 12,
            paddingBottom: 12,
            color: c.ink,
            fontFamily: fonts.body,
            fontSize: 15.5,
          }}
        />

        <Pressable
          onPress={send}
          accessibilityRole="button"
          accessibilityLabel="Send"
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: canSend ? c.accent : c.raised,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="arrow-up" size={20} color={canSend ? c.accentInk : c.muted} />
        </Pressable>
      </View>
    </View>
  );
}
