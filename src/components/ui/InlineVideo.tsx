import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useRef, useState } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { SHOT_RATIO, type MediaItem, type ShotLayout } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

import { MediaPlaceholder } from './MediaPlaceholder';
import { Txt } from './Txt';

/** Deliberate sticker tones: controls sit over media, not over a themed surface. */
const OVER_MEDIA = '#FFFFFF';
const SCRIM = 'rgba(0, 0, 0, 0.45)';

export type InlineVideoProps = {
  item: MediaItem;
  hue: number;
  layout?: ShotLayout;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Plays a demo video in place rather than pushing a screen, with a full-screen
 * expand. Falls back to the media placeholder until a real asset is uploaded.
 */
export function InlineVideo({
  item,
  hue,
  layout = 'horizontal',
  radius = radii.card,
  style,
}: InlineVideoProps) {
  const { c } = useTheme();
  const view = useRef<VideoView>(null);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);

  // A null source is valid, so the hook still runs for placeholder-only items.
  const player = useVideoPlayer(item.uri ?? null, (instance) => {
    instance.loop = false;
  });

  const playable = Boolean(item.uri);
  const frame: ViewStyle = {
    aspectRatio: SHOT_RATIO[layout],
    borderRadius: radius,
    overflow: 'hidden',
    backgroundColor: c.raised,
  };

  const toggle = () => {
    if (!playable) return;
    if (playing) {
      player.pause();
      setPlaying(false);
      return;
    }
    player.play();
    setPlaying(true);
    setStarted(true);
  };

  const expand = () => {
    if (!playable) return;
    view.current?.enterFullscreen().catch(() => {});
  };

  return (
    <Pressable
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel={playing ? 'Pause video' : 'Play video'}
      style={[frame, style]}
    >
      {started && playable ? (
        <VideoView
          ref={view}
          player={player}
          allowsFullscreen
          allowsPictureInPicture={false}
          nativeControls={false}
          contentFit="cover"
          style={{ flex: 1 }}
        />
      ) : (
        <MediaPlaceholder label={item.label} hue={hue} radius={radius} style={{ flex: 1 }} />
      )}

      {/* The poster affordance stays until the first play. */}
      {!playing ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: SCRIM,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="play" size={24} color={OVER_MEDIA} style={{ marginLeft: 3 }} />
          </View>
          {!playable ? (
            <Txt font="mono" size={10} weight={500} color={OVER_MEDIA}>
              preview coming soon
            </Txt>
          ) : null}
        </View>
      ) : null}

      {playable ? (
        <Pressable
          onPress={expand}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Expand to full screen"
          style={{
            position: 'absolute',
            right: 10,
            bottom: 10,
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: SCRIM,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="expand" size={16} color={OVER_MEDIA} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}
