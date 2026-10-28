import React from 'react';
import { View } from 'react-native';

import { Avatar } from '@/components/ui/AppIcon';
import { Txt } from '@/components/ui/Txt';
import { useTheme } from '@/theme/ThemeProvider';

export function MemberStack({
  people,
  total,
  size = 26,
  ring,
  overflow = 'muted',
  lead,
  leadSize,
  leadGap = 0,
  max = 3,
  showExtra = true,
}: {
  people: { name: string; photo?: string }[];
  total: number;
  size?: number;
  ring?: string;
  overflow?: 'muted' | 'ink';
  lead?: React.ReactNode;
  leadSize?: number;
  /** Extra space after a leading icon before the member avatars. */
  leadGap?: number;
  max?: number;
  showExtra?: boolean;
}) {
  const { c } = useTheme();
  const shown = people.slice(0, max);
  const extra = showExtra ? Math.max(0, total - shown.length) : 0;
  if (!shown.length && !lead) return null;

  const overlap = Math.max(4, Math.round(size * (max > 3 ? 0.22 : 0.32)));
  const ringW = size >= 40 ? 3 : size >= 22 ? 2 : 1.5;
  const ringColor = ring ?? c.surface;
  const ink = overflow === 'ink';
  const leadDim = leadSize ?? size;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {lead ? (
        <View
          style={{
            zIndex: shown.length + 2,
            borderWidth: ringW,
            borderColor: ringColor,
            borderRadius: leadDim / 2,
          }}
        >
          {lead}
        </View>
      ) : null}
      {shown.map((person, index) => (
        <View
          key={`${person.name}-${index}`}
          style={{
            marginLeft: lead && index === 0 ? leadGap : index || lead ? -overlap : 0,
            zIndex: shown.length - index,
            borderWidth: ringW,
            borderColor: ringColor,
            borderRadius: size / 2,
          }}
        >
          <Avatar name={person.name} uri={person.photo} size={size} />
        </View>
      ))}
      {extra > 0 ? (
        <View
          style={{
            marginLeft: shown.length ? -overlap : 0,
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: ink ? '#0E100F' : c.raised,
            borderWidth: ringW,
            borderColor: ringColor,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 0,
          }}
        >
          <Txt size={extraLabelSize(size)} weight={700} color={ink ? '#FFFFFF' : c.muted}>
            {extraLabel(extra)}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}

function extraLabel(n: number): string {
  if (n >= 1000) return `+${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, '')}k`;
  return `+${n}`;
}

export function MemberChip({
  people,
  total,
  size = 28,
}: {
  people: { name: string; photo?: string }[];
  total: number;
  size?: number;
}) {
  const { c } = useTheme();
  const label = `${total.toLocaleString()} member${total === 1 ? '' : 's'}`;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        minHeight: size + 12,
        paddingLeft: people.length ? 5 : 14,
        paddingRight: 14,
        borderRadius: 999,
        backgroundColor: c.raised,
        borderWidth: 1,
        borderColor: c.line,
        flexShrink: 1,
      }}
    >
      {people.length ? (
        <MemberStack people={people} total={total} size={size} max={4} showExtra={false} ring={c.raised} />
      ) : null}
      <Txt size={15} weight={600} numberOfLines={1} style={{ flexShrink: 1 }}>
        {label}
      </Txt>
    </View>
  );
}

function extraLabelSize(avatar: number): number {
  if (avatar >= 44) return 11;
  if (avatar >= 28) return 10;
  return 8;
}
