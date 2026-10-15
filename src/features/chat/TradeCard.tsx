import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import React from 'react';
import { Pressable, View } from 'react-native';

import { Btn } from '@/components/ui/Btn';
import { Card } from '@/components/ui/Card';
import { Label, Txt } from '@/components/ui/Txt';
import { shortName } from '@/data/mock';
import type { Match, TradeStatus } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

export type TradeCardProps = {
  match: Match;
  theirAppName: string;
  myAppName: string;
  /** Promo code, unlocked only after the match. */
  code: string;
  onOpenLink: () => void;
  onSendFeedback: () => void;
  onCopyCode: () => void;
};

/**
 * Pinned at the top of a match but not sticky: it scrolls away with the
 * messages so the conversation gets the room.
 */
export function TradeCard({
  match,
  theirAppName,
  myAppName,
  code,
  onOpenLink,
  onSendFeedback,
  onCopyCode,
}: TradeCardProps) {
  const { c } = useTheme();
  const feedbackSent = match.mine === 'Feedback sent';

  return (
    <Card padding={16} radius={radii.cardLg} style={{ gap: 14, marginBottom: 18 }}>
      {code ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Copy code"
          onPress={() => {
            Clipboard.setStringAsync(code).catch(() => {});
            onCopyCode();
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: c.bg,
            borderRadius: radii.card,
            borderWidth: 1,
            borderColor: c.line,
            paddingHorizontal: 13,
            paddingVertical: 11,
          }}
        >
          <Label size={10}>Code</Label>
          <Txt font="mono" size={14} weight={600} style={{ flex: 1 }}>
            {code}
          </Txt>
          <Ionicons name="copy-outline" size={15} color={c.muted} />
        </Pressable>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <StatusTile label={`You use ${shortName(theirAppName)}`} status={match.mine} />
        <StatusTile label={`They use ${shortName(myAppName)}`} status={match.theirs} />
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Btn
          label="Open TestFlight"
          variant="surface"
          size="sm"
          style={{ flex: 1 }}
          onPress={onOpenLink}
        />
        <Btn
          label={feedbackSent ? 'Feedback sent ✓' : 'Send feedback'}
          variant={feedbackSent ? 'surface' : 'accent'}
          size="sm"
          style={{ flex: 1 }}
          dim={feedbackSent}
          onPress={onSendFeedback}
        />
      </View>
    </Card>
  );
}

function StatusTile({ label, status }: { label: string; status: TradeStatus }) {
  const { c } = useTheme();
  const done = status === 'Feedback sent';

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: done ? c.soft : c.bg,
        borderRadius: radii.card,
        borderWidth: 1,
        borderColor: done ? 'transparent' : c.line,
        padding: 12,
        gap: 5,
      }}
    >
      <Txt size={12.5} muted numberOfLines={2} lh={1.3}>
        {label}
      </Txt>
      <Txt font="mono" size={13} weight={600} color={done ? c.accentText : c.ink}>
        {status}
      </Txt>
    </View>
  );
}
