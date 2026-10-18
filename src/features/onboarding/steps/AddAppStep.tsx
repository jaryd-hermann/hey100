import React, { useState } from 'react';
import { TextInput, View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { Btn } from '@/components/ui/Btn';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { Label, Txt } from '@/components/ui/Txt';
import { NAME_MAX, fetchAppMetadata, type AppMetadata } from '@/data/repo/metadata';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radii } from '@/theme/tokens';

export { NAME_MAX };

/**
 * Shown when the lookup returns no category, which is every website and some
 * store listings. The App Store's own names, so a fetched category lines up
 * with a picked one.
 */
const CATEGORY_OPTIONS = [
  'Productivity',
  'Social Networking',
  'Health & Fitness',
  'Photo & Video',
  'Lifestyle',
  'Finance',
  'Education',
  'Utilities',
  'Developer Tools',
];

/** Fetched categories first, then enough of the standard list to choose from. */
function categoryOptions(cats: string[]): string[] {
  return [...cats, ...CATEGORY_OPTIONS.filter((option) => !cats.includes(option))].slice(
    0,
    cats.length ? cats.length + 4 : 6,
  );
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
  /** How many store screenshots the lookup brought back. */
  shots: number;
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

            {shots ? (
              <Txt size={12.5} lh={1.4} muted>
                {shots} screenshot{shots === 1 ? '' : 's'} came across too. You can swap them on the
                next step.
              </Txt>
            ) : null}

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

            <View>
              <Label style={{ marginBottom: 8 }}>Category</Label>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {categoryOptions(cats).map((cat) => (
                  <Chip
                    key={cat}
                    label={cat}
                    selected={cat === cats[0]}
                    size="sm"
                    onPress={() => onChangeCats([cat, ...cats.filter((other) => other !== cat)])}
                  />
                ))}
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
    </View>
  );
}
