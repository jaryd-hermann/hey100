import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import React, { useRef, useState } from 'react';
import { Animated, LayoutAnimation, PanResponder, View } from 'react-native';

import { Txt } from '@/components/ui/Txt';
import { SHOT_RATIO, type PickedShot, type ShotLayout } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

const GAP = 10;

/** Phone shots sit three to a row, web shots two, following their shape. */
const COLS: Record<ShotLayout, number> = { vertical: 3, horizontal: 2 };

/** How long a finger rests on a shot before it lifts off the grid. */
const HOLD_MS = 180;
/** Movement that means the finger is scrolling the page, not holding a shot. */
const SLOP = 8;
/** The corner the remove badge answers for, larger than the badge it draws. */
const REMOVE_HIT = 40;

export type ShotGridProps = {
  shots: PickedShot[];
  layout: ShotLayout;
  max: number;
  /** True while the photo picker is open, so the add slot can say so. */
  busy?: boolean;
  onReorder: (shots: PickedShot[]) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
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
export function ShotGrid({ shots, layout, max, busy, onReorder, onRemove, onAdd }: ShotGridProps) {
  const { c } = useTheme();
  const [width, setWidth] = useState(0);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [held, setHeld] = useState<number | null>(null);
  /** The drag in progress, readable inside a gesture without a re-render. */
  const live = useRef<Drag | null>(null);
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touch = useRef({ x: 0, y: 0 });
  const pan = useRef(new Animated.ValueXY()).current;

  const cols = COLS[layout];
  const ratio = SHOT_RATIO[layout];
  const cellW = width ? (width - GAP * (cols - 1)) / cols : 0;
  const cellH = cellW / ratio;
  const slot = (index: number) => ({
    x: (index % cols) * (cellW + GAP),
    y: Math.floor(index / cols) * (cellH + GAP),
  });

  const order = drag?.order ?? shots;
  const canAdd = shots.length < max;
  const rows = Math.max(1, Math.ceil((order.length + (canAdd ? 1 : 0)) / cols));

  const stopHold = () => {
    if (hold.current) clearTimeout(hold.current);
    hold.current = null;
  };

  /** Springs the lifted shot into its slot, then hands it back to the grid. */
  const land = (drop: Drag) => {
    live.current = null;
    const from = slot(drop.from);
    const to = slot(drop.at);
    Animated.spring(pan, {
      toValue: { x: to.x - from.x, y: to.y - from.y },
      useNativeDriver: false,
      speed: 20,
      bounciness: 3,
    }).start(() => {
      pan.setValue({ x: 0, y: 0 });
      setDrag(null);
    });
    if (drop.at !== drop.from) onReorder(drop.order);
  };

  const gesture = (index: number, shot?: PickedShot) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      // Until a shot lifts, the page still owns the gesture, so a swipe that
      // starts on a screenshot scrolls the step like anywhere else.
      onPanResponderTerminationRequest: () => !live.current,
      onPanResponderGrant: (event) => {
        setHeld(index);
        touch.current = { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY };
        if (!shot || shots.length < 2) return;
        hold.current = setTimeout(() => {
          hold.current = null;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          live.current = { order: shots, from: index, at: index };
          pan.setValue({ x: 0, y: 0 });
          setDrag(live.current);
        }, HOLD_MS);
      },
      onPanResponderMove: (_, g) => {
        const dragging = live.current;
        if (!dragging) {
          if (Math.abs(g.dx) > SLOP || Math.abs(g.dy) > SLOP) {
            stopHold();
            setHeld(null);
          }
          return;
        }

        pan.setValue({ x: g.dx, y: g.dy });

        // The slot under the middle of the lifted shot, which is steadier than
        // the finger when a shot straddles two columns.
        const start = slot(dragging.from);
        const col = clamp(Math.floor((start.x + g.dx + cellW / 2) / (cellW + GAP)), cols - 1);
        const row = Math.max(0, Math.floor((start.y + g.dy + cellH / 2) / (cellH + GAP)));
        const target = clamp(row * cols + col, dragging.order.length - 1);
        if (target === dragging.at) return;

        const next = [...dragging.order];
        next.splice(target, 0, ...next.splice(dragging.at, 1));
        live.current = { order: next, from: dragging.from, at: target };
        LayoutAnimation.configureNext({ duration: 170, update: { type: 'easeInEaseOut' } });
        Haptics.selectionAsync().catch(() => {});
        setDrag(live.current);
      },
      onPanResponderRelease: (_, g) => {
        stopHold();
        setHeld(null);
        const dragging = live.current;
        if (dragging) {
          land(dragging);
          return;
        }
        if (Math.abs(g.dx) > SLOP || Math.abs(g.dy) > SLOP) return;
        if (!shot) {
          onAdd();
          return;
        }
        // Only the badge corner removes, now that the rest of the shot is a
        // handle for dragging.
        if (touch.current.x > cellW - REMOVE_HIT && touch.current.y < REMOVE_HIT) {
          onRemove(index);
        }
      },
      onPanResponderTerminate: () => {
        stopHold();
        setHeld(null);
        if (live.current) land(live.current);
      },
    });

  const badge = (icon: 'close' | 'play', side: 'left' | 'right') => (
    <View
      style={{
        position: 'absolute',
        top: 6,
        [side]: 6,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: c.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={icon} size={icon === 'play' ? 12 : 15} color={c.ink} />
    </View>
  );

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ height: width ? rows * cellH + (rows - 1) * GAP : cellH || 120 }}
    >
      {width
        ? order.map((shot, index) => {
            const lifted = drag?.at === index;
            const base = slot(lifted ? drag.from : index);

            return (
              <Animated.View
                key={shot.uri}
                {...gesture(index, shot).panHandlers}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`Screenshot ${index + 1}${index === 0 ? ', cover' : ''}`}
                accessibilityHint="Double tap to remove, or hold to reorder"
                onAccessibilityTap={() => onRemove(index)}
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
                  <Image
                    source={{ uri: shot.uri }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                  {badge('close', 'right')}
                  {shot.kind === 'video' ? badge('play', 'left') : null}
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
                        Cover
                      </Txt>
                    </View>
                  ) : null}
                </View>
              </Animated.View>
            );
          })
        : null}

      {width && canAdd ? (
        <View
          {...gesture(order.length).panHandlers}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Add screenshots"
          onAccessibilityTap={onAdd}
          style={{
            position: 'absolute',
            left: slot(order.length).x,
            top: slot(order.length).y,
            width: cellW,
            height: cellH,
            borderRadius: radii.card,
            backgroundColor: c.surface,
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: c.muted,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: held === order.length ? 0.7 : 1,
          }}
        >
          <Ionicons name={busy ? 'hourglass-outline' : 'add'} size={24} color={c.muted} />
        </View>
      ) : null}
    </View>
  );
}
