import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { isUsernameAvailable } from '@/data/repo/profile';

import { USERNAME_PATTERN } from './useOnboardingDraft';

export type UsernameState = 'empty' | 'invalid' | 'checking' | 'available' | 'taken';

const DEBOUNCE_MS = 350;

/**
 * Checks the handle while the user is still typing, so a collision is caught
 * before sign-in rather than after, when the account already exists.
 */
export function useUsernameState(candidate: string): UsernameState {
  const [settled, setSettled] = useState(candidate);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(candidate), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [candidate]);

  const checkable = USERNAME_PATTERN.test(settled);

  const { data, isFetching } = useQuery({
    queryKey: ['username-available', settled],
    enabled: checkable,
    queryFn: () => isUsernameAvailable(settled),
    staleTime: 30_000,
    retry: false,
  });

  if (!candidate) return 'empty';
  if (!USERNAME_PATTERN.test(candidate)) return 'invalid';
  if (candidate !== settled || isFetching) return 'checking';

  // An unreachable server should not block onboarding; the unique constraint
  // still has the final say at sign-in.
  return data === false ? 'taken' : 'available';
}
