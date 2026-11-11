import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Sheet } from '@/components/ui/Sheet';
import { Txt } from '@/components/ui/Txt';
import { FILTER_GROUPS, QUICK_CHIPS } from '@/data/mock';
import { useTheme } from '@/theme/ThemeProvider';
import { layout } from '@/theme/tokens';

export type FilterState = {
  sort: string;
  cat: string[];
  plat: string[];
  stage: string[];
  quick: string[];
};

export const INITIAL_FILTERS: FilterState = {
  sort: 'Best fit',
  cat: [],
  plat: [],
  stage: [],
  quick: ['For you'],
};

type MultiKey = 'cat' | 'plat' | 'stage' | 'quick';

const SECTIONS: {
  key: 'sort' | MultiKey;
  title: string;
  dot: string;
  light?: boolean;
  single?: boolean;
  opts: readonly string[];
}[] = [
  { key: 'sort', title: 'SORT BY', dot: '#0020A1', single: true, opts: FILTER_GROUPS.sort.opts },
  { key: 'cat', title: 'CATEGORIES', dot: '#7B00FF', opts: FILTER_GROUPS.cat.opts },
  { key: 'plat', title: 'PLATFORMS', dot: '#2E5CFF', opts: FILTER_GROUPS.plat.opts },
  { key: 'stage', title: 'STAGE', dot: '#FF5900', opts: FILTER_GROUPS.stage.opts },
  { key: 'quick', title: 'QUICK', dot: '#C6F24E', light: true, opts: QUICK_CHIPS },
];

export function appliedFilterCount(filters: FilterState): number {
  let count = filters.sort === INITIAL_FILTERS.sort ? 0 : 1;
  count += filters.cat.length + filters.plat.length + filters.stage.length;
  const added = filters.quick.filter((chip) => !INITIAL_FILTERS.quick.includes(chip)).length;
  const removed = INITIAL_FILTERS.quick.filter((chip) => !filters.quick.includes(chip)).length;
  return count + added + removed;
}

function sameFilters(a: FilterState, b: FilterState): boolean {
  return (
    a.sort === b.sort &&
    a.cat.join() === b.cat.join() &&
    a.plat.join() === b.plat.join() &&
    a.stage.join() === b.stage.join() &&
    a.quick.join() === b.quick.join()
  );
}

export function FilterBar({
  filters,
  onChange,
  countResults,
}: {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  /** How many apps the draft would show. */
  countResults?: (next: FilterState) => number;
}) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(filters);
  const count = appliedFilterCount(filters);
  const dirty = !sameFilters(draft, INITIAL_FILTERS);
  const shown = countResults?.(draft);

  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  const toggle = (key: MultiKey, value: string) => {
    const current = draft[key];
    setDraft({
      ...draft,
      [key]: current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    });
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={count ? `Filters, ${count} applied` : 'Filters'}
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          height: 36,
          paddingLeft: 12,
          paddingRight: count ? 8 : 12,
          borderRadius: 18,
          backgroundColor: c.raised,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Ionicons name="options" size={16} color={c.ink} />
        <Txt size={14} weight={700}>
          Filters
        </Txt>
        {count > 0 ? (
          <View
            style={{
              minWidth: 18,
              height: 18,
              paddingHorizontal: 5,
              borderRadius: 9,
              backgroundColor: '#111111',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Txt font="mono" size={11} weight={700} color="#FFFFFF">
              {count}
            </Txt>
          </View>
        ) : null}
      </Pressable>

      <Sheet visible={open} onClose={() => setOpen(false)} scroll={false} tall light>
        <View style={{ minHeight: 480, marginHorizontal: -layout.gutter }}>
          <View
            style={{
              paddingHorizontal: 22,
              paddingBottom: 8,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reset filters"
              onPress={() => setDraft(INITIAL_FILTERS)}
              hitSlop={8}
              style={{ width: 72 }}
            >
              <Txt size={15} weight={600} color="#111111" style={{ textDecorationLine: 'underline', opacity: dirty ? 1 : 0.35 }}>
                Reset
              </Txt>
            </Pressable>
            <Txt font="mono" size={20} weight={600} tracking={-0.8} color="#111111">
              Filters
            </Txt>
            <View style={{ width: 72 }} />
          </View>

          <ScrollView
            style={{ maxHeight: 520 }}
            contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 12, paddingBottom: 20, gap: 26 }}
            showsVerticalScrollIndicator={false}
          >
            {SECTIONS.map((section) => {
              const selectedCount =
                section.key === 'sort' ? 0 : draft[section.key].filter((item) => section.opts.includes(item)).length;
              const hint =
                section.single ? 'Pick one' : selectedCount ? `${selectedCount} selected` : 'Any';
              return (
                <View key={section.key} style={{ gap: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: section.dot }} />
                      <Txt font="mono" size={12} weight={700} tracking={1.2} color="#111111">
                        {section.title}
                      </Txt>
                    </View>
                    <Txt size={12} weight={600} color="#5B625C">
                      {hint}
                    </Txt>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {section.opts.map((option) => {
                      const on = section.key === 'sort' ? draft.sort === option : draft[section.key].includes(option);
                      const fg = on ? (section.light ? '#111111' : '#FFFFFF') : '#111111';
                      return (
                        <Pressable
                          key={option}
                          accessibilityRole="button"
                          accessibilityState={{ selected: on }}
                          onPress={() =>
                            section.key === 'sort' ? setDraft({ ...draft, sort: option }) : toggle(section.key, option)
                          }
                          style={{
                            height: 40,
                            paddingHorizontal: 15,
                            borderRadius: 20,
                            borderWidth: 2,
                            borderColor: '#111111',
                            backgroundColor: on ? section.dot : '#FFFFFF',
                            alignItems: 'center',
                            justifyContent: 'center',
                            shadowColor: '#111111',
                            shadowOffset: { width: 0, height: 3 },
                            shadowOpacity: 1,
                            shadowRadius: 0,
                          }}
                        >
                          <Txt size={14} weight={600} color={fg}>
                            {on ? `✓ ${option}` : option}
                          </Txt>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <View style={{ paddingHorizontal: 22, paddingTop: 14, borderTopWidth: 1.5, borderTopColor: 'rgba(17,17,17,0.1)' }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onChange(draft);
                setOpen(false);
              }}
              style={{
                height: 58,
                borderRadius: 29,
                borderWidth: 2,
                borderColor: '#111111',
                backgroundColor: '#111111',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 5 },
                shadowOpacity: 1,
                shadowRadius: 0,
              }}
            >
              <Txt size={17} weight={700} color="#FFFFFF">
                {shown == null ? 'Show apps' : `Show ${shown} apps`}
              </Txt>
            </Pressable>
          </View>
        </View>
      </Sheet>
    </>
  );
}

type Filterable = {
  cat: string;
  plat: string;
  stage: string;
  likes?: string;
  badges?: string[];
  fit?: string;
  publishedAt?: string;
  ideal?: { interests: string; plat: string };
};

export type FilterViewer = {
  cat: string;
  interests: string;
  plat: string;
};

function likesRank(value?: string): number {
  if (!value || value === '—') return 0;
  const nums = value.match(/\d+/g)?.map(Number) ?? [];
  return nums.length ? Math.max(...nums) : 0;
}

function fitScore(listing: Filterable, viewer?: FilterViewer): number {
  if (!viewer) return listing.fit ? 1 : 0;
  const category = viewer.cat && listing.cat.toLowerCase() === viewer.cat.toLowerCase() ? 6 : 0;
  const mine = (viewer.interests ?? '')
    .split(/[,\s]+/)
    .map((word) => word.trim().toLowerCase())
    .filter((word) => word.length > 1);
  const theirs = (listing.ideal?.interests ?? '')
    .split(/[,\s]+/)
    .map((word) => word.trim().toLowerCase())
    .filter(Boolean);
  const overlap = mine.filter((word) => theirs.includes(word)).length;
  const viewerPlat = viewer.plat.toLowerCase().replace('iphone', 'ios');
  const listingPlat = `${listing.plat} ${listing.ideal?.plat ?? ''}`.toLowerCase().replace('iphone', 'ios');
  const device = viewerPlat && listingPlat.includes(viewerPlat) ? 1 : 0;
  return category + overlap * 2 + device;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Applies the filter bar — category, platform, stage, quick chips, and sort. */
export function applyFilters<T extends Filterable>(
  listings: T[],
  filters: FilterState,
  viewer?: FilterViewer,
  options?: { resort?: boolean },
): T[] {
  const weekAgo = Date.now() - WEEK_MS;
  const next = listings.filter((listing) => {
    if (filters.cat.length && !filters.cat.some((cat) => listing.cat.includes(cat))) return false;
    if (
      filters.plat.length &&
      !filters.plat.some((plat) =>
        listing.plat.toLowerCase().includes(plat.toLowerCase().replace('iphone', 'ios')),
      )
    ) {
      return false;
    }
    if (filters.stage.length) {
      const matchesStage = filters.stage.some((stage) =>
        stage === 'Has revenue'
          ? listing.stage === 'Revenue'
          : stage === 'Live'
            ? listing.stage === 'Live'
            : listing.stage === 'TestFlight',
      );
      if (!matchesStage) return false;
    }
    if (filters.quick.includes('Has revenue') && listing.stage !== 'Revenue') return false;
    if (filters.quick.includes('Verified') && !(listing.badges ?? []).length) return false;
    if (filters.quick.includes('New this week')) {
      const at = listing.publishedAt ? new Date(listing.publishedAt).getTime() : 0;
      if (!at || at < weekAgo) return false;
    }
    return true;
  });

  if (options?.resort === false) return next;

  const ranked = [...next];
  if (filters.sort === 'Most liked') {
    ranked.sort((a, b) => likesRank(b.likes) - likesRank(a.likes));
  } else if (filters.sort === 'Newest') {
    ranked.sort((a, b) => {
      const aAt = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const bAt = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return bAt - aAt;
    });
  } else if (filters.quick.includes('For you') || filters.sort === 'Best fit') {
    ranked.sort((a, b) => fitScore(b, viewer) - fitScore(a, viewer));
  }
  return ranked;
}
