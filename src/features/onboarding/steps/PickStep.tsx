import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Txt } from '@/components/ui/Txt';
import { stripEmoji } from '@/data/mock';
import { INK, LIME } from '@/features/onboarding/look';
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
  opts = [],
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

  // Ignore leftover search text when this step has no search field.
  const typed = search ? query.trim().toLowerCase() : '';
  // Picks stay on screen while searching, including ones typed in rather than
  // chosen from the list, so a skill added a moment ago cannot vanish.
  const found = typed ? matches(opts, typed) : opts;
  const extras = selected.filter((label) => !found.includes(label));
  const shown = typed ? [...found, ...extras] : [...extras, ...found];
  const custom =
    typed && !opts.some((label) => words(label) === typed) && !selected.includes(query.trim());

  const dark = c.ink === '#FFFFFF';

  return (
    <View style={{ gap: 12 }}>
      {search ? (
        <View style={{ marginBottom: 3 }}>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 3,
              bottom: -3,
              borderRadius: 16,
              backgroundColor: dark ? '#000000' : INK,
            }}
          />
          <View
            style={{
              height: 50,
              borderRadius: 16,
              borderWidth: 2,
              borderColor: INK,
              backgroundColor: '#FFFFFF',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingHorizontal: 16,
            }}
          >
            <Ionicons name="search" size={18} color={INK} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search"
              placeholderTextColor="rgba(17,17,17,0.4)"
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                flex: 1,
                height: 46,
                color: INK,
                fontFamily: fonts.bodyMedium,
                fontSize: 15.5,
              }}
            />
          </View>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {shown.map((label) => {
          const on = selected.includes(label);
          return (
            <StickerChip
              key={label}
              label={stripEmoji(label)}
              selected={on}
              dark={dark}
              icon={MARKS[label]}
              onPress={() => onToggle(label)}
            />
          );
        })}
        {custom && search ? (
          <StickerChip
            label={`Add “${query.trim()}”`}
            selected={false}
            dark={dark}
            onPress={() => {
              onToggle(query.trim());
              setQuery('');
            }}
          />
        ) : null}
        {own && !ownOpen ? (
          <StickerChip label="Your own" selected={false} dark={dark} onPress={onOpenOwn} />
        ) : null}
      </View>

      {!shown.length && !custom ? (
        <Txt size={15} lh={1.45} color={c.muted}>
          Nothing matches “{query.trim()}”.
        </Txt>
      ) : null}

      {own && ownOpen ? (
        <TextInput
          value={ownText}
          onChangeText={onChangeOwn}
          placeholder="In your own words"
          placeholderTextColor="rgba(17,17,17,0.4)"
          autoFocus
          style={{
            minHeight: 52,
            borderRadius: 14,
            backgroundColor: '#FFFFFF',
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: INK,
            fontFamily: fonts.body,
            fontSize: 16,
          }}
        />
      ) : null}
    </View>
  );
}

function StickerChip({
  label,
  selected,
  dark,
  dim,
  icon,
  onPress,
}: {
  label: string;
  selected: boolean;
  dark: boolean;
  dim?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
}) {
  const bg = selected ? (dark ? LIME : INK) : '#FFFFFF';
  const fg = selected ? (dark ? INK : '#FFFFFF') : INK;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={{ opacity: dim ? 0.45 : 1 }}
    >
      <View style={{ marginBottom: 3 }}>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 3,
            bottom: -3,
            borderRadius: radii.pill,
            backgroundColor: INK,
          }}
        />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: radii.pill,
            backgroundColor: bg,
          }}
        >
          {icon ? <Ionicons name={icon} size={14} color={fg} /> : null}
          <Txt size={15} weight={600} color={fg}>
            {selected ? '✓ ' : ''}
            {label}
          </Txt>
        </View>
      </View>
    </Pressable>
  );
}
