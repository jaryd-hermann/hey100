import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wordmark } from '@/components/brand/Logo';
import { Txt } from '@/components/ui/Txt';
import { useTheme } from '@/theme/ThemeProvider';
import { layout } from '@/theme/tokens';

import { AccountMenuButton } from './AccountMenuButton';

/** Full-screen step before the app proper, with the account menu always reachable. */
export function GateScreen({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 8, paddingHorizontal: layout.gutter }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Wordmark size={22} />
        <AccountMenuButton />
      </View>
      <View style={{ flex: 1, justifyContent: 'center', gap: 12 }}>
        <Txt font="mono" size={26} weight={500} tracking={-1}>
          {title}
        </Txt>
        <Txt size={15.5} lh={1.45} muted>
          {body}
        </Txt>
        {children}
      </View>
    </View>
  );
}
