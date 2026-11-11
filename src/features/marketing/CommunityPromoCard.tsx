import React from 'react';
import { Pressable, View } from 'react-native';

import { Identicon } from '@/components/ui/Identicon';
import { Label, Txt } from '@/components/ui/Txt';
import { captureEvent } from '@/lib/analytics';

/** Sample rooms, using the same ids as the seeded groups so the marks match. */
const GROUPS = [
  { id: 'seed-growth', name: 'First 100 Users' },
  { id: 'seed-ship', name: 'Ship Weekly' },
  { id: 'seed-ios', name: 'SwiftUI Corner' },
  { id: 'seed-ai', name: 'AI Builders' },
  { id: 'seed-pricing', name: 'Pricing & Paywalls' },
  { id: 'seed-couples', name: 'Couples & Family Apps' },
];

/** Points DMs at Community. Groups are the shared rooms; this is the door. */
export function CommunityPromoCard({
  from,
  onPress,
}: {
  from: 'dms' | 'team_chat' | 'discover';
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open Community"
      onPress={() => {
        captureEvent('community_promo_tapped', { from });
        onPress();
      }}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <View
        style={{
          backgroundColor: '#7B00FF',
          borderRadius: 22,
          padding: 16,
          gap: 14,
        }}
      >
        <Label color="#FFFFFF">Community</Label>
        <Txt size={22} weight={700} lh={1.15} color="#FFFFFF">
          Groups are where builders hang out
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {GROUPS.map((group) => (
            <View
              key={group.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                height: 38,
                paddingLeft: 6,
                paddingRight: 12,
                borderRadius: 999,
                backgroundColor: '#FFFFFF',
                borderWidth: 2,
                borderColor: '#111111',
                shadowColor: '#111111',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 1,
                shadowRadius: 0,
              }}
            >
              <Identicon seed={group.id} size={24} radius={8} />
              <Txt size={14} weight={700} color="#111111">
                {group.name}
              </Txt>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
}
