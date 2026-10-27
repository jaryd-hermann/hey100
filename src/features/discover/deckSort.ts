import { useSyncExternalStore } from 'react';

export type DeckSort = 'Best fit' | 'Newest' | 'Most liked';

const SERVER: Record<DeckSort, 'best_fit' | 'newest' | 'most_liked'> = {
  'Best fit': 'best_fit',
  Newest: 'newest',
  'Most liked': 'most_liked',
};

let sort: DeckSort = 'Best fit';
const listeners = new Set<() => void>();

function isDeckSort(value: string): value is DeckSort {
  return value === 'Best fit' || value === 'Newest' || value === 'Most liked';
}

export function serverDeckSort(value: string): 'best_fit' | 'newest' | 'most_liked' {
  return isDeckSort(value) ? SERVER[value] : 'best_fit';
}

export function setDeckSort(value: string) {
  const next = isDeckSort(value) ? value : 'Best fit';
  if (sort === next) return;
  sort = next;
  listeners.forEach((listen) => listen());
}

export function useDeckSort(): DeckSort {
  return useSyncExternalStore(
    (listen) => {
      listeners.add(listen);
      return () => listeners.delete(listen);
    },
    () => sort,
  );
}
