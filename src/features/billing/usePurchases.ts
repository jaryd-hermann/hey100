import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { queryKeys } from '@/data/repo/keys';
import { syncMyPlan } from '@/data/repo/profile';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  getCustomerInfo,
  hasPro,
  initPurchases,
  isPurchasesConfigured,
  loginPurchases,
  logoutPurchases,
  onCustomerInfo,
  type CustomerInfoLike,
} from '@/lib/purchases';
import { useStore } from '@/store/AppStore';

/**
 * Configures RevenueCat, attaches the signed-in user, and mirrors the live
 * entitlement into `storePro`. Server limits follow `profiles.plan`, so when
 * RevenueCat says Pro and the row does not, the server is asked to re-read it.
 */
export function usePurchases(): void {
  const { userId } = useAuth();
  const store = useStore();
  const storeRef = useRef(store);
  storeRef.current = store;
  const queryClient = useQueryClient();
  const syncing = useRef(false);

  useEffect(() => {
    initPurchases();
  }, []);

  useEffect(() => {
    if (!isPurchasesConfigured()) return;

    if (!userId) {
      storeRef.current.setStorePro(false);
      void logoutPurchases();
      return;
    }

    let alive = true;

    const apply = (info: CustomerInfoLike) => {
      if (!alive) return;
      const pro = hasPro(info);
      storeRef.current.setStorePro(pro);
      if (!pro || storeRef.current.plan === 'pro' || syncing.current) return;

      syncing.current = true;
      void syncMyPlan()
        .then((plan) => {
          if (!alive || !plan) return;
          storeRef.current.setPlan(plan);
          void queryClient.invalidateQueries({ queryKey: ['profile', userId] });
          void queryClient.invalidateQueries({ queryKey: queryKeys.counters(userId) });
        })
        .finally(() => {
          syncing.current = false;
        });
    };

    void loginPurchases(userId).then((info) => {
      if (info) apply(info);
      else void getCustomerInfo().then((next) => next && apply(next));
    });

    const stop = onCustomerInfo(apply);

    return () => {
      alive = false;
      stop();
    };
  }, [queryClient, userId]);
}
