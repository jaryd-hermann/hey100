import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { Txt } from '@/components/ui/Txt';
import { useTheme } from '@/theme/ThemeProvider';
import { layout } from '@/theme/tokens';

/** Link chips carry a handle rather than a URL, so expand it per network. */
function toUrl(kind: string, value: string): string {
  if (value.startsWith('http')) return value;
  const handle = value.replace(/^@/, '').replace(/^in\//, '');
  switch (kind) {
    case 'TikTok':
      return `https://tiktok.com/@${handle}`;
    case 'Instagram':
      return `https://instagram.com/${handle}`;
    case 'YouTube':
      return `https://youtube.com/@${handle}`;
    case 'X':
      return `https://x.com/${handle}`;
    case 'GitHub':
      return `https://github.com/${handle}`;
    case 'LinkedIn':
      return `https://www.linkedin.com/in/${handle}`;
    case 'Discord':
      return value.includes('.') ? `https://${value.replace(/^https?:\/\//, '')}` : `https://discord.com/${handle}`;
    default:
      return `https://${value}`;
  }
}

export default function Browser() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const webRef = useRef<WebView>(null);

  const { kind = 'Web', value = '' } = useLocalSearchParams<{ kind: string; value: string }>();
  const [loading, setLoading] = useState(true);

  const url = toUrl(kind, value);
  const host = url.replace(/^https?:\/\//, '').split('/')[0];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: layout.gutter,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderColor: c.line,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Txt size={15} weight={600}>
            Done
          </Txt>
        </Pressable>

        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <Ionicons name="lock-closed" size={11} color={c.muted} />
          <Txt size={13} muted numberOfLines={1}>
            {host}
          </Txt>
        </View>

        <Pressable onPress={() => webRef.current?.reload()} hitSlop={10}>
          <Ionicons name="refresh" size={19} color={c.ink} />
        </Pressable>
      </View>

      <WebView
        ref={webRef}
        source={{ uri: url }}
        onLoadEnd={() => setLoading(false)}
        onError={() => setLoading(false)}
        style={{ flex: 1, backgroundColor: c.bg }}
      />

      {loading ? (
        <View style={{ position: 'absolute', top: insets.top + 54, left: 0, right: 0 }}>
          <View style={{ height: 2, backgroundColor: c.accent, width: '40%' }} />
        </View>
      ) : null}
    </View>
  );
}
