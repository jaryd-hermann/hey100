import { useRouter } from 'expo-router';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Btn } from '@/components/ui/Btn';
import { Txt } from '@/components/ui/Txt';
import { FREE_DAILY_HEYS } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { layout } from '@/theme/tokens';

type DailyHeyLimitContextValue = {
  open: () => void;
};

const DailyHeyLimitContext = createContext<DailyHeyLimitContextValue>({
  open: () => {},
});

export function useDailyHeyLimit() {
  return useContext(DailyHeyLimitContext);
}

export function DailyHeyLimitProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const open = useCallback(() => setVisible(true), []);
  const value = useMemo(() => ({ open }), [open]);

  return (
    <DailyHeyLimitContext.Provider value={value}>
      <View style={{ flex: 1 }}>
        {children}
        {visible ? <DailyHeyLimitScreen onClose={() => setVisible(false)} /> : null}
      </View>
    </DailyHeyLimitContext.Provider>
  );
}

function DailyHeyLimitScreen({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();

  return (
    <View
      pointerEvents="auto"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 80,
        backgroundColor: c.bg,
        paddingTop: insets.top + 28,
        paddingBottom: insets.bottom + 20,
        paddingHorizontal: layout.gutter,
      }}
    >
      <View style={{ flex: 1, justifyContent: 'center', gap: 14 }}>
        <Txt font="mono" size={32} weight={500} lh={1.15}>
          Keep going, send more Hey&apos;s to match with more builders
        </Txt>
        <Txt size={16} lh={1.5} muted>
          You&apos;ve used your {FREE_DAILY_HEYS} today, upgrade to Pro for unlimited
        </Txt>
      </View>

      <View style={{ gap: 10 }}>
        <Btn
          label="Upgrade to Pro"
          variant="accent"
          size="lg"
          full
          onPress={() => {
            onClose();
            router.push('/paywall?reason=heys');
          }}
        />
        <Btn label="Not now" variant="ghost" size="md" full onPress={onClose} />
      </View>
    </View>
  );
}
