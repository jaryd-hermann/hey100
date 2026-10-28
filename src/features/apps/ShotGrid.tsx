import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, PanResponder, Pressable, View } from 'react-native';

import { Txt } from '@/components/ui/Txt';
import { SHOT_RATIO, type PickedShot, type ShotLayout } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

const GAP = 10;

/** Phone shots sit three to a row, web shots two, following their shape. */
const COLS: Record<ShotLayout, number> = { vertical: 3, horizontal: 2 };

/** How long a finger rests on a shot before it lifts off the grid. */
const HOLD_MS = 220;
/** Movement that means the finger is scrolling the page, not holding a shot. */
const SLOP = 8;

export type ShotGridProps = {
  shots: PickedShot[];
  layout: ShotLayout;
  max: number;
  /** True while the photo picker is open, so the add slot can say so. */
  busy?: boolean;
  /** True while a picked video is still uploading. */
  uploading?: boolean;
  onReorder: (shots: PickedShot[]) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
  /** Editor-only: empty first slot offers a demo video from Photos. */
  onAddVideo?: () => void;
  /** Lets the parent freeze its scroll view for the duration of a drag. */
  onDragChange?: (dragging: boolean) => void;
};

type Drag = { order: PickedShot[]; from: number; at: number };

const clamp = (value: number, max: number) => Math.min(Math.max(value, 0), max);

/**
 * The screenshot slots, in the orientation the listing uses. Holding a shot
 * lifts it so it can be dragged into another slot, which is how the cover gets
 * chosen: whatever ends up first is the cover.
 *
 * Reordering runs on a preview copy of the array and only tells the owner once
 * the finger lifts, so a drag across the grid is one edit rather than ten.
 */
export function ShotGrid({
  shots,
  layout,
  max,
  busy,
  uploading,
  onReorder,
  onRemove,
  onAdd,
  onAddVideo,
  onDragChange,
}: ShotGridProps) {
  const { c } = useTheme();
  const [width, setWidth] = useState(0);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [held, setHeld] = useState<number | null>(null);
  /** The drag in progress, readable inside a gesture without a re-render. */
  const live = useRef<Drag | null>(null);
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  const pan = useRef(new Animated.ValueXY()).current;
  const shotsRef = useRef(shots);
  shotsRef.current = shots;
  const dragChangeRef = useRef(onDragChange);
  dragChangeRef.current = onDragChange;
  const reorderRef = useRef(onReorder);
  reorderRef.current = onReorder;

  const cols = COLS[layout];
  const ratio = SHOT_RATIO[layout];
  const cellW = width ? (width - GAP * (cols - 1)) / cols : 0;
  const cellH = cellW / ratio;
  const slot = (index: number) => ({
    x: (index % cols) * (cellW + GAP),
    y: Math.floor(index / cols) * (cellH + GAP),
  });
  const metrics = useRef({ cellW, cellH, cols, shotOffset: 0 });

  const order = drag?.order ?? shots;
  const editor = !!onAddVideo;
  const demoSlot = editor && shots[0]?.kind !== 'video' && shots.length < max;
  const shotOffset = demoSlot ? 1 : 0;
  metrics.current = { cellW, cellH, cols, shotOffset };
  const emptyCount = editor
    ? Math.max(0, max - order.length - shotOffset)
    : shots.length < max
      ? 1
      : 0;
  const rows = Math.max(1, Math.ceil((shotOffset + order.length + emptyCount) / cols));

  const stopHold = () => {
    if (hold.current) clearTimeout(hold.current);
    hold.current = null;
  };

  /** Drops the lifted shot into its slot and commits the preview order. */
  const land = (drop: Drag) => {
    live.current = null;
    pan.setValue({ x: 0, y: 0 });
    setDrag(null);
    setHeld(null);
    dragChangeRef.current?.(false);
    if (drop.at !== drop.from) reorderRef.current(drop.order);
  };

  const startHold = (index: number) => {
    if (shotsRef.current.length < 2) return;
    stopHold();
    hold.current = setTimeout(() => {
      hold.current = null;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      live.current = { order: shotsRef.current, from: index, at: index };
      pan.setValue({ x: 0, y: 0 });
      setDrag(live.current);
      dragChangeRef.current?.(true);
    }, HOLD_MS);
  };

  const responder = useRef(
    PanResponder.create({
      // The sheet keeps scrolling until a shot actually lifts, then this
      // responder takes the rest of the gesture so the page does not move.
      onStartShouldSetPanResponder: () => !!live.current,
      onMoveShouldSetPanResponder: () => !!live.current,
      onMoveShouldSetPanResponderCapture: () => !!live.current,
      onPanResponderTerminationRequest: () => !live.current,
      onPanResponderMove: (_, g) => {
        const dragging = live.current;
        if (!dragging) return;

        pan.setValue({ x: g.dx, y: g.dy });

        const { cellW: w, cellH: h, cols: n, shotOffset: offset } = metrics.current;
        const start = {
          x: ((offset + dragging.from) % n) * (w + GAP),
          y: Math.floor((offset + dragging.from) / n) * (h + GAP),
        };
        const col = clamp(Math.floor((start.x + g.dx + w / 2) / (w + GAP)), n - 1);
        const row = Math.max(0, Math.floor((start.y + g.dy + h / 2) / (h + GAP)));
        const target = clamp(row * n + col - offset, dragging.order.length - 1);
        if (target === dragging.at) return;

        const next = [...dragging.order];
        next.splice(target, 0, ...next.splice(dragging.at, 1));
        live.current = { order: next, from: dragging.from, at: target };
        Haptics.selectionAsync().catch(() => {});
        setDrag(live.current);
      },
      onPanResponderRelease: () => {
        if (live.current) land(live.current);
      },
      onPanResponderTerminate: () => {
        if (live.current) land(live.current);
      },
    }),
  ).current;

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      collapsable={false}
      {...responder.panHandlers}
      style={{ height: width ? rows * cellH + (rows - 1) * GAP : cellH || 120 }}
    >
      {width
        ? order.map((shot, index) => {
            const lifted = drag?.at === index;
            const base = slot(shotOffset + (lifted ? drag.from : index));
            const waiting = uploading && shot.kind === 'video' && !/^https?:\/\//i.test(shot.uri);

            return (
              <Animated.View
                key={shot.uri}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`Screenshot ${index + 1}${index === 0 ? ', cover' : ''}`}
                accessibilityHint="Hold to reorder"
                onTouchStart={(event) => {
                  origin.current = {
                    x: event.nativeEvent.pageX,
                    y: event.nativeEvent.pageY,
                  };
                  setHeld(index);
                  startHold(index);
                }}
                onTouchMove={(event) => {
                  if (live.current) return;
                  const dx = event.nativeEvent.pageX - origin.current.x;
                  const dy = event.nativeEvent.pageY - origin.current.y;
                  if (Math.abs(dx) > SLOP || Math.abs(dy) > SLOP) {
                    stopHold();
                    setHeld(null);
                  }
                }}
                onTouchEnd={() => {
                  if (live.current) return;
                  stopHold();
                  setHeld(null);
                }}
                onTouchCancel={() => {
                  if (live.current) return;
                  stopHold();
                  setHeld(null);
                }}
                style={{
                  position: 'absolute',
                  left: base.x,
                  top: base.y,
                  width: cellW,
                  height: cellH,
                  zIndex: lifted ? 20 : 1,
                  opacity: held === index && !lifted ? 0.7 : 1,
                  transform: lifted
                    ? [{ translateX: pan.x }, { translateY: pan.y }, { scale: 1.04 }]
                    : [],
                  shadowColor: '#000',
                  shadowOpacity: lifted ? 0.4 : 0,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 6 },
                }}
              >
                <View
                  style={{
                    flex: 1,
                    borderRadius: radii.card,
                    overflow: 'hidden',
                    backgroundColor: c.raised,
                    borderWidth: 1.5,
                    borderColor: lifted ? c.accent : c.line,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {shot.kind === 'video' ? (
                    <VideoThumb uri={shot.uri} />
                  ) : (
                    <Image
                      source={{ uri: shot.uri }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                  )}
                  {shot.kind === 'video' ? (
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
                      }}
                    >
                      {waiting ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: 'rgba(0, 0, 0, 0.45)',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Ionicons name="play" size={16} color="#FFFFFF" style={{ marginLeft: 2 }} />
                        </View>
                      )}
                    </View>
                  ) : null}
                  <Pressable
                    onPress={() => onRemove(index)}
                    onPressIn={stopHold}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Remove"
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: c.bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="close" size={15} color={c.ink} />
                  </Pressable>
                  {index === 0 ? (
                    <View
                      style={{
                        position: 'absolute',
                        bottom: 6,
                        paddingHorizontal: 7,
                        paddingVertical: 3,
                        borderRadius: 999,
                        backgroundColor: c.accent,
                      }}
                    >
                      <Txt font="mono" size={8.5} weight={700} color={c.accentInk} upper>
                        {shot.kind === 'video' ? 'Demo' : 'Cover'}
                      </Txt>
                    </View>
                  ) : null}
                </View>
              </Animated.View>
            );
          })
        : null}

      {width && demoSlot && onAddVideo ? (
        <EmptySlot
          left={slot(0).x}
          top={slot(0).y}
          width={cellW}
          height={cellH}
          busy={busy}
          icon="videocam-outline"
          label="Add demo"
          accessibilityLabel="Add demo video"
          onPress={onAddVideo}
        />
      ) : null}

      {width
        ? Array.from({ length: emptyCount }, (_, at) => (
            <EmptySlot
              key={`empty-${at}`}
              left={slot(shotOffset + order.length + at).x}
              top={slot(shotOffset + order.length + at).y}
              width={cellW}
              height={cellH}
              busy={busy}
              icon="add"
              accessibilityLabel="Add screenshots"
              onPress={onAdd}
            />
          ))
        : null}
    </View>
  );
}

function VideoThumb({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.muted = true;
    instance.loop = false;
  });

  useEffect(() => {
    try {
      player.play();
    } catch {
      return;
    }
    const timer = setTimeout(() => {
      try {
        player.pause();
        player.currentTime = 0;
      } catch {
        // Player may have been released if the cell unmounted.
      }
    }, 160);
    return () => clearTimeout(timer);
  }, [player]);

  return (
    <VideoView
      player={player}
      nativeControls={false}
      allowsFullscreen={false}
      allowsPictureInPicture={false}
      contentFit="cover"
      pointerEvents="none"
      style={{ width: '100%', height: '100%' }}
    />
  );
}

function EmptySlot({
  left,
  top,
  width,
  height,
  busy,
  icon,
  label,
  accessibilityLabel,
  onPress,
}: {
  left: number;
  top: number;
  width: number;
  height: number;
  busy?: boolean;
  icon: 'add' | 'videocam-outline';
  label?: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => ({
        position: 'absolute',
        left,
        top,
        width,
        height,
        borderRadius: radii.card,
        backgroundColor: c.surface,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: c.muted,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        opacity: pressed || busy ? 0.7 : 1,
        paddingHorizontal: 8,
      })}
    >
      <Ionicons name={busy ? 'hourglass-outline' : icon} size={24} color={c.muted} />
      {label ? (
        <Txt font="mono" size={9} weight={600} color={c.muted} center>
          {label}
        </Txt>
      ) : null}
    </Pressable>
  );
}
