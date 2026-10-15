import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';

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
}: {
  filters: FilterState;
  onChange: (next: FilterState) => void;
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
        contentContainerStyle={{ gap: 7, paddingRight: layout.gutter }}
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

/** Applies the filter bar to a list of listings. */
export function applyFilters<T extends { cat: string; plat: string; stage: string }>(
  listings: T[],
  filters: FilterState,
): T[] {
  return listings.filter((listing) => {
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
    return true;
  });
}
