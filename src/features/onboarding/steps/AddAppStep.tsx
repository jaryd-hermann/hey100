import React, { useState } from 'react';
import { TextInput, View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { Btn } from '@/components/ui/Btn';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { Label, Txt } from '@/components/ui/Txt';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radii } from '@/theme/tokens';

/** App Store Connect caps both at 30 characters, so the listing matches. */
export const NAME_MAX = 30;

export type FetchResult = {
  name: string;
  sub: string;
  hue: number;
  cats: string[];
  web: string;
};

/**
 * Stands in for the store/web lookup until the server endpoint exists: it
 * derives a plausible listing from the host so the flow stays complete.
 */
export function fetchListing(url: string): FetchResult {
  const host = url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0];
  const base = (host.split('.')[0] || 'Your app').replace(/[-_]/g, ' ');
  const name = base.charAt(0).toUpperCase() + base.slice(1);
  const hue = [...host].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;

  return {
    name: name.slice(0, NAME_MAX),
    sub: '',
    hue,
    cats: ['Productivity', 'Lifestyle'],
    web: host,
  };
}

export type AddAppStepProps = {
  url: string;
  onChangeUrl: (url: string) => void;
  fetched: boolean;
  name: string;
  sub: string;
  hue: number;
  cats: string[];
  links: { web: string; tiktok: string; instagram: string };
  onFetch: (result: FetchResult) => void;
  onChangeName: (name: string) => void;
  onChangeSub: (sub: string) => void;
  onChangeLink: (key: 'web' | 'tiktok' | 'instagram', value: string) => void;
};

export function AddAppStep({
  url,
  onChangeUrl,
  fetched,
  name,
  sub,
  hue,
  cats,
  links,
  onFetch,
  onChangeName,
  onChangeSub,
  onChangeLink,
}: AddAppStepProps) {
  const { c } = useTheme();
  const [fetching, setFetching] = useState(false);

  const run = () => {
    if (!url.trim()) return;
    setFetching(true);
    setTimeout(() => {
      onFetch(fetchListing(url));
      setFetching(false);
    }, 450);
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
          onPress={run}
          size="lg"
          dim={!url.trim()}
          disabled={fetching}
        />
      </View>

      {fetched ? (
        <>
          <Card padding={14} style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <AppIcon hue={hue} name={name || 'A'} size={54} />
              <View style={{ flex: 1 }}>
                <Txt font="mono" size={15} weight={500} numberOfLines={1}>
                  {name || 'Your app'}
                </Txt>
                <Txt size={13.5} muted numberOfLines={1}>
                  {sub || 'Add a one-line subtitle'}
                </Txt>
              </View>
            </View>

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
                {cats.map((cat, index) => (
                  <Chip key={cat} label={cat} selected={index === 0} size="sm" />
                ))}
              </View>
            </View>

            <Txt size={12.5} muted>
              You&apos;ll customize this soon.
            </Txt>
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
