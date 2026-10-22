import React, { useState } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { OptionRow } from './OptionRow';
import { SearchField } from './SearchField';
import { Sheet } from './Sheet';
import { Txt } from './Txt';

/** Long lists get a search field; a short one is faster to simply read. */
const SEARCH_AT = 12;

export type OptionSheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: string[];
  selected: string[];
  /** Picking one closes the sheet, as a dropdown would. */
  single?: boolean;
  /** Caps a multi-select. Rows past the cap say so rather than going quiet. */
  max?: number;
  onToggle: (option: string) => void;
};

/**
 * The list behind a dropdown or a tag picker: searchable, and honest about a
 * cap. Shared so a question asked in onboarding looks the same when it is
 * answered again from a profile.
 */
export function OptionSheet({
  visible,
  onClose,
  title,
  options,
  selected,
  single,
  max,
  onToggle,
}: OptionSheetProps) {
  const { c } = useTheme();
  const [query, setQuery] = useState('');

  const typed = query.trim().toLowerCase();
  const shown = typed
    ? options.filter((option) =>
        option
          .toLowerCase()
          .split(/[\s&]+/)
          .some((word) => word.startsWith(typed)),
      )
    : options;

  const full = !!max && selected.length >= max;

  return (
    <Sheet
      visible={visible}
      onClose={() => {
        setQuery('');
        onClose();
      }}
    >
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
          <Txt font="mono" size={17} weight={500} style={{ flex: 1 }}>
            {title}
          </Txt>
          {max ? (
            <Txt font="mono" size={12} color={full ? c.accentText : c.muted}>
              {selected.length}/{max}
            </Txt>
          ) : null}
        </View>

        {options.length > SEARCH_AT ? (
          <SearchField value={query} onChangeText={setQuery} placeholder="Search" />
        ) : null}

        <View style={{ gap: 9 }}>
          {shown.map((option) => (
            <OptionRow
              key={option}
              label={option}
              single={single}
              selected={selected.includes(option)}
              onPress={() => {
                onToggle(option);
                if (single) {
                  setQuery('');
                  onClose();
                }
              }}
            />
          ))}

          {!shown.length ? (
            <Txt size={15} lh={1.45} muted>
              Nothing matches &ldquo;{query.trim()}&rdquo;.
            </Txt>
          ) : null}
        </View>
      </View>
    </Sheet>
  );
}
