import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, View } from 'react-native';

import { Txt } from '@/components/ui/Txt';
import { MY_MEDIA } from '@/data/mock';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

const SLOTS = [0, 1, 2, 3, 4, 5];

/** 3×2 grid of 9:16 slots. The first slot is the cover. */
export function MediaStep({
  filled,
  onChange,
}: {
  filled: number;
  onChange: (count: number) => void;
}) {
  const { c } = useTheme();

  return (
    <View style={{ gap: 14 }}>
      <Txt size={15.5} lh={1.5} muted>
        The first one is your cover. A short demo video gets the most heys.
      </Txt>

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
                width: '31.5%',
                aspectRatio: 9 / 16,
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
                  <Txt font="mono" size={10.5} center muted numberOfLines={3}>
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
