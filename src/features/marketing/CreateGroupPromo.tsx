import React from 'react';
import { Pressable, View } from 'react-native';

import { Avatar } from '@/components/ui/AppIcon';
import { Label, Txt } from '@/components/ui/Txt';
import { captureEvent } from '@/lib/analytics';

/** Sample builders joining a new room. The +3 chip is everyone else. */
const BUILDERS = [
  { name: 'Nina Park' },
  { name: 'Omar Haddad' },
  { name: 'Priya Nair' },
];

const MORE = ['Tomás Reyes', 'Hana Ito', 'Lena Vogel'];

const chip = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 6,
  height: 38,
  paddingLeft: 6,
  paddingRight: 12,
  borderRadius: 999,
  borderWidth: 2,
  borderColor: '#111111',
  shadowColor: '#111111',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 1,
  shadowRadius: 0,
};

/** Sits under Find new groups and sells starting a room of your own. */
export function CreateGroupPromo({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Create a group"
      onPress={() => {
        captureEvent('create_group_promo_tapped', { from: 'community' });
        onPress();
      }}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <View
        style={{
          backgroundColor: '#00FFFF',
          borderRadius: 22,
          padding: 16,
          gap: 14,
        }}
      >
        <Label color="#111111">Creating a group</Label>
        <Txt size={22} weight={700} lh={1.15} color="#111111">
          Start a room for the builders you want around you
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {BUILDERS.map((builder) => (
            <View key={builder.name} style={[chip, { backgroundColor: '#FFFFFF' }]}>
              <Avatar name={builder.name} size={24} />
              <Txt size={14} weight={700} color="#111111">
                {builder.name.split(' ')[0]}
              </Txt>
            </View>
          ))}
          <View style={[chip, { backgroundColor: '#C6F24E' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {MORE.map((name, index) => (
                <View
                  key={name}
                  style={{
                    marginLeft: index === 0 ? 0 : -8,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: '#C6F24E',
                  }}
                >
                  <Avatar name={name} size={20} />
                </View>
              ))}
            </View>
            <Txt size={14} weight={700} color="#111111">
              +3
            </Txt>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
