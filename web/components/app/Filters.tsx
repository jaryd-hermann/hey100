'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { PlatformMark } from '@/components/app/Marks';

export const SORTS = ['Best fit', 'Newest', 'Most liked'] as const;
export const ALL_CATEGORIES = [
  'Books',
  'Business',
  'Developer Tools',
  'Education',
  'Entertainment',
  'Finance',
  'Food & Drink',
  'Games',
  'Graphics & Design',
  'Health & Fitness',
  'Lifestyle',
  'Magazines & Newspapers',
  'Medical',
  'Music',
  'Navigation',
  'News',
  'Photo & Video',
  'Productivity',
  'Reference',
  'Shopping',
  'Social Networking',
  'Sports',
  'Travel',
  'Utilities',
  'Weather',
];
export const CATS = ALL_CATEGORIES;
export const PLATS = ['iPhone', 'Android', 'Mac', 'Windows', 'Web', 'Chrome extension'];
export const STAGES = ['Beta / TestFlight', 'Live', 'Has revenue'];

export type DeckSort = (typeof SORTS)[number];

type Filters = {
  sort: DeckSort;
  cat: string[];
  plat: string[];
  stage: string[];
  setSort: (value: DeckSort) => void;
  setCat: (value: string[]) => void;
  setPlat: (value: string[]) => void;
  setStage: (value: string[]) => void;
  clear: () => void;
};

const FilterContext = createContext<Filters | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [sort, setSort] = useState<DeckSort>('Best fit');
  const [cat, setCat] = useState<string[]>([]);
  const [plat, setPlat] = useState<string[]>([]);
  const [stage, setStage] = useState<string[]>([]);
  const value = useMemo(
    () => ({
      sort,
      cat,
      plat,
      stage,
      setSort,
      setCat,
      setPlat,
      setStage,
      clear: () => {
        setSort('Best fit');
        setCat([]);
        setPlat([]);
        setStage([]);
      },
    }),
    [sort, cat, plat, stage],
  );
  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilters(): Filters {
  const value = useContext(FilterContext);
  if (!value) throw new Error('useFilters must be used in the app shell');
  return value;
}

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function FilterChip() {
  const { sort, cat, plat, stage } = useFilters();
  const [open, setOpen] = useState(false);
  const applied = [sort !== 'Best fit' ? sort : null, ...cat, ...plat, ...stage].filter(Boolean) as string[];
  const label = applied.length === 0 ? 'Filters' : applied.slice(0, 2).join(' · ');

  return (
    <>
      <button className="filter-chip" type="button" onClick={() => setOpen(true)}>
        <span>{label}</span>
        {applied.length > 2 ? <em>+{applied.length - 2}</em> : applied.length > 0 ? <em>{applied.length}</em> : null}
      </button>
      {open ? <FilterModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function FilterModal({ onClose }: { onClose: () => void }) {
  const { sort, cat, plat, stage, setSort, setCat, setPlat, setStage, clear } = useFilters();
  const [query, setQuery] = useState('');
  const cats = ALL_CATEGORIES.filter((option) => option.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="modal-scrim" onClick={onClose} role="presentation">
      <div
        className="modal-card filter-modal"
        role="dialog"
        aria-labelledby="filter-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h2 id="filter-title">Filters</h2>
        <p className="muted">Narrow the deck. Changes apply as you tap.</p>

        <span className="eyebrow">Sort</span>
        <div className="filter-pills">
          {SORTS.map((option) => (
            <button
              key={option}
              type="button"
              className={sort === option ? 'is-on' : undefined}
              onClick={() => setSort(option)}
            >
              {option}
            </button>
          ))}
        </div>

        <span className="eyebrow">Category</span>
        <input
          className="filter-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search categories"
        />
        <div className="filter-pills filter-pills-scroll">
          {cats.map((option) => (
            <button
              key={option}
              type="button"
              className={cat.includes(option) ? 'is-on' : undefined}
              onClick={() => setCat(toggle(cat, option))}
            >
              {option}
            </button>
          ))}
          {!cats.length ? <span className="muted">No categories match.</span> : null}
        </div>

        <span className="eyebrow">Platform</span>
        <div className="filter-pills">
          {PLATS.map((option) => (
            <button
              key={option}
              type="button"
              className={plat.includes(option) ? 'is-on' : undefined}
              onClick={() => setPlat(toggle(plat, option))}
            >
              <PlatformMark label={option} />
              {option}
            </button>
          ))}
        </div>

        <span className="eyebrow">Stage</span>
        <div className="filter-pills">
          {STAGES.map((option) => (
            <button
              key={option}
              type="button"
              className={stage.includes(option) ? 'is-on' : undefined}
              onClick={() => setStage(toggle(stage, option))}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="modal-actions">
          <button className="btn-line" type="button" onClick={clear}>
            Clear
          </button>
          <button className="btn-accent" type="button" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
