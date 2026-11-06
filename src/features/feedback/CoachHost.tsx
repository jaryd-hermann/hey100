import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Pressable } from 'react-native';

import { AiMark } from '@/components/brand/Marks';
import { useAuth } from '@/features/auth/AuthProvider';
import { ListingCoachSheet } from '@/features/feedback/ListingCoachSheet';
import { useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { layout } from '@/theme/tokens';

type CoachContextValue = {
  open: (appId?: string) => void;
};

const CoachContext = createContext<CoachContextValue>({ open: () => {} });

export function useCoach(): CoachContextValue {
  return useContext(CoachContext);
}

export function CoachProvider({ children }: { children: React.ReactNode }) {
  const store = useStore();
  const { isAdmin } = useAuth();
  const [visible, setVisible] = useState(false);
  const [appId, setAppId] = useState<string | null>(null);

  const open = useCallback(
    (id?: string) => {
      setAppId(id ?? store.primaryApp.id);
      setVisible(true);
    },
    [store.primaryApp.id],
  );

  const app = (appId && store.apps[appId]) || store.primaryApp;
  const value = useMemo(() => ({ open }), [open]);

  return (
    <CoachContext.Provider value={value}>
      {children}
      <ListingCoachSheet
        visible={visible}
        onClose={() => setVisible(false)}
        locked={!store.isPro && !isAdmin}
        user={store.user}
        app={app}
      />
    </CoachContext.Provider>
  );
}

export function CoachFab({ appId }: { appId?: string }) {
  const { c } = useTheme();
  const { open } = useCoach();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Ask the listing coach"
      onPress={() => open(appId)}
      style={{
        position: 'absolute',
        right: layout.gutter,
        bottom: layout.tabBarHeight + layout.tabBarBottom + 18,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: c.surface,
        borderWidth: 1.5,
        borderColor: c.ink,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      }}
    >
      <AiMark size={26} />
    </Pressable>
  );
}
