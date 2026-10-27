import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const PREFIX = 'hey100.hint.';

/** Once per install. Used for the Discover and Community explainers. */
export function useFirstHint(id: string, enabled = true) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void AsyncStorage.getItem(PREFIX + id).then((seen) => {
        if (!cancelled && !seen) setVisible(true);
      });
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, id]);

  const dismiss = () => {
    setVisible(false);
    AsyncStorage.setItem(PREFIX + id, '1').catch(() => {});
  };

  return { visible, dismiss };
}
