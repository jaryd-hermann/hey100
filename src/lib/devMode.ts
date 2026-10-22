import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const KEY = 'hey100.dev-mode';

/** Lets an install show sample milestones and other staged QA without shipping them to everyone. */
export function useDevMode() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((value) => setOn(value === '1'))
      .catch(() => {});
  }, []);

  const setDevMode = useCallback((next: boolean) => {
    setOn(next);
    AsyncStorage.setItem(KEY, next ? '1' : '0').catch(() => {});
  }, []);

  return { devMode: on, setDevMode };
}
