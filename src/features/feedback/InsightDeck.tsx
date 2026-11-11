import React, { useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import Svg, { Line, Polyline } from 'react-native-svg';

import { Txt } from '@/components/ui/Txt';
import { useTheme } from '@/theme/ThemeProvider';
import { layout } from '@/theme/tokens';

export type InsightStat = {
  id: string;
  label: string;
  value: string;
  /** Null when there is no prior period to compare. */
  growth: number | null;
  /** Null when there is no real time series. */
  points: number[] | null;
  /** One line shown when the question mark next to the chart title is tapped. */
  explain?: string;
};

export function InsightDeck({
  stats,
  title,
  dates,
}: {
  stats: InsightStat[];
  title?: string;
  dates: [string, string, string];
}) {
  const { c } = useTheme();
  const [picked, setPicked] = useState(stats[0]?.id ?? '');
  const [help, setHelp] = useState(false);
  const selected = stats.find((stat) => stat.id === picked) ?? stats[0];
  if (!selected) return null;

  return (
    <View style={{ gap: 16 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingRight: 4 }}
      >
        {stats.map((stat) => {
          const on = stat.id === selected.id;
          return (
            <Pressable
              key={stat.id}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => setPicked(stat.id)}
              style={{
                width: 156,
                minHeight: 108,
                borderRadius: 18,
                padding: 14,
                gap: 8,
                backgroundColor: c.raised,
                borderWidth: 2,
                borderColor: on ? c.ink : 'transparent',
              }}
            >
              <Txt size={13} weight={600} muted numberOfLines={1}>
                {stat.label}
              </Txt>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                <Txt font="mono" size={26} weight={500} numberOfLines={1} style={{ flexShrink: 1 }}>
                  {stat.value}
                </Txt>
                <Growth value={stat.growth} />
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Txt size={16} weight={700} style={{ flexShrink: 1 }}>
            {title ?? `${selected.label} over time`}
          </Txt>
          {selected.explain ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`About ${selected.label}`}
              hitSlop={8}
              onPress={() => setHelp((on) => !on)}
            >
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  borderWidth: 1.5,
                  borderColor: c.ink,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Txt size={11} weight={700}>
                  ?
                </Txt>
              </View>
            </Pressable>
          ) : null}
        </View>
        {help && selected.explain ? (
          <Txt size={13.5} lh={1.4} muted>
            {selected.explain}
          </Txt>
        ) : null}
        <TrendChart values={selected.points} dates={dates} />
      </View>
    </View>
  );
}

function Growth({ value }: { value: number | null }) {
  if (value == null) {
    return (
      <Txt size={14} weight={700} muted style={{ marginBottom: 3 }}>
        —
      </Txt>
    );
  }
  const up = value >= 0;
  return (
    <Txt size={14} weight={700} color={up ? '#3DDC97' : '#FF6B61'} style={{ marginBottom: 3 }}>
      {up ? '+' : ''}
      {value}%
    </Txt>
  );
}

function TrendChart({ values, dates }: { values: number[] | null; dates: [string, string, string] }) {
  const { c } = useTheme();
  const { width: screen } = useWindowDimensions();
  const width = Math.max(240, screen - layout.gutter * 2);
  const height = 168;
  const series = values && values.length > 1 ? values : [0, 0];
  const padL = 34;
  const padR = 8;
  const padT = 12;
  const padB = 8;
  const min = Math.min(0, ...series);
  const max = Math.max(...series, 1);
  const span = max - min || 1;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const ticks = [max, (max + min) / 2, min];
  const points = series
    .map((value, index) => {
      const x = padL + (series.length <= 1 ? innerW / 2 : (index / (series.length - 1)) * innerW);
      const y = padT + (1 - (value - min) / span) * innerH;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <View style={{ gap: 6 }}>
      <View style={{ height }}>
        {ticks.map((tick, index) => (
          <Txt
            key={index}
            size={11}
            muted
            style={{ position: 'absolute', left: 0, top: padT + (index / 2) * innerH - 7 }}
          >
            {formatTick(tick)}
          </Txt>
        ))}
        <Svg width={width} height={height}>
          {ticks.map((_, index) => {
            const y = padT + (index / 2) * innerH;
            return (
              <Line
                key={index}
                x1={padL}
                x2={width - padR}
                y1={y}
                y2={y}
                stroke={c.line}
                strokeWidth={1}
              />
            );
          })}
          <Polyline
            points={points}
            fill="none"
            stroke={c.ink}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </Svg>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingLeft: padL }}>
        {dates.map((date, index) => (
          <Txt key={index} size={11} muted>
            {date}
          </Txt>
        ))}
      </View>
    </View>
  );
}

function formatTick(value: number): string {
  const rounded = Math.round(value);
  if (Math.abs(rounded) >= 1000) {
    const compact = rounded / 1000;
    return `${compact >= 10 ? Math.round(compact) : compact.toFixed(1)}K`;
  }
  return String(rounded);
}

export function edgeDates(spanDays: number): [string, string, string] {
  const format = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - spanDays);
  const mid = new Date(start.getTime() + (end.getTime() - start.getTime()) / 2);
  return [format(start), format(mid), format(end)];
}
