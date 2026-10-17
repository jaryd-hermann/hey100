import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { appHueColor } from '@/theme/oklch';
import { useTheme } from '@/theme/ThemeProvider';

import { Txt } from './Txt';

export type MediaPlaceholderProps = {
  label: string;
  hue: number;
  video?: boolean;
  /** The uploaded asset. Without one, the hue and the label stand in for it. */
  uri?: string;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

/**
 * The media box for a screenshot or demo video: the real asset when there is
 * one, otherwise a stand-in tinted with the app's generated hue so each listing
 * still reads as its own.
 */
export function MediaPlaceholder({
  label,
  hue,
  video,
  uri,
  radius = 14,
  style,
  children,
}: MediaPlaceholderProps) {
  const { c, isDark } = useTheme();
  const tint = appHueColor(hue);

  if (uri) {
    return (
      <View
        style={[{ borderRadius: radius, overflow: 'hidden', backgroundColor: c.raised }, style]}
      >
        <Image
          source={{ uri }}
          contentFit="cover"
          style={{ width: '100%', height: '100%' }}
          accessibilityLabel={label}
        />
        {video ? <PlayBadge /> : null}
        {children}
      </View>
    );
  }

  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden', backgroundColor: c.raised }, style]}>
      <LinearGradient
        colors={[tint, isDark ? c.surface : c.raised]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{ flex: 1, padding: 12, justifyContent: 'flex-end' }}
      >
        {video ? <PlayBadge /> : null}

        <Txt font="mono" size={10.5} weight={500} color="#0E100F" numberOfLines={2}>
          {label}
        </Txt>
      </LinearGradient>

      {children}
    </View>
  );
}

function PlayBadge() {
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: 'rgba(0,0,0,0.45)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="play" size={19} color="#FFFFFF" />
      </View>
    </View>
  );
}
