import { useQueryClient } from '@tanstack/react-query';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { useToast } from '@/components/ui/Toast';
import { queryKeys } from '@/data/repo/keys';
import { listingStrength } from '@/features/apps/listingStrength';
import { persistListing } from '@/features/apps/persistListing';
import { PitchGate } from '@/features/apps/PitchGate';
import { useAuth } from '@/features/auth/AuthProvider';
import { ListingCoachSheet } from '@/features/feedback/ListingCoachSheet';
import { captureEvent } from '@/lib/analytics';
import { useStore } from '@/store/AppStore';

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
        photo={store.user.photo}
        appName={app.name}
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
