import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Sheet } from '@/components/ui/Sheet';
import { Btn } from '@/components/ui/Btn';
import { Label, Txt } from '@/components/ui/Txt';
import { queryKeys } from '@/data/repo/keys';
import { fetchListingInsights } from '@/data/repo/insights';
import type { OwnedApp } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

const PERKS = [
  ['Fit sentiment', 'See who in your target audience likes vs skips, by interests, age, and gender.'],
  ['Most liked element', 'Learn whether the demo, a screenshot, or a prompt starts the most heys.'],
  ['Scroll depth', 'See how far people get down the listing before they leave.'],
  ['Listing coach', 'Ask an AI trained on your product profile how to tighten the pitch and grow views.'],
];

export function useListingInsights(appId: string, days: number | 'all') {
  return useQuery({
    queryKey: queryKeys.listingInsights(appId, days),
    queryFn: () => fetchListingInsights(appId, days),
  });
}

export function PremiumInsights({
  app,
  isPro,
  days,
}: {
  app: OwnedApp;
  isPro: boolean;
  days: number | 'all';
}) {
  const { data } = useListingInsights(app.id, days);
  if (!isPro) return <InsightsPromo />;

  const fit = data?.fit.overall ?? 0;
  const scroll = data?.scrollDepth ?? 0;

  return (
    <View style={{ gap: 10 }}>
      <Card padding={16} radius={radii.cardLg} style={{ gap: 10 }}>
        <Label>Fit sentiment</Label>
        <Txt font="mono" size={28} weight={500}>
          {`${Math.round(fit * 100)}%`}
        </Txt>
        <Txt size={13} muted>
          People in your target audience seeing this listing and liking vs skipping.
        </Txt>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {(
            [
              ['Interests', data?.fit.interests ?? 0],
              ['Age', data?.fit.age ?? 0],
              ['Gender', data?.fit.gender ?? 0],
            ] as const
          ).map(([label, value]) => (
            <View key={label} style={{ flex: 1, gap: 3 }}>
              <Txt font="mono" size={16} weight={500}>
                {`${Math.round(value * 100)}%`}
              </Txt>
              <Label size={10}>{label}</Label>
            </View>
          ))}
        </View>
      </Card>

      <Card padding={16} radius={radii.cardLg} style={{ gap: 8 }}>
        <Label>Most liked element</Label>
        <Txt size={16} weight={600}>
          {data?.likedElement || 'Not enough data yet'}
        </Txt>
        <Txt size={13} muted>
          Where heys start most often: demo, a screenshot, or a prompt.
        </Txt>
      </Card>

      <Card padding={16} radius={radii.cardLg} style={{ gap: 8 }}>
        <Label>Average scroll depth</Label>
        <Txt font="mono" size={28} weight={500}>
          {`${Math.round(scroll * 100)}%`}
        </Txt>
        <Txt size={13} muted>
          How far people typically get down your listing.
        </Txt>
      </Card>

      {app.pitchUri ? (
        <Card padding={16} radius={radii.cardLg} style={{ gap: 8 }}>
          <Label>Pitch watch time</Label>
          <Txt font="mono" size={28} weight={500}>
            {data?.pitchWatches
              ? `${data.pitchAvgSeconds.toFixed(data.pitchAvgSeconds % 1 ? 1 : 0)}s`
              : '—'}
          </Txt>
          <Txt size={13} muted>
            {data?.pitchWatches
              ? `Average of ${data.pitchWatches} watch${data.pitchWatches === 1 ? '' : 'es'} on a ${data.pitchSeconds || app.pitchSeconds || 0}s pitch. ${Math.round((data.pitchCompletion ?? 0) * 100)}% finish it.`
              : 'No watches yet. The coach uses this to judge the opening.'}
          </Txt>
        </Card>
      ) : null}
    </View>
  );
}

function InsightsPromo() {
  const { c } = useTheme();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable onPress={() => setOpen(true)}>
        <Card
          padding={16}
          radius={radii.cardLg}
          style={{ gap: 8, borderWidth: 1.5, borderColor: c.accent }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Txt font="mono" size={16} weight={500} style={{ flex: 1 }}>
              Premium insights
            </Txt>
            <View
              style={{
                paddingHorizontal: 8,
                height: 22,
                borderRadius: 11,
                backgroundColor: c.soft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Label size={9} color={c.accentText}>
                Builder Pro
              </Label>
            </View>
          </View>
          <Txt size={14} lh={1.4}>
            See who likes your listing, where they stop, and get an AI coach trained on your product.
          </Txt>
          <Txt size={13} weight={600} color={c.accentText}>
            See what Pro unlocks
          </Txt>
        </Card>
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)}>
        <View style={{ gap: 16 }}>
          <Txt font="mono" size={22} weight={500}>
            Builder Pro insights
          </Txt>
          <Txt size={15} lh={1.45}>
            Free shows the basics. Pro tells you why people hey, skip, or stall — so you can fix the
            listing instead of guessing.
          </Txt>
          {PERKS.map(([title, body]) => (
            <View key={title} style={{ gap: 4 }}>
              <Txt size={15} weight={600}>
                {title}
              </Txt>
              <Txt size={13.5} muted lh={1.4}>
                {body}
              </Txt>
            </View>
          ))}
          <Btn
            label="Get Builder Pro"
            variant="accent"
            size="lg"
            full
            onPress={() => {
              setOpen(false);
              router.push('/paywall');
            }}
          />
        </View>
      </Sheet>
    </>
  );
}
