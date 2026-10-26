import { useEffect, useRef } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import {
  getCustomerInfo,
  hasPro,
  initPurchases,
  isPurchasesConfigured,
  loginPurchases,
  logoutPurchases,
  onCustomerInfo,
} from '@/lib/purchases';
import { useStore } from '@/store/AppStore';

/**
 * Configures RevenueCat, attaches the signed-in user, and keeps `plan` in
 * sync with the `pro` entitlement. Server limits still follow `profiles.plan`
 * via the webhook; this is the instant client copy.
 */
export function usePurchases(): void {
  const { userId } = useAuth();
  const store = useStore();
  const storeRef = useRef(store);
  storeRef.current = store;

  useEffect(() => {
    initPurchases();
  }, []);

  useEffect(() => {
    if (!isPurchasesConfigured()) return;

    if (!userId) {
      void logoutPurchases();
      return;
    }

    let alive = true;
    void loginPurchases(userId).then((info) => {
      if (!alive) return;
      if (info) storeRef.current.setPlan(hasPro(info) ? 'pro' : 'free');
      else {
        void getCustomerInfo().then((next) => {
          if (alive && next) storeRef.current.setPlan(hasPro(next) ? 'pro' : 'free');
        });
      }
    });

    const stop = onCustomerInfo((next) => {
      storeRef.current.setPlan(hasPro(next) ? 'pro' : 'free');
    });

    return () => {
      alive = false;
      stop();
    };
  }, [userId]);
}
