import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Txt } from '@/components/ui/Txt';
import { LISTINGS, shortName, slugify } from '@/data/mock';
import { queryKeys, staleTimes } from '@/data/repo/keys';
import { listingBySlug } from '@/data/repo/listings';
import { AppPage, type HeyTarget } from '@/features/app-page/AppPage';
import { BuilderSheet } from '@/features/app-page/BuilderSheet';
import { useDailyHeyLimit } from '@/features/billing/DailyHeyLimit';
import { HeySheet } from '@/features/discover/HeySheet';
import { cardToListing } from '@/features/loop/mapLoop';
import { useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { layout } from '@/theme/tokens';

/** Public listing opened from hey100.com/{slug}. */
export default function ListingBySlugScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const store = useStore();
  const heyLimit = useDailyHeyLimit();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [builderOpen, setBuilderOpen] = useState(false);
  const [heyTarget, setHeyTarget] = useState<HeyTarget | null>(null);

  const remote = useQuery({
    queryKey: queryKeys.listingBySlug(slug),
    enabled: !!slug,
    staleTime: staleTimes.listingBySlug,
    queryFn: () => listingBySlug(slug),
  });

  const fromStore = Object.values(store.listings).find((item) => item.slug === slug);
  const fromMock = Object.values(LISTINGS).find(
    (item) => item.slug === slug || slugify(item.name) === slug,
  );
  const listing = remote.data ? cardToListing(remote.data) : (fromStore ?? fromMock);
  const viaApp = listing ? store.attributedApp(listing.id) : store.primaryApp;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: layout.gutter,
          paddingBottom: 10,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color={c.ink} />
        </Pressable>
        <Txt font="mono" size={17} weight={500} style={{ flex: 1 }} numberOfLines={1}>
          {listing?.name ?? 'Listing'}
        </Txt>
      </View>

      {listing ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: layout.gutter,
            paddingBottom: insets.bottom + 24,
          }}
        >
          <AppPage
            listing={listing}
            mode="web"
            onHey={setHeyTarget}
            onOpenBuilder={() => setBuilderOpen(true)}
            onOpenLink={(kind, value) =>
              router.push({ pathname: '/browser', params: { kind, value } })
            }
          />
        </ScrollView>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Txt muted center>
            {remote.isLoading ? 'Loading…' : 'That listing is no longer available.'}
          </Txt>
        </View>
      )}

      <HeySheet
        visible={!!heyTarget && !!listing}
        listing={listing ?? null}
        target={heyTarget}
        heysLeft={store.heysLeftToday}
        unlimited={store.isPro}
        viaAppName={shortName(viaApp.name)}
        onClose={() => setHeyTarget(null)}
        onSend={async (note) => {
          if (!listing || !heyTarget) return;
          if (!store.isPro && store.heysLeftToday <= 0) {
            setHeyTarget(null);
            heyLimit.open();
            return;
          }
          setHeyTarget(null);
          const result = await store.sayHey({
            appId: listing.id,
            targetType: heyTarget.type,
            target: heyTarget.label,
            note,
          });
          if (result.blocked === 'daily_limit') heyLimit.open();
        }}
      />

      <BuilderSheet
        visible={builderOpen}
        listing={listing ?? null}
        onClose={() => setBuilderOpen(false)}
        onOpenLink={(kind, value) => {
          setBuilderOpen(false);
          router.push({ pathname: '/browser', params: { kind, value } });
        }}
      />
    </View>
  );
}
