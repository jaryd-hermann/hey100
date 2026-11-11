import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { Txt } from './Txt';

/** Active labels use the bold face, then a half-pixel overprint so the weight reads. */
function TabLabel({
  active,
  color,
  size = 20,
  children,
}: {
  active: boolean;
  color: string;
  size?: number;
  children: React.ReactNode;
}) {
  const label = (key: string) => (
    <Txt key={key} size={size} weight={active ? 700 : 400} color={color}>
      {children}
    </Txt>
  );

  if (!active) return label('tab');

  return (
    <View>
      {label('base')}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0.6, top: 0 }}>
        {label('over')}
      </View>
    </View>
  );
}

export type PageTab<T extends string> = {
  id: T;
  label: string;
  /** Unread count. Hidden when it is 0. */
  count?: number;
  /** Sits after the label, such as the Pro mark on Advanced. */
  mark?: React.ReactNode;
};

/** Large text tabs for a screen header. The selected label is white. */
export function PageTabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (next: T) => void;
  options: PageTab<T>[];
}) {
  const { c } = useTheme();

  return (
    <View
      accessibilityRole="tablist"
      style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 18 }}
    >
      {options.map((option) => {
        const active = option.id === value;
        const count = option.count ?? 0;

        return (
          <Pressable
            key={option.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (active) return;
              Haptics.selectionAsync().catch(() => {});
              onChange(option.id);
            }}
            style={{ paddingBottom: 2 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TabLabel active={active} color={active ? c.ink : c.muted}>
                {option.label}
              </TabLabel>
              {option.mark}
              {count > 0 ? (
                <TabLabel active={active} size={15} color={c.accentText}>
                  {count}
                </TabLabel>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
