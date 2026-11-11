import { useRouter } from 'expo-router';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glyph, glyphs } from '@/components/brand/Glyph';
import { Txt } from '@/components/ui/Txt';
import { FREE_DAILY_HEYS } from '@/store/AppStore';
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
        backgroundColor: '#7B00FF',
        paddingTop: insets.top + 28,
        paddingBottom: insets.bottom + 20,
        paddingHorizontal: layout.gutter,
      }}
    >
      <View style={{ flex: 1, justifyContent: 'center', gap: 14 }}>
        <Glyph source={glyphs.proSolid} size={72} />
        <Txt font="mono" size={32} weight={500} lh={1.15} color="#FFFFFF">
          Keep going, send more Hey&apos;s to match with more builders
        </Txt>
        <Txt size={16} lh={1.5} color="rgba(255,255,255,0.84)">
          You&apos;ve used your {FREE_DAILY_HEYS} today, upgrade to Pro for unlimited
        </Txt>
      </View>

      <View style={{ gap: 10, paddingBottom: 6 }}>
        <StickerButton
          label="Upgrade to Pro"
          onPress={() => {
            onClose();
            router.push('/paywall?reason=heys');
          }}
        />
        <Pressable onPress={onClose} accessibilityRole="button" style={{ paddingVertical: 12 }}>
          <Txt size={15} weight={700} color="#FFFFFF" center>
            Not now
          </Txt>
        </Pressable>
      </View>
    </View>
  );
}

function StickerButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <View>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 5,
            bottom: -5,
            borderRadius: 28,
            backgroundColor: '#111111',
          }}
        />
        <View
          style={{
            height: 56,
            borderRadius: 28,
            backgroundColor: '#00FF00',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 18,
          }}
        >
          <Txt size={16} weight={700} color="#111111">
            {label}
          </Txt>
        </View>
      </View>
    </Pressable>
  );
}
