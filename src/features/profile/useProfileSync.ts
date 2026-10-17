import { useEffect, useRef } from 'react';

import { useMyProfile } from '@/data/repo/profile';
import { useStore } from '@/store/AppStore';

import { toUserProfile } from './mapProfile';

/**
 * Pushes the signed-in user's row into the store, so every screen keeps reading
 * `useStore()` while the data behind it becomes real. Without a session nothing
 * runs and the bundled prototype data stands.
 */
export function useProfileSync(): void {
  const { data } = useMyProfile();
  const store = useStore();

  // The store object is rebuilt on every state change, so depending on it here
  // would re-run this effect forever.
  const storeRef = useRef(store);
  storeRef.current = store;

  useEffect(() => {
    if (!data) return;

    const mapped = toUserProfile(data);

    // A returning user has already done this; sending them back through
    // onboarding because the store starts empty would be a bug. The server
    // stamps `onboarded_at` when a first listing is published, so an account
    // that signed in and stopped still gets the rest of the flow.
    if (data.onboarded_at && !storeRef.current.onboarded) {
      storeRef.current.completeOnboarding({ user: mapped });
      return;
    }

    storeRef.current.updateUser(mapped);
  }, [data]);
}
