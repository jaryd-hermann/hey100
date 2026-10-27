import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { OptionRow } from '@/components/ui/OptionRow';
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

type GroupKey = keyof typeof FILTER_GROUPS;

export function FilterBar({
  filters,
  onChange,
  style,
}: {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  /** Lets the bar share the header row with the wordmark. */
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const [open, setOpen] = useState<GroupKey | null>(null);

  const group = open ? FILTER_GROUPS[open] : null;
  const single = open === 'sort';

  const toggle = (value: string) => {
    if (!open) return;
    if (single) {
      onChange({ ...filters, sort: value });
      setOpen(null);
      return;
    }
    const current = filters[open] as string[];
    onChange({
      ...filters,
      [open]: current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    });
  };

  const dropdown = (key: GroupKey, label: string) => {
    const count = key === 'sort' ? 0 : (filters[key] as string[]).length;
    return (
      <Chip
        key={key}
        label={key === 'sort' ? filters.sort : label}
        count={count || undefined}
        selected={count > 0}
        onPress={() => setOpen(key)}
        right={
          <Ionicons
            name="chevron-down"
            size={12}
            color={count > 0 ? c.bg : c.muted}
          />
        }
      />
    );
  };

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 7, paddingRight: layout.gutter, alignItems: 'center' }}
        style={style}
      >
        {dropdown('sort', 'Sort')}
        {dropdown('cat', 'Category')}
        {dropdown('plat', 'Platform')}
        {dropdown('stage', 'Stage')}

        <View style={{ width: 1, backgroundColor: c.line, marginHorizontal: 4 }} />

        {QUICK_CHIPS.map((chip) => (
          <Chip
            key={chip}
            label={chip}
            selected={filters.quick.includes(chip)}
            onPress={() =>
              onChange({
                ...filters,
                quick: filters.quick.includes(chip)
                  ? filters.quick.filter((item) => item !== chip)
                  : [...filters.quick, chip],
              })
            }
          />
        ))}
      </ScrollView>

      <Sheet visible={!!open} onClose={() => setOpen(null)}>
        {group ? (
          <View style={{ gap: 10 }}>
            <Txt font="mono" size={18} weight={500} style={{ marginBottom: 4 }}>
              {group.title}
            </Txt>
            {group.opts.map((option) => (
              <OptionRow
                key={option}
                label={option}
                single={single}
                selected={
                  single ? filters.sort === option : (filters[open!] as string[]).includes(option)
                }
                onPress={() => toggle(option)}
              />
            ))}
          </View>
        ) : null}
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
