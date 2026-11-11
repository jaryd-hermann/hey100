import React from 'react';
import { Pressable, View } from 'react-native';

import { Txt } from '@/components/ui/Txt';

/** The prototype's pill: 58px, 2px ink border, 5px offset shadow. */
export function FlowButton({
  label,
  bg,
  fg,
  shadow,
  border = '#111111',
  dim,
  onPress,
}: {
  label: string;
  bg: string;
  fg: string;
  shadow: string;
  border?: string;
  dim?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ opacity: dim ? 0.4 : 1 }}>
      <View>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 5,
            bottom: -5,
            borderRadius: 29,
            backgroundColor: shadow,
          }}
        />
        <View
          style={{
            height: 58,
            borderRadius: 29,
            borderWidth: 2,
            borderColor: border,
            backgroundColor: bg,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 18,
          }}
        >
          <Txt size={17} weight={700} color={fg}>
            {label}
          </Txt>
        </View>
      </View>
    </Pressable>
  );
}
