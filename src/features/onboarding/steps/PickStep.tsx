import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { OptionRow } from '@/components/ui/OptionRow';
import { SearchField } from '@/components/ui/SearchField';
import { Txt } from '@/components/ui/Txt';
import { stripEmoji } from '@/data/mock';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radii } from '@/theme/tokens';

/**
 * The device questions carry the platform's own mark instead of an emoji, since
 * a store badge is what a builder recognises. Drawn in the text colour, so they
 * stay legible in either theme.
 */
const MARKS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  'iPhone (iOS)': 'logo-apple',
  Android: 'logo-google-playstore',
  Mac: 'logo-apple',
  Windows: 'logo-windows',
  Web: 'logo-chrome',
  'Apple Watch': 'watch',
};

/** A label as it reads without its emoji, which is what a search is typed against. */
const words = (label: string) => stripEmoji(label).toLowerCase();

/**
 * Matches on any word in the label, so "manager" finds "Product managers" and
 * "coffee" finds "Coffee lovers". Labels that start with what was typed come
 * first, since that is usually the one being reached for.
 */
function matches(opts: string[], query: string): string[] {
  const found = opts.filter((label) =>
    words(label)
      .split(/\s+/)
      .some((word) => word.startsWith(query)),
  );
  const loose = opts.filter((label) => !found.includes(label) && words(label).includes(query));

  return [...found, ...loose];
}

export type PickStepProps = {
  opts: string[];
  selected: string[];
  single?: boolean;
  onToggle: (label: string) => void;
  /** Long lists get a search field, instead of a scroll through fifty rows. */
  search?: boolean;
  /** The dashed "own words" expander on multi-select steps. */
  own?: boolean;
  ownText: string;
  ownOpen: boolean;
  onOpenOwn: () => void;
  onChangeOwn: (text: string) => void;
  subtitle?: string;
};

export function PickStep({
  opts,
  selected,
  single,
  onToggle,
  search,
  own,
  ownText,
  ownOpen,
  onOpenOwn,
  onChangeOwn,
  subtitle,
}: PickStepProps) {
  const { c } = useTheme();
  const [query, setQuery] = useState('');

  const typed = query.trim().toLowerCase();
  // Picks stay on screen while searching, including ones typed in rather than
  // chosen from the list, so a skill added a moment ago cannot vanish.
  const found = typed ? matches(opts, typed) : opts;
  const extras = selected.filter((label) => !found.includes(label));
  const shown = typed ? [...found, ...extras] : [...extras, ...found];
  const custom =
    typed && !opts.some((label) => words(label) === typed) && !selected.includes(query.trim());

  return (
    <View style={{ gap: 10 }}>
      {subtitle ? (
        <Txt size={15} lh={1.45} muted style={{ marginBottom: 4 }}>
          {subtitle}
        </Txt>
      ) : null}

      {search ? (
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder={`Search ${opts.length} options`}
        />
      ) : null}

      {shown.map((label) => (
        <OptionRow
          key={label}
          label={label}
          selected={selected.includes(label)}
          single={single}
          icon={MARKS[label]}
          onPress={() => onToggle(label)}
        />
      ))}

      {custom && search ? (
        <OptionRow
          label={`Add “${query.trim()}”`}
          selected={false}
          onPress={() => {
            onToggle(query.trim());
            setQuery('');
          }}
        />
      ) : null}

      {!shown.length && !custom ? (
        <Txt size={15} lh={1.45} muted style={{ paddingVertical: 6 }}>
          Nothing matches &ldquo;{query.trim()}&rdquo;.
          {own ? ' Add it in your own words below.' : ''}
        </Txt>
      ) : null}

      {own ? (
        ownOpen ? (
          <TextInput
            value={ownText}
            onChangeText={onChangeOwn}
            placeholder="In your own words"
            placeholderTextColor={c.muted}
            multiline
            autoFocus
            style={{
              minHeight: 92,
              marginTop: 6,
              borderRadius: radii.option,
              backgroundColor: c.surface,
              borderWidth: 1.5,
              borderColor: c.line,
              padding: 15,
              color: c.ink,
              fontFamily: fonts.body,
              fontSize: 15.5,
              lineHeight: 22,
              textAlignVertical: 'top',
            }}
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={onOpenOwn}
            style={({ pressed }) => ({
              marginTop: 6,
              minHeight: 58,
              borderRadius: radii.option,
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: c.muted,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons name="add" size={18} color={c.muted} />
            <Txt size={14.5} muted style={{ flex: 1 }}>
              Share more in your own words
            </Txt>
          </Pressable>
        )
      ) : null}
    </View>
  );
}
