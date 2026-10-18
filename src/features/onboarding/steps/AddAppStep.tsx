import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { Btn } from '@/components/ui/Btn';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { Sheet } from '@/components/ui/Sheet';
import { Label, Txt } from '@/components/ui/Txt';
import { NAME_MAX, fetchAppMetadata, type AppMetadata } from '@/data/repo/metadata';
import type { PickedShot } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radii } from '@/theme/tokens';

export { NAME_MAX };

/**
 * Apple's own category names, in their order, so a category the lookup
 * returned and one picked by hand are the same string.
 */
const ALL_CATEGORIES = [
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

/** What indie apps are usually filed under, offered before the full list. */
const POPULAR_CATEGORIES = [
  'Productivity',
  'Social Networking',
  'Photo & Video',
  'Health & Fitness',
  'Developer Tools',
  'Utilities',
];

/**
 * What the lookup found first, then the popular ones. A store listing arrives
 * with its real categories, so those are what the builder sees selected.
 */
function categoryChips(cats: string[]): string[] {
  return [...cats, ...POPULAR_CATEGORIES.filter((option) => !cats.includes(option))].slice(0, 6);
}

export type AddAppStepProps = {
  url: string;
  onChangeUrl: (url: string) => void;
  fetched: boolean;
  name: string;
  sub: string;
  hue: number;
  icon?: string;
  cats: string[];
  /** The store screenshots the lookup brought back, previewed here. */
  shots: PickedShot[];
  links: { web: string; tiktok: string; instagram: string };
  onFetch: (result: AppMetadata) => void;
  onChangeName: (name: string) => void;
  onChangeSub: (sub: string) => void;
  onChangeCats: (cats: string[]) => void;
  onChangeLink: (key: 'web' | 'tiktok' | 'instagram', value: string) => void;
};

export function AddAppStep({
  url,
  onChangeUrl,
  fetched,
  name,
  sub,
  hue,
  icon,
  cats,
  shots,
  links,
  onFetch,
  onChangeName,
  onChangeSub,
  onChangeCats,
  onChangeLink,
}: AddAppStepProps) {
  const { c } = useTheme();
  const [fetching, setFetching] = useState(false);
  const [browsing, setBrowsing] = useState(false);

  /** The chosen category leads, so re-fetching keeps the rest as fallbacks. */
  const pick = (cat: string) => {
    onChangeCats([cat, ...cats.filter((other) => other !== cat)]);
    setBrowsing(false);
  };

  const run = async () => {
    if (!url.trim() || fetching) return;
    setFetching(true);
    try {
      onFetch(await fetchAppMetadata(url.trim()));
    } finally {
      setFetching(false);
    }
  };

  return (
    <View style={{ gap: 16 }}>
      <Txt size={15.5} lh={1.5} muted>
        Paste your App Store, Play or web link. We&apos;ll pull in the icon, name and screenshots.
      </Txt>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TextInput
          value={url}
          onChangeText={onChangeUrl}
          placeholder="apps.apple.com/… or yourapp.com"
          placeholderTextColor={c.muted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={{
            flex: 1,
            height: 54,
            borderRadius: radii.input,
            backgroundColor: c.surface,
            borderWidth: 1.5,
            borderColor: c.line,
            paddingHorizontal: 15,
            color: c.ink,
            fontFamily: fonts.body,
            fontSize: 15,
          }}
        />
        <Btn
          label={fetching ? '…' : 'Fetch'}
          onPress={() => void run()}
          size="lg"
          dim={!url.trim()}
          disabled={fetching}
        />
      </View>

      {fetched ? (
        <>
          <Card padding={14} style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <AppIcon hue={hue} name={name || 'A'} uri={icon} size={54} />
              <View style={{ flex: 1 }}>
                <Txt font="mono" size={15} weight={500} numberOfLines={1}>
                  {name || 'Your app'}
                </Txt>
                <Txt size={13.5} muted numberOfLines={1}>
                  {sub || 'Add a one-line subtitle'}
                </Txt>
              </View>
            </View>

            {shots.length ? (
              <View style={{ gap: 9 }}>
                <Txt size={12.5} lh={1.4} muted>
                  {shots.length} screenshot{shots.length === 1 ? '' : 's'} came across too. You can
                  swap them on the next step.
                </Txt>
                <View style={{ flexDirection: 'row', gap: 7 }}>
                  {shots.map((shot) => (
                    <View
                      key={shot.uri}
                      style={{
                        // A sixth of the row whatever came back, so one shot
                        // from a website stays a thumbnail instead of filling
                        // the card.
                        width: '14.5%',
                        aspectRatio: 9 / 16,
                        borderRadius: 8,
                        overflow: 'hidden',
                        backgroundColor: c.raised,
                        borderWidth: 1,
                        borderColor: c.line,
                      }}
                    >
                      <Image
                        source={{ uri: shot.uri }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                      />
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* One block, because the name and the line under it are read
                together and edited together. */}
            <View style={{ gap: 6 }}>
              <Field
                label="Name"
                value={name}
                onChangeText={onChangeName}
                max={NAME_MAX}
                placeholder="App name"
                minHeight={48}
              />
              <Field
                label="Subtitle"
                value={sub}
                onChangeText={onChangeSub}
                max={NAME_MAX}
                placeholder="What it does, in one line"
                minHeight={48}
              />
            </View>

            <View>
              <Label style={{ marginBottom: 8 }}>Category</Label>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {categoryChips(cats).map((cat) => (
                  <Chip
                    key={cat}
                    label={cat}
                    selected={cat === cats[0]}
                    size="sm"
                    onPress={() => pick(cat)}
                  />
                ))}
                <Chip
                  label="More…"
                  size="sm"
                  onPress={() => setBrowsing(true)}
                  selected={!!cats[0] && !categoryChips(cats).includes(cats[0])}
                />
              </View>
            </View>
          </Card>

          <Card padding={14} style={{ gap: 12 }}>
            <Label>Links</Label>
            {(
              [
                ['web', 'Website', 'yourapp.com'],
                ['tiktok', 'TikTok', '@handle'],
                ['instagram', 'Instagram', '@handle'],
              ] as const
            ).map(([key, label, placeholder]) => (
              <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Txt size={14} weight={500} style={{ width: 82 }}>
                  {label}
                </Txt>
                <TextInput
                  value={links[key]}
                  onChangeText={(value) => onChangeLink(key, value)}
                  placeholder={placeholder}
                  placeholderTextColor={c.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: c.bg,
                    borderWidth: 1,
                    borderColor: c.line,
                    paddingHorizontal: 12,
                    color: c.ink,
                    fontFamily: fonts.body,
                    fontSize: 14.5,
                  }}
                />
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <Sheet visible={browsing} onClose={() => setBrowsing(false)}>
        <Txt font="mono" size={17} weight={500} style={{ marginBottom: 4 }}>
          Category
        </Txt>
        <Txt size={13.5} lh={1.45} muted style={{ marginBottom: 14 }}>
          The same list the App Store uses.
        </Txt>
        {ALL_CATEGORIES.map((cat) => {
          const selected = cat === cats[0];

          return (
            <Pressable
              key={cat}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => pick(cat)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 13,
                borderBottomWidth: 1,
                borderBottomColor: c.line,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Txt size={15} weight={selected ? 500 : 400}>
                {cat}
              </Txt>
              {selected ? <Ionicons name="checkmark" size={18} color={c.accent} /> : null}
            </Pressable>
          );
        })}
      </Sheet>
    </View>
  );
}
