import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { Label, Txt } from '@/components/ui/Txt';
import { MY_MEDIA } from '@/data/mock';
import type { ShotLayout } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

const SLOTS = [0, 1, 2, 3, 4, 5];

/** Slot shape per orientation: a 3×2 grid of phone shots, or 2×3 of web shots. */
const SLOT_STYLE: Record<ShotLayout, { width: '31.5%' | '48.5%'; aspectRatio: number }> = {
  vertical: { width: '31.5%', aspectRatio: 9 / 16 },
  horizontal: { width: '48.5%', aspectRatio: 16 / 9 },
};

export type MediaStepProps = {
  filled: number;
  onChange: (count: number) => void;
  /** Carousel orientation for every screenshot in this listing. */
  shotLayout: ShotLayout;
  onChangeShotLayout: (layout: ShotLayout) => void;
};

/** Up to 6 slots in the orientation the owner picks. The first slot is the cover. */
export function MediaStep({ filled, onChange, shotLayout, onChangeShotLayout }: MediaStepProps) {
  const { c } = useTheme();
  const slot = SLOT_STYLE[shotLayout];

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
        {SLOTS.map((index) => {
          const isFilled = index < filled;

          return (
            <Pressable
              key={index}
              accessibilityRole="button"
              accessibilityLabel={isFilled ? `Remove slot ${index + 1}` : `Add to slot ${index + 1}`}
              onPress={() => onChange(isFilled ? filled - 1 : Math.min(6, filled + 1))}
              style={({ pressed }) => ({
                width: slot.width,
                aspectRatio: slot.aspectRatio,
                borderRadius: radii.card,
                backgroundColor: isFilled ? c.raised : c.surface,
                borderWidth: 1.5,
                borderStyle: isFilled ? 'solid' : 'dashed',
                borderColor: isFilled ? c.line : c.muted,
                alignItems: 'center',
                justifyContent: 'center',
                padding: 8,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              {isFilled ? (
                <>
                  <Txt
                    font="mono"
                    size={10.5}
                    center
                    muted
                    numberOfLines={3}
                    style={{ marginBottom: index === 0 ? 22 : 0 }}
                  >
                    {MY_MEDIA[index]}
                  </Txt>
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
                <Ionicons name="add" size={24} color={c.muted} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
