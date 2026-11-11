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
import { radii } from '@/theme/tokens';

const PERKS = [
  ['Fit sentiment', 'See who opened the listing and heyed instead of passing, including people whose interests or devices match.'],
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

  const fit = data?.fit.overall;
  const scroll = data?.scrollDepth;

  return (
    <View style={{ gap: 10 }}>
      <Card padding={16} radius={radii.cardLg} style={{ gap: 10 }}>
        <Label>Fit sentiment</Label>
        <Txt font="mono" size={28} weight={500}>
          {fit == null ? '—' : `${Math.round(fit * 100)}%`}
        </Txt>
        <Txt size={13} muted>
          People who opened this listing and heyed instead of passing.
        </Txt>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {(
            [
              ['Interests', data?.fit.interests],
              ['Devices', data?.fit.devices],
            ] as const
          ).map(([label, value]) => (
            <View key={label} style={{ flex: 1, gap: 3 }}>
              <Txt font="mono" size={16} weight={500}>
                {value == null ? '—' : `${Math.round(value * 100)}%`}
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
          {scroll == null ? '—' : `${Math.round(scroll * 100)}%`}
        </Txt>
        <Txt size={13} muted>
          How far people typically get down your listing.
        </Txt>
      </Card>

      {app.pitchUri ? (
        <Card padding={16} radius={radii.cardLg} style={{ gap: 8 }}>
          <Label>Pitch watch time</Label>
          <Txt font="mono" size={28} weight={500}>
            {data?.pitchWatches && data.pitchAvgSeconds != null
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

const SAMPLES = ['Fit 64%', 'Liked · Demo', 'Scroll 48%', 'Pitch 12s'];

const sampleChip = {
  height: 38,
  paddingHorizontal: 12,
  borderRadius: 999,
  backgroundColor: '#FFFFFF',
  borderWidth: 2,
  borderColor: '#111111',
  justifyContent: 'center' as const,
  shadowColor: '#111111',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 1,
  shadowRadius: 0,
};

function InsightsPromo() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Premium insights"
        onPress={() => setOpen(true)}
      >
        <View
          style={{
            backgroundColor: '#2E5CFF',
            borderRadius: 22,
            padding: 16,
            gap: 14,
          }}
        >
          <Label color="#FFFFFF">Premium insights</Label>
          <Txt size={22} weight={700} lh={1.15} color="#FFFFFF">
            See why people hey, skip, or stall
          </Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {SAMPLES.map((sample) => (
              <View key={sample} style={sampleChip}>
                <Txt size={14} weight={700} color="#111111">
                  {sample}
                </Txt>
              </View>
            ))}
          </View>
        </View>
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
