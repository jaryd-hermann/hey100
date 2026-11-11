'use client';

import { useCallback, useEffect, useState } from 'react';

const KEY = 'hey100.dev-mode';

export function useDevMode() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(window.localStorage.getItem(KEY) === '1');
  }, []);

  const setDevMode = useCallback((next: boolean) => {
    setOn(next);
    window.localStorage.setItem(KEY, next ? '1' : '0');
  }, []);

  return { devMode: on, setDevMode };
}
