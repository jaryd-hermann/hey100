import { createContext, useContext } from 'react';

export type HeyMenuContextValue = {
  open: () => void;
};

export const HeyMenuContext = createContext<HeyMenuContextValue>({ open: () => {} });

export function useHeyMenu(): HeyMenuContextValue {
  return useContext(HeyMenuContext);
}
