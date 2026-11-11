'use client';

import { useEffect } from 'react';

import { identifyUser, initAnalytics } from '@/lib/analytics';

export function PostHog({ userId }: { userId?: string | null }) {
  useEffect(() => {
    initAnalytics();
    if (userId) identifyUser(userId);
  }, [userId]);
  return null;
}
