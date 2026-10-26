import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Txt } from '@/components/ui/Txt';
import { LISTINGS, shortName } from '@/data/mock';
import { AppPage, type HeyTarget } from '@/features/app-page/AppPage';
import { BuilderSheet } from '@/features/app-page/BuilderSheet';
import { useDailyHeyLimit } from '@/features/billing/DailyHeyLimit';
import { HeySheet } from '@/features/discover/HeySheet';
import { useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { layout } from '@/theme/tokens';

/** Public listing view, opened from Sent heys and community members. */
export default function ListingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const store = useStore();
  const heyLimit = useDailyHeyLimit();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [builderOpen, setBuilderOpen] = useState(false);
  const [heyTarget, setHeyTarget] = useState<HeyTarget | null>(null);

  const listing = store.listing(id) ?? LISTINGS[id];
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
            That listing is no longer available.
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
