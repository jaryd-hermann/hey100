import React from 'react';
import { ScrollView, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { layout } from '@/theme/tokens';

import { HeaderLogo } from '../brand/Logo';

export type ScreenProps = {
  /** Renders the `Hey100 % {title}` lockup. */
  title?: string;
  hand?: boolean;
  /** Replaces the whole header row, e.g. Discover's filter bar. */
  header?: React.ReactNode;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  /** Set when the screen sits inside the tab bar, so content clears it. */
  tabBar?: boolean;
  scroll?: boolean;
  gutter?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  scrollProps?: Partial<ScrollViewProps>;
};

export function Screen({
  title,
  hand,
  header,
  headerRight,
  children,
  tabBar = true,
  scroll = true,
  gutter = true,
  contentStyle,
  scrollProps,
}: ScreenProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  const body = (
    <View style={[gutter ? { paddingHorizontal: layout.gutter } : null, contentStyle]}>
      {children}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      {header ?? (title || headerRight ? (
        <View
          style={{
            paddingHorizontal: layout.gutter,
            paddingTop: 6,
            paddingBottom: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <HeaderLogo title={title} hand={hand} />
          {headerRight}
        </View>
      ) : null)}

      {scroll ? (
        <ScrollView
          // Without flex the scroller sizes to its content and iOS stops
          // delivering touches to anything past the parent's frame.
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingBottom: tabBar ? layout.tabBarSpacer : insets.bottom + 24,
          }}
          {...scrollProps}
        >
          {body}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{body}</View>
      )}
    </View>
  );
}
