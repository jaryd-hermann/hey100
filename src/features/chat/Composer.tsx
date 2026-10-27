import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { MediaPlaceholder } from '@/components/ui/MediaPlaceholder';
import { Txt } from '@/components/ui/Txt';
import type { MediaItem } from '@/data/types';
import { EmojiTray } from '@/features/chat/EmojiTray';
import { useKeyboardOpen } from '@/features/chat/useKeyboardOpen';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, layout } from '@/theme/tokens';

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
  placeholder?: string;
  hideAttach?: boolean;
  replyTo?: string | null;
  onCancelReply?: () => void;
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
  placeholder = 'Message',
  hideAttach,
  replyTo,
  onCancelReply,
}: ComposerProps) {
  const { c } = useTheme();
  const [emojiOpen, setEmojiOpen] = useState(false);
  const keyboardOpen = useKeyboardOpen();

  const canSend = !!value.trim() || attachments.length > 0;

  const send = () => {
    if (!canSend) return;
    setEmojiOpen(false);
    onSend();
  };

  return (
    <View>
      {replyTo ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingHorizontal: layout.gutter,
            paddingTop: 8,
          }}
        >
          <View style={{ flex: 1, borderLeftWidth: 2, borderLeftColor: c.accent, paddingLeft: 8 }}>
            <Txt size={11} color={c.accentText} weight={600}>
              Replying
            </Txt>
            <Txt size={13} muted numberOfLines={1}>
              {replyTo}
            </Txt>
          </View>
          <Pressable onPress={onCancelReply} hitSlop={8}>
            <Ionicons name="close" size={18} color={c.muted} />
          </Pressable>
        </View>
      ) : null}
      {emojiOpen ? <EmojiTray onPick={(emoji) => onChangeText(value + emoji)} /> : null}

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
                  uri={item.uri}
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

      <View style={{ paddingHorizontal: 14, paddingBottom: keyboardOpen ? 4 : bottomInset + 6, paddingTop: 6 }}>
        <View
          style={{
            minHeight: 52,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingLeft: 18,
            paddingRight: 6,
            borderRadius: 26,
            borderWidth: 1,
            borderColor: c.glassBorder,
            backgroundColor: c.glass,
          }}
        >
          {hideAttach ? null : (
            <Pressable
              onPress={onAttach}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Attach photo or video"
            >
              <Txt size={26} style={{ lineHeight: 28, marginTop: -2 }}>
                +
              </Txt>
            </Pressable>
          )}

          <Pressable
            onPress={() => setEmojiOpen((prev) => !prev)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Emoji"
          >
            <Ionicons name="happy-outline" size={22} color={emojiOpen ? c.accentText : c.ink} />
          </Pressable>

          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={c.muted}
            multiline
            style={{
              flex: 1,
              maxHeight: 100,
              minHeight: 40,
              paddingTop: 10,
              color: c.ink,
              fontFamily: fonts.body,
              fontSize: 16,
            }}
          />

          {canSend ? (
            <Pressable
              onPress={send}
              accessibilityRole="button"
              accessibilityLabel="Send"
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
                Send
              </Txt>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}
