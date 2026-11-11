import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Txt } from '@/components/ui/Txt';
import { NAME_MAX, fetchAppMetadata, type AppMetadata } from '@/data/repo/metadata';
import type { PickedShot, ShotLayout } from '@/data/types';
import { LIME } from '@/features/onboarding/look';
import { pickAvatar } from '@/features/profile/avatar';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

export { NAME_MAX };

/**
 * Apple's own category names, in their order, so a category the lookup
 * returned and one picked by hand are the same string.
 */
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
function foundOn(url: string): { title: string; detail: string } {
  const value = url.toLowerCase();
  if (value.includes('apps.apple.com') || value.includes('itunes.apple.com')) {
    return { title: 'Found it on the App Store', detail: 'Name, subtitle and screenshots filled in' };
  }
  if (value.includes('play.google.com')) {
    return { title: 'Found it on Google Play', detail: 'Name, subtitle and screenshots filled in' };
  }
  if (value.includes('producthunt.com')) {
    return { title: 'Found it on Product Hunt', detail: 'Name, subtitle and screenshots filled in' };
  }
  return { title: 'Found it on the web', detail: 'Name and subtitle filled in' };
}

function categoryRows(cats: string[]): string[] {
  return [...POPULAR_CATEGORIES, ...cats.filter((cat) => !POPULAR_CATEGORIES.includes(cat))];
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
  shotLayout?: ShotLayout;
  links: { web: string; tiktok: string; instagram: string };
  onFetch: (result: AppMetadata) => void;
  onChangeName: (name: string) => void;
  onChangeSub: (sub: string) => void;
  onChangeCats: (cats: string[]) => void;
  onChangeIcon: (icon: string) => void;
  onChangeLink: (key: 'web' | 'tiktok' | 'instagram', value: string) => void;
  onToast?: (message: string) => void;
};

export function AddAppStep({
  url,
  onChangeUrl,
  fetched,
  name,
  sub,
  icon,
  cats,
  links,
  onFetch,
  onChangeName,
  onChangeSub,
  onChangeCats,
  onChangeIcon,
  onChangeLink,
  onToast,
}: AddAppStepProps) {
  const { c } = useTheme();
  const [fetching, setFetching] = useState(false);
  const [browsing, setBrowsing] = useState(false);

  const pick = (cat: string) => {
    if (cats.includes(cat)) {
      onChangeCats(cats.filter((other) => other !== cat));
      return;
    }
    if (cats.length >= 2) {
      onChangeCats([...cats.slice(1), cat]);
      setBrowsing(false);
      return;
    }
    onChangeCats([...cats, cat]);
    setBrowsing(false);
  };

  const replaceIcon = async () => {
    const picked = await pickAvatar();
    if (!picked) return;
    if ('error' in picked) {
      onToast?.(picked.error);
      return;
    }
    onChangeIcon(picked.uri);
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

  const sources = ['Web address', 'App Store link', 'Play link', 'Product Hunt link'];
  const source = foundOn(url);

  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 6 }}>
        <Txt font="mono" size={22} weight={600} lh={1.15} tracking={-1.1}>
          Let's import some stuff
        </Txt>
        <Txt size={16} lh={1.35} muted>
          Use any of these
        </Txt>
      </View>
      <View style={{ height: 62 }}>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 4,
            bottom: -4,
            borderRadius: 18,
            backgroundColor: '#000000',
          }}
        />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            height: 58,
            paddingLeft: 16,
            paddingRight: 5,
            borderRadius: 18,
            backgroundColor: '#FFFFFF',
            borderWidth: 2,
            borderColor: '#111111',
          }}
        >
          <TextInput
            value={url}
            onChangeText={onChangeUrl}
            placeholder="apps.apple.com/…"
            placeholderTextColor="rgba(17,17,17,0.4)"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            onSubmitEditing={() => void run()}
            style={{
              flex: 1,
              height: 44,
              padding: 0,
              color: '#111111',
              fontFamily: fonts.monoMedium,
              fontSize: 14,
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fetch"
            onPress={() => void run()}
            disabled={fetching || !url.trim()}
            style={{
              height: 44,
              paddingHorizontal: 16,
              borderRadius: 13,
              backgroundColor: '#111111',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: fetching ? 0.6 : 1,
            }}
          >
            <Txt size={14} weight={700} color="#FFFFFF">
              {fetching ? '…' : 'Fetch'}
            </Txt>
          </Pressable>
        </View>
      </View>

      {fetched ? null : (
        <View style={{ gap: 10 }}>
          {sources.map((label) => (
            <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="checkmark" size={18} color={c.accent} />
              <Txt size={16} weight={600}>
                {label}
              </Txt>
            </View>
          ))}
        </View>
      )}

      {fetched ? (
        <View style={{ gap: 16 }}>
          <Offset shadow="#000000" radius={18} offset={4}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                borderRadius: 18,
                backgroundColor: LIME,
                borderWidth: 2,
                borderColor: '#111111',
              }}
            >
              <Pressable accessibilityRole="button" accessibilityLabel="Replace product icon" onPress={() => void replaceIcon()}>
                {icon ? (
                  <Image
                    source={{ uri: icon }}
                    style={{ width: 46, height: 46, borderRadius: 12, borderWidth: 2, borderColor: '#111111' }}
                    contentFit="cover"
                  />
                ) : (
                  <View
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 12,
                      backgroundColor: '#FF00FF',
                      borderWidth: 2,
                      borderColor: '#111111',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Txt font="logo" size={22} color="#111111">
                      {(name || 'A').slice(0, 1).toUpperCase()}
                    </Txt>
                  </View>
                )}
              </Pressable>
              <View style={{ flex: 1 }}>
                <Txt font="mono" size={15} weight={700} color="#111111">
                  {source.title}
                </Txt>
                <Txt size={12.5} color="#111111">
                  {source.detail}
                </Txt>
              </View>
              <Txt size={18} weight={700} color="#111111">
                ✓
              </Txt>
            </View>
          </Offset>

          <LabeledField
            label="Name"
            count={`${name.length}/${NAME_MAX}`}
            value={name}
            onChangeText={(value) => onChangeName(value.slice(0, NAME_MAX))}
            weight={600}
          />
          <LabeledField
            label="Subtitle"
            count={`${sub.length}/${NAME_MAX}`}
            value={sub}
            onChangeText={(value) => onChangeSub(value.slice(0, NAME_MAX))}
            weight={500}
          />

          <View style={{ gap: 9 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Txt size={13.5} weight={700} color="#FFFFFF">
                Categories
              </Txt>
              <Txt font="mono" size={12} weight={600} color="#FFFFFF">
                UP TO 2
              </Txt>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
              {(browsing ? ALL_CATEGORIES : categoryRows(cats)).map((cat) => {
                const on = cats.includes(cat);
                const dim = !on && cats.length >= 2;
                return (
                  <Pressable
                    key={cat}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    onPress={() => pick(cat)}
                    style={{ opacity: dim ? 0.45 : 1 }}
                  >
                    <Offset shadow={on ? 'transparent' : '#000000'} radius={18} offset={on ? 0 : 3}>
                      <View
                        style={{
                          height: 36,
                          paddingHorizontal: 13,
                          borderRadius: 18,
                          borderWidth: 2,
                          borderColor: '#111111',
                          backgroundColor: on ? LIME : '#FFFFFF',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Txt size={13} weight={600} color="#111111">
                          {on ? '✓ ' : ''}
                          {cat}
                        </Txt>
                      </View>
                    </Offset>
                  </Pressable>
                );
              })}
              <Pressable accessibilityRole="button" onPress={() => setBrowsing((open) => !open)}>
                <View
                  style={{
                    height: 36,
                    paddingHorizontal: 13,
                    borderRadius: 18,
                    borderWidth: 2,
                    borderStyle: 'dashed',
                    borderColor: '#FFFFFF',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Txt size={13} weight={600} color="#FFFFFF">
                    {browsing ? 'Fewer ▲' : 'More ▼'}
                  </Txt>
                </View>
              </Pressable>
            </View>
          </View>

          <View style={{ gap: 7 }}>
            <Txt size={13.5} weight={700} color="#FFFFFF">
              Links <Txt size={13.5} weight={500} color="rgba(255,255,255,0.8)">· optional</Txt>
            </Txt>
            {(
              [
                ['web', 'WEBSITE', 'shipnote.app'],
                ['tiktok', 'TIKTOK', '@yourhandle'],
                ['instagram', 'INSTAGRAM', '@yourhandle'],
              ] as const
            ).map(([key, label, placeholder]) => (
              <View
                key={key}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  height: 48,
                  borderRadius: 14,
                  borderWidth: 2,
                  borderColor: '#111111',
                  backgroundColor: '#FFFFFF',
                  overflow: 'hidden',
                }}
              >
                <Txt font="mono" size={12} weight={600} color="#5B625C" style={{ width: 96, paddingLeft: 14 }}>
                  {label}
                </Txt>
                <TextInput
                  value={links[key]}
                  onChangeText={(value) => onChangeLink(key, value)}
                  placeholder={placeholder}
                  placeholderTextColor="rgba(17,17,17,0.4)"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{
                    flex: 1,
                    height: 48,
                    paddingRight: 14,
                    color: '#111111',
                    fontFamily: fonts.bodyMedium,
                    fontSize: 14.5,
                  }}
                />
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Offset({
  shadow,
  radius,
  offset,
  children,
}: {
  shadow: string;
  radius: number;
  offset: number;
  children: React.ReactNode;
}) {
  return (
    <View>
      {offset > 0 ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: offset,
            bottom: -offset,
            borderRadius: radius,
            backgroundColor: shadow,
          }}
        />
      ) : null}
      {children}
    </View>
  );
}

function LabeledField({
  label,
  count,
  value,
  onChangeText,
  weight,
}: {
  label: string;
  count: string;
  value: string;
  onChangeText: (value: string) => void;
  weight: 500 | 600;
}) {
  return (
    <View style={{ gap: 7 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Txt size={13.5} weight={700} color="#FFFFFF">
          {label}
        </Txt>
        <Txt font="mono" size={12} weight={600} color="#FFFFFF">
          {count}
        </Txt>
      </View>
      <Offset shadow="#000000" radius={16} offset={3}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          style={{
            height: 54,
            paddingHorizontal: 16,
            borderRadius: 16,
            borderWidth: 2,
            borderColor: '#111111',
            backgroundColor: '#FFFFFF',
            color: '#111111',
            fontFamily: weight === 600 ? fonts.bodySemi : fonts.bodyMedium,
            fontSize: 16,
          }}
        />
      </Offset>
    </View>
  );
}
