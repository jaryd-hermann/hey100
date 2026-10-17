import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { Label, Txt } from '@/components/ui/Txt';
import type { PickedShot, ShotLayout } from '@/data/types';
import { MAX_SHOTS, pickShots } from '@/features/apps/pickShots';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

/** Slot shape per orientation: a 3×2 grid of phone shots, or 2×3 of web shots. */
const SLOT_STYLE: Record<ShotLayout, { width: '31.5%' | '48.5%'; aspectRatio: number }> = {
  vertical: { width: '31.5%', aspectRatio: 9 / 16 },
  horizontal: { width: '48.5%', aspectRatio: 16 / 9 },
};

export type MediaStepProps = {
  shots: PickedShot[];
  onChange: (shots: PickedShot[]) => void;
  /** Carousel orientation for every screenshot in this listing. */
  shotLayout: ShotLayout;
  onChangeShotLayout: (layout: ShotLayout) => void;
  onError: (message: string) => void;
};

/** Up to six shots in the orientation the owner picks. The first is the cover. */
export function MediaStep({
  shots,
  onChange,
  shotLayout,
  onChangeShotLayout,
  onError,
}: MediaStepProps) {
  const { c } = useTheme();
  const [picking, setPicking] = useState(false);
  const slot = SLOT_STYLE[shotLayout];

  const pick = async () => {
    if (picking || shots.length >= MAX_SHOTS) return;
    setPicking(true);

    const result = await pickShots(MAX_SHOTS - shots.length);
    setPicking(false);

    if ('error' in result) {
      onError(result.error);
      return;
    }
    if (result.shots.length) onChange([...shots, ...result.shots]);
  };

  return (
    <View style={{ gap: 14 }}>
      <Txt size={15.5} lh={1.5} muted>
        The first one is your cover. A short demo video gets the most heys.
      </Txt>

      <View style={{ gap: 9 }}>
        <Label>Screenshot layout</Label>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(
            [
              ['vertical', 'Vertical · phone'],
              ['horizontal', 'Horizontal · web'],
            ] as const
          ).map(([value, label]) => (
            <Chip
              key={value}
              label={label}
              selected={shotLayout === value}
              onPress={() => onChangeShotLayout(value)}
            />
          ))}
        </View>
        <Txt size={12.5} lh={1.4} muted>
          Pick the shape your product screenshots are. Every shot on your page uses it.
        </Txt>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {Array.from({ length: MAX_SHOTS }, (_, index) => {
          const shot = shots[index];
          // Only the slot right after the last shot can be tapped to add, so
          // the grid fills left to right and the cover is never ambiguous.
          const isNextSlot = index === shots.length;

          if (!shot && !isNextSlot) {
            return (
              <View
                key={index}
                style={{
                  width: slot.width,
                  aspectRatio: slot.aspectRatio,
                  borderRadius: radii.card,
                  backgroundColor: c.surface,
                  borderWidth: 1.5,
                  borderStyle: 'dashed',
                  borderColor: c.line,
                  opacity: 0.5,
                }}
              />
            );
          }

          return (
            <Pressable
              key={index}
              accessibilityRole="button"
              accessibilityLabel={
                shot ? `Remove screenshot ${index + 1}` : `Add screenshot ${index + 1}`
              }
              onPress={() => {
                if (shot) {
                  onChange(shots.filter((_, at) => at !== index));
                  return;
                }
                void pick();
              }}
              style={({ pressed }) => ({
                width: slot.width,
                aspectRatio: slot.aspectRatio,
                borderRadius: radii.card,
                overflow: 'hidden',
                backgroundColor: shot ? c.raised : c.surface,
                borderWidth: 1.5,
                borderStyle: shot ? 'solid' : 'dashed',
                borderColor: shot ? c.line : c.muted,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              {shot ? (
                <>
                  <Image
                    source={{ uri: shot.uri }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                  <View
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: c.bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="close" size={14} color={c.ink} />
                  </View>
                  {shot.kind === 'video' ? (
                    <View
                      style={{
                        position: 'absolute',
                        top: 6,
                        left: 6,
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: c.bg,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="play" size={12} color={c.ink} />
                    </View>
                  ) : null}
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
                </>
              ) : (
                <Ionicons name={picking ? 'hourglass-outline' : 'add'} size={24} color={c.muted} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
