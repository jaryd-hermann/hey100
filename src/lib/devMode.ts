import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const KEY = 'hey100.dev-mode';
const COOLDOWN_KEY = 'hey100.dev-cooldown';

/** Lets an install show sample milestones and other staged QA without shipping them to everyone. */
export function useDevMode() {
  const [on, setOn] = useState(false);
  const [simulateCooldown, setOnCooldown] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((value) => setOn(value === '1'))
      .catch(() => {});
    AsyncStorage.getItem(COOLDOWN_KEY)
      .then((value) => setOnCooldown(value === '1'))
      .catch(() => {});
  }, []);

  const setDevMode = useCallback((next: boolean) => {
    setOn(next);
    AsyncStorage.setItem(KEY, next ? '1' : '0').catch(() => {});
  }, []);

  const setSimulateCooldown = useCallback((next: boolean) => {
    setOnCooldown(next);
    AsyncStorage.setItem(COOLDOWN_KEY, next ? '1' : '0').catch(() => {});
  }, []);

  return { devMode: on, setDevMode, simulateCooldown, setSimulateCooldown };
}
