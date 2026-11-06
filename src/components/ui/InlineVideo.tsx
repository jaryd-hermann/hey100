import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView, type VideoPlayer } from 'expo-video';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SHOT_RATIO, type MediaItem, type ShotLayout } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

import { MediaPlaceholder } from './MediaPlaceholder';
import { Txt } from './Txt';

/** Deliberate sticker tones: controls sit over media, not over a themed surface. */
const OVER_MEDIA = '#FFFFFF';
const SCRIM = 'rgba(0, 0, 0, 0.45)';

/** Seek to the first frame and pause so the play button comes back. */
export function rewindOnEnd(player: VideoPlayer, onEnd?: () => void) {
  const finish = () => {
    try {
      player.currentTime = 0;
      player.pause();
    } catch {
      // Released while the last frame was still settling.
    }
    onEnd?.();
  };

  const ended = player.addListener('playToEnd', finish);
  const playing = player.addListener('playingChange', ({ isPlaying }: { isPlaying: boolean }) => {
    if (isPlaying) return;
    const duration = player.duration;
    if (duration > 0 && player.currentTime >= duration - 0.15) finish();
  });

  return () => {
    ended.remove();
    playing.remove();
  };
}

function flushWatch(
  player: VideoPlayer,
  maxWatched: React.MutableRefObject<number>,
  userPlayed: React.MutableRefObject<boolean>,
  reported: React.MutableRefObject<boolean>,
  onWatch?: (watchedSeconds: number, durationSeconds: number) => void,
) {
  if (!onWatch || !userPlayed.current || reported.current) return;
  try {
    const watched = Math.max(maxWatched.current, player.currentTime || 0);
    const duration = player.duration > 0 ? player.duration : 0;
    if (watched < 0.5) return;
    reported.current = true;
    onWatch(watched, duration);
  } catch {
    // Released before we could read time.
  }
}

export type InlineVideoProps = {
  item: MediaItem;
  hue: number;
  layout?: ShotLayout;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  /** Covers the card while the file is still going up. */
  uploading?: boolean;
  /** Fires once when the viewer leaves, with farthest progress in seconds. */
  onWatch?: (watchedSeconds: number, durationSeconds: number) => void;
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
  uploading,
  onWatch,
}: InlineVideoProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [playing, setPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const onWatchRef = useRef(onWatch);
  onWatchRef.current = onWatch;
  const maxWatched = useRef(0);
  const userPlayed = useRef(false);
  const reported = useRef(false);

  // A null source is valid, so the hook still runs for placeholder-only items.
  const player = useVideoPlayer(item.uri ?? null, (instance) => {
    instance.loop = false;
  });

  const playable = Boolean(item.uri);

  // Decode the first frame so the card shows a thumbnail before anyone taps.
  useEffect(() => {
    if (!playable) return;
    let cancelled = false;
    try {
      player.muted = true;
      player.play();
    } catch {
      return;
    }
    const timer = setTimeout(() => {
      if (cancelled) return;
      try {
        player.pause();
        player.currentTime = 0;
        player.muted = false;
      } catch {
        // Player may have been released if the card unmounted.
      }
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [playable, player]);

  useEffect(() => {
    if (!playable) return;
    return rewindOnEnd(player, () => {
      try {
        maxWatched.current = Math.max(maxWatched.current, player.duration || 0);
      } catch {
        // Player may already be rewound.
      }
      setPlaying(false);
      flushWatch(player, maxWatched, userPlayed, reported, onWatchRef.current);
    });
  }, [playable, player]);

  useEffect(() => {
    if (!playing) return;
    userPlayed.current = true;
    const id = setInterval(() => {
      try {
        maxWatched.current = Math.max(maxWatched.current, player.currentTime || 0);
      } catch {
        // Player may have been released.
      }
    }, 400);
    return () => clearInterval(id);
  }, [playing, player]);

  useEffect(() => {
    return () => flushWatch(player, maxWatched, userPlayed, reported, onWatchRef.current);
  }, [player]);
  const frame: ViewStyle = {
    borderRadius: radius,
    overflow: 'hidden',
    backgroundColor: c.raised,
    ...(style ? null : { aspectRatio: SHOT_RATIO[layout] }),
  };

  const toggle = () => {
    if (!playable || uploading) return;
    if (playing) {
      player.pause();
      setPlaying(false);
      return;
    }
    player.play();
    setPlaying(true);
  };

  const expand = () => {
    if (!playable || uploading) return;
    player.play();
    setPlaying(true);
    setExpanded(true);
  };

  return (
    <>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={playing ? 'Pause video' : 'Play video'}
        style={[frame, style]}
      >
        {playable ? (
          <VideoView
            player={player}
            allowsFullscreen={false}
            allowsPictureInPicture={false}
            nativeControls={false}
            contentFit="cover"
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <MediaPlaceholder label={item.label} hue={hue} radius={radius} style={{ flex: 1 }} />
        )}

        {uploading ? (
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
              backgroundColor: 'rgba(0, 0, 0, 0.35)',
            }}
          >
            <ActivityIndicator color={OVER_MEDIA} />
            <Txt font="mono" size={10} weight={500} color={OVER_MEDIA}>
              Uploading
            </Txt>
          </View>
        ) : !playing ? (
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

        {playable && !uploading ? (
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

      <Modal
        visible={expanded}
        animationType="fade"
        transparent
        onRequestClose={() => setExpanded(false)}
        statusBarTranslucent
      >
        <View style={{ flex: 1, backgroundColor: '#000000' }}>
          <VideoView
            player={player}
            nativeControls
            contentFit="contain"
            style={{ flex: 1 }}
          />
          <Pressable
            onPress={() => setExpanded(false)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close video"
            style={{
              position: 'absolute',
              top: insets.top + 8,
              right: 16,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: SCRIM,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="close" size={22} color={OVER_MEDIA} />
          </Pressable>
        </View>
      </Modal>
    </>
  );
}
