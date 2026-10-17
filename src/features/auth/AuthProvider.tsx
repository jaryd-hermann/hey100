import { useQueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { identifyUser, resetAnalytics } from '@/lib/analytics';
import { getSupabase } from '@/lib/supabase';

type AuthState = {
  session: Session | null;
  userId: string | null;
  /** True until the stored session has been read, so no screen flashes a
   *  signed-out state at a signed-in user on cold start. */
  restoring: boolean;
};

const AuthContext = createContext<AuthState>({ session: null, userId: null, restoring: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    const db = getSupabase();
    if (!db) {
      setRestoring(false);
      return;
    }

    let active = true;

    db.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
      })
      .finally(() => {
        if (active) setRestoring(false);
      });

    const { data: subscription } = db.auth.onAuthStateChange((event, next) => {
      setSession(next);

      if (event === 'SIGNED_OUT') {
        // Another account's rows must never be served from cache.
        queryClient.clear();
        resetAnalytics();
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [queryClient]);

  const userId = session?.user.id ?? null;

  // One identity across PostHog and the database, so a funnel can be joined to
  // a row without guesswork.
  useEffect(() => {
    if (userId) identifyUser(userId);
  }, [userId]);

  const value = useMemo<AuthState>(() => ({ session, userId, restoring }), [session, userId, restoring]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
