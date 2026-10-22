import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Wordmark } from '@/components/brand/Logo';
import { Btn } from '@/components/ui/Btn';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { Label, Txt } from '@/components/ui/Txt';
import { shortName, slugify } from '@/data/mock';
import type { AppConnection, OwnedApp } from '@/data/types';
import { useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radii } from '@/theme/tokens';

function linesOf(connection?: AppConnection): string[] {
  return [connection?.badge, connection?.on, connection?.detail, ...(connection?.badges ?? [])].filter(
    (line): line is string => !!line,
  );
}

function bandFrom(haystacks: string[], pattern: RegExp): string | null {
  for (const line of haystacks) {
    const match = line.match(pattern);
    if (match?.[1]) return match[1].replace(/\s+/g, '');
  }
  return null;
}

export function BadgesSheet({
  visible,
  app,
  onClose,
}: {
  visible: boolean;
  app: OwnedApp | null;
  onClose: () => void;
}) {
  const { c } = useTheme();
  const toast = useToast();
  const store = useStore();
  const [badge, setBadge] = useState<string | null>(null);
  const [style, setStyle] = useState<'Dark' | 'Light'>('Dark');

  if (!app) return <Sheet visible={false} onClose={onClose} children={null} />;

  const slug = app.slug ?? slugify(app.name);
  const url = `hey100.com/${slug}`;
  const connected = store.connections[app.id] ?? {};
  const revenue = !!(connected.stripe || connected.revenuecat);
  const customers = !!connected.revenuecat;
  const commits = connected.github || app.githubCommits != null;

  const rcLines = [...linesOf(connected.revenuecat), ...(app.badges ?? [])];
  const stripeLines = [...linesOf(connected.stripe), ...(app.badges ?? [])];
  const customerBand = bandFrom(rcLines, /([\d.,]+(?:\s*[–-]\s*[\d.,]+)?[kKmM]?)\s+customers/i);
  const revenueBand = bandFrom(
    [...rcLines, ...stripeLines],
    /(\$[\d.,]+(?:\s*[–-]\s*\$?[\d.,]+)?[kKmM]?)/i,
  );

  const badges = [
    { id: 'find', label: 'Find us on' },
    { id: 'tested', label: `Tested by ${app.trades} builders` },
    {
      id: 'revenue',
      label: revenueBand ? `Verified ${revenueBand} MRR` : 'Verified MRR',
      locked: !revenue,
    },
    {
      id: 'customers',
      label: customerBand ? `${customerBand} verified customers` : 'Verified customers',
      locked: !customers,
    },
    {
      id: 'commits',
      label:
        app.githubCommits != null
          ? `${app.githubCommits.toLocaleString()} verified commits`
          : 'Verified commits',
      locked: !commits,
    },
  ];

  const selected = badges.find((item) => item.id === badge);
  const dark = style === 'Dark';

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ gap: 14 }}>
        <Label>Badges for your site</Label>
        <Txt size={13.5} lh={1.45} muted>
          Drop one on your site so testers can find you on Hey100.
        </Txt>

        {badges.map((item) => (
          <Pressable
            key={item.id}
            onPress={() =>
              item.locked
                ? toast(
                    item.id === 'commits'
                      ? 'Connect GitHub first'
                      : item.id === 'customers'
                        ? 'Connect RevenueCat first'
                        : 'Connect Stripe or RevenueCat first',
                  )
                : setBadge(item.id)
            }
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 11,
              backgroundColor: c.surface,
              borderRadius: radii.card,
              borderWidth: 1.5,
              borderColor: badge === item.id ? c.ink : c.line,
              paddingHorizontal: 13,
              paddingVertical: 13,
              opacity: item.locked ? 0.55 : 1,
            }}
          >
            <Txt size={13.5} weight={500} style={{ flex: 1 }} numberOfLines={1}>
              {item.label}
            </Txt>
            <Ionicons
              name={item.locked ? 'lock-closed' : 'chevron-forward'}
              size={15}
              color={c.muted}
            />
          </Pressable>
        ))}

        {selected ? (
          <>
            <View
              style={{
                borderRadius: radii.cardLg,
                backgroundColor: dark ? '#101210' : '#FFFFFF',
                padding: 20,
                gap: 14,
                alignItems: 'center',
              }}
            >
              <Txt size={11} color={dark ? '#8E968F' : '#5B625C'}>
                © {new Date().getFullYear()} {shortName(app.name)}
              </Txt>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: dark ? '#1C1F1C' : '#F2F3EF',
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderWidth: 1.5,
                  borderTopColor: dark ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.95)',
                  borderLeftColor: dark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.8)',
                  borderBottomColor: dark ? 'rgba(0,0,0,0.7)' : 'rgba(18,20,18,0.22)',
                  borderRightColor: dark ? 'rgba(0,0,0,0.55)' : 'rgba(18,20,18,0.16)',
                  shadowColor: '#000',
                  shadowOpacity: dark ? 0.45 : 0.16,
                  shadowRadius: 3,
                  shadowOffset: { width: 0, height: 2 },
                }}
              >
                <Txt size={12.5} weight={600} color={dark ? '#E8ECE7' : '#121412'}>
                  {selected.label}
                </Txt>
                <Wordmark size={16} />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['Dark', 'Light'] as const).map((tone) => (
                <Pressable
                  key={tone}
                  onPress={() => setStyle(tone)}
                  style={{
                    flex: 1,
                    height: 42,
                    borderRadius: radii.pill,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: style === tone ? c.ink : 'transparent',
                    borderWidth: 1.5,
                    borderColor: style === tone ? c.ink : c.line,
                  }}
                >
                  <Txt size={14} weight={600} color={style === tone ? c.bg : c.ink}>
                    {tone}
                  </Txt>
                </Pressable>
              ))}
            </View>

            <View
              style={{
                backgroundColor: c.bg,
                borderRadius: radii.card,
                borderWidth: 1,
                borderColor: c.line,
                padding: 13,
              }}
            >
              <Txt size={11} muted lh={1.5} style={{ fontFamily: fonts.mono }}>
                {`<a href="https://${url}"><img src="https://hey100.com/badge/${slug}.svg?style=${style.toLowerCase()}&type=${badge}"></a>`}
              </Txt>
            </View>

            <Btn
              label="Copy embed code"
              variant="accent"
              size="lg"
              full
              onPress={() => {
                Clipboard.setStringAsync(
                  `<a href="https://${url}"><img src="https://hey100.com/badge/${slug}.svg?style=${style.toLowerCase()}&type=${badge}"></a>`,
                ).catch(() => {});
                toast('Embed code copied');
              }}
            />
          </>
        ) : null}
      </View>
    </Sheet>
  );
}
