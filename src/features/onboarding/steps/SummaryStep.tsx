import { Image } from 'expo-image';
import React from 'react';
import { View } from 'react-native';

import { Glass } from '@/components/ui/Glass';
import { Txt } from '@/components/ui/Txt';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

export type SummaryRow = {
  /** Optional: most rows read better as plain lines. */
  icon?: string;
  text: string;
  /** Sits above the value, when the value needs saying what it answers. */
  label?: string;
  /** A quieter line under the value, e.g. the listing's subtitle. */
  sub?: string;
  /** Takes the glyph's place, for a row that has a picture of its own. */
  image?: string;
  /** Shown under the value, e.g. the screenshots a listing carries. */
  thumbs?: string[];
  /** Shape of those thumbnails, so they match the listing's own carousel. */
  ratio?: number;
  /** Greyed with an eye-off icon: still to come, not yet shared. */
  pending?: boolean;
};

export function SummaryStep({ rows }: { rows: SummaryRow[] }) {
  const { c } = useTheme();

  return (
    <Glass radius={radii.cardLg} intensity={30}>
      <View style={{ padding: 6 }}>
        {rows.map((row, index) => (
          <View
            key={`${row.text}-${index}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              paddingVertical: 14,
              paddingHorizontal: 12,
              borderTopWidth: index === 0 ? 0 : 1,
              borderColor: c.line,
            }}
          >
            {/* No column: a row without a mark starts where the icon starts, so
                the card has one left edge rather than two. */}
            {row.image ? (
              <Image
                source={{ uri: row.image }}
                style={{ width: 26, height: 26, borderRadius: 7, backgroundColor: c.raised }}
                contentFit="cover"
              />
            ) : row.pending || row.icon ? (
              <Txt font="mono" size={15} color={row.pending ? c.muted : c.accentText}>
                {row.pending ? '⊘' : row.icon}
              </Txt>
            ) : null}

            <View style={{ flex: 1, gap: 5 }}>
              {row.label ? (
                <Txt size={12.5} muted>
                  {row.label}
                </Txt>
              ) : null}

              <Txt
                size={15}
                weight={row.pending ? 400 : 500}
                color={row.pending ? c.muted : c.ink}
                numberOfLines={2}
              >
                {row.text}
              </Txt>

              {row.sub ? (
                <Txt size={12.5} lh={1.35} muted numberOfLines={2}>
                  {row.sub}
                </Txt>
              ) : null}

              {row.thumbs?.length ? (
                <View style={{ flexDirection: 'row', gap: 5, marginTop: 1 }}>
                  {row.thumbs.map((uri) => (
                    <Image
                      key={uri}
                      source={{ uri }}
                      style={{
                        width: 26,
                        aspectRatio: row.ratio ?? 1,
                        borderRadius: 5,
                        backgroundColor: c.raised,
                      }}
                      contentFit="cover"
                    />
                  ))}
                </View>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </Glass>
  );
}
