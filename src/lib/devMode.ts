import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const KEY = 'hey100.dev-mode';
const COOLDOWN_KEY = 'hey100.dev-cooldown';

/**
 * One shared copy. Each screen used to keep its own state, so toggling the
 * switch in Settings never reached the listing card that draws the banner.
 */
let devMode = false;
let simulateCooldown = false;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function hydrate() {
  if (hydrated) return;
  hydrated = true;
  Promise.all([AsyncStorage.getItem(KEY), AsyncStorage.getItem(COOLDOWN_KEY)])
    .then(([dev, cooldown]) => {
      devMode = dev === '1';
      simulateCooldown = cooldown === '1';
      emit();
    })
    .catch(() => {});
}

/** Lets an install show sample milestones and other staged QA without shipping them to everyone. */
export function useDevMode() {
  const [, setTick] = useState(0);

  useEffect(() => {
    hydrate();
    const listener = () => setTick((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const setDevMode = useCallback((next: boolean) => {
    devMode = next;
    emit();
    AsyncStorage.setItem(KEY, next ? '1' : '0').catch(() => {});
  }, []);

  const setSimulateCooldown = useCallback((next: boolean) => {
    simulateCooldown = next;
    emit();
    AsyncStorage.setItem(COOLDOWN_KEY, next ? '1' : '0').catch(() => {});
  }, []);

  return { devMode, setDevMode, simulateCooldown, setSimulateCooldown };
}
