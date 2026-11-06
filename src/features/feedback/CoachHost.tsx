import { useQueryClient } from '@tanstack/react-query';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Pressable } from 'react-native';

import { AiMark } from '@/components/brand/Marks';
import { useToast } from '@/components/ui/Toast';
import { queryKeys } from '@/data/repo/keys';
import { listingStrength } from '@/features/apps/listingStrength';
import { persistListing } from '@/features/apps/persistListing';
import { PitchGate } from '@/features/apps/PitchGate';
import { useAuth } from '@/features/auth/AuthProvider';
import { ListingCoachSheet } from '@/features/feedback/ListingCoachSheet';
import { captureEvent } from '@/lib/analytics';
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
  const { isAdmin, userId } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [visible, setVisible] = useState(false);
  const [appId, setAppId] = useState<string | null>(null);
  const [pitchOpen, setPitchOpen] = useState(false);

  const open = useCallback(
    (id?: string) => {
      setAppId(id ?? store.primaryApp.id);
      setVisible(true);
    },
    [store.primaryApp.id],
  );

  const app = (appId && store.apps[appId]) || store.primaryApp;
  const strength = listingStrength(app, store.connections[app.id] ?? {});
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
        feedbackCount={store.inbox[app.id]?.list?.length ?? store.inbox[app.id]?.responses ?? 0}
        listingScore={{ done: strength.done, total: strength.total }}
        onRecordPitch={() => setPitchOpen(true)}
      />
      <PitchGate
        visible={pitchOpen}
        builder={app.builder || store.user.realName}
        onClose={() => setPitchOpen(false)}
        onPublish={async (uri, seconds) => {
          const patch = { pitchUri: uri, pitchSeconds: seconds };
          store.updateApp(app.id, patch);
          try {
            await persistListing(userId, app.id, patch);
            if (userId) {
              void queryClient.invalidateQueries({ queryKey: queryKeys.myListings(userId) });
            }
            captureEvent('listing_section_edited', { section: 'pitch' });
            toast('Quick pitch published');
            setPitchOpen(false);
          } catch {
            toast('The pitch did not save. Try again.');
            throw new Error('pitch_save_failed');
          }
        }}
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
