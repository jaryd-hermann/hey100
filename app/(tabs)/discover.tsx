import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeaderLogo } from '@/components/brand/Logo';
import { Btn } from '@/components/ui/Btn';
import { Glass } from '@/components/ui/Glass';
import { HeyPill } from '@/components/ui/HeyPill';
import { useToast } from '@/components/ui/Toast';
import { Txt } from '@/components/ui/Txt';
import { DECK_IDS, LISTINGS, shortName } from '@/data/mock';
import type { AppListing } from '@/data/types';
import { AppPage, CompactAppBar, useCompactBar, type HeyTarget } from '@/features/app-page/AppPage';
import { BuilderSheet } from '@/features/app-page/BuilderSheet';
import {
  FilterBar,
  INITIAL_FILTERS,
  applyFilters,
  type FilterState,
} from '@/features/discover/FilterBar';
import { HeySheet } from '@/features/discover/HeySheet';
import { captureEvent } from '@/lib/analytics';
import { useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { layout } from '@/theme/tokens';

export default function DiscoverScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const toast = useToast();
  const store = useStore();

  const scrollRef = useRef<ScrollView>(null);
  const { compact, onScroll, reset } = useCompactBar();

  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [index, setIndex] = useState(0);
  const [heyTarget, setHeyTarget] = useState<HeyTarget | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);

  const deck = useMemo(() => {
    // The server already excludes what has been passed, heyed or matched; the
    // bundled deck has none of that, so passes are filtered here for both.
    const source = store.deckIds
      ? store.deckIds.map((id) => store.listing(id))
      : DECK_IDS.map((id) => LISTINGS[id]);

    const listings = source.filter(
      (listing): listing is AppListing => !!listing && !store.passed.includes(listing.id),
    );

    return applyFilters(listings, filters);
  }, [filters, store]);

  const listing = deck[index];
  const viaApp = listing ? store.attributedApp(listing.id) : store.primaryApp;

  const advance = () => {
    reset();
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    setIndex((prev) => (prev + 1 >= deck.length ? 0 : prev + 1));
  };

  const sendHey = async (note: string) => {
    if (!listing || !heyTarget) return;

    if (!store.isPro && store.heysLeftToday <= 0) {
      setHeyTarget(null);
      router.push('/paywall?reason=heys');
      return;
    }

    const target = heyTarget;
    const name = shortName(listing.name);
    setHeyTarget(null);
    // The card leaves the deck now; the server's answer only decides what the
    // next screen is.
    advance();

    const result = await store.sayHey({
      appId: listing.id,
      targetType: target.type,
      target: target.label,
      note,
    });

    captureEvent('hey_sent', {
      target_type: target.type,
      has_note: note.length > 0,
      matched: result.matched,
    });

    if (result.blocked) {
      if (result.blocked === 'daily_limit') router.push('/paywall?reason=heys');
      else if (result.blocked === 'match_limit') router.push('/paywall?reason=match5');
      else toast("That hey didn't send. Try again.");
      return;
    }

    if (result.matched) {
      router.push({
        pathname: '/match',
        params: {
          appId: listing.id,
          viaAppId: viaApp.id,
          matchId: result.matchId ?? '',
          paywall: result.hitPaywall ? '1' : '',
        },
      });
      return;
    }

    toast(`Hey sent to ${name}`);
  };

  const filtered =
    filters.sort !== INITIAL_FILTERS.sort ||
    filters.quick.join() !== INITIAL_FILTERS.quick.join() ||
    filters.cat.length > 0 ||
    filters.plat.length > 0 ||
    filters.stage.length > 0;

  if (!listing) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.bg,
          paddingTop: insets.top,
          paddingHorizontal: layout.gutter,
        }}
      >
        {/* The filters stay reachable, since they are the likely cause. */}
        <DiscoverHeader filters={filters} onChange={setFilters} inset={false} />
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
          }}
        >
          <Txt font="mono" size={19} weight={500} center>
            That&apos;s everyone for now.
          </Txt>
          <Txt size={15} lh={1.5} muted center style={{ maxWidth: 280 }}>
            {filtered
              ? 'New apps are listed every day. Clear your filters, or check who said hey to you.'
              : 'New apps are listed every day. Check who said hey to you in the meantime.'}
          </Txt>
          <Btn
            label={filtered ? 'Clear filters' : 'See your heys'}
            variant="surface"
            onPress={() => {
              if (!filtered) {
                router.navigate('/(tabs)/heys');
                return;
              }
              setFilters(INITIAL_FILTERS);
              setIndex(0);
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <DiscoverHeader filters={filters} onChange={setFilters} />

      <View style={{ height: 14 }} />

      <ScrollView
        style={{ flex: 1 }}
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={64}
        onScroll={(event) => onScroll(event.nativeEvent.contentOffset.y)}
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingBottom: layout.tabBarSpacer + 70,
        }}
      >
        <AppPage
          listing={listing}
          mode="discover"
          onHey={setHeyTarget}
          onOpenBuilder={() => setBuilderOpen(true)}
          onOpenLink={(kind, value) =>
            router.push({ pathname: '/browser', params: { kind, value } })
          }
        />
      </ScrollView>

      <CompactAppBar listing={listing} visible={compact} top={insets.top} />

      <View
        style={{
          position: 'absolute',
          left: layout.gutter,
          right: layout.gutter,
          bottom: layout.tabBarSpacer - 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Glass radius={29} intensity={55}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Pass on ${shortName(listing.name)}`}
            onPress={() => {
              void store.passApp(listing.id);
              captureEvent('app_passed', { app_id: listing.id });
              advance();
            }}
            style={{
              width: 58,
              height: 58,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="close" size={26} color={c.ink} />
          </Pressable>
        </Glass>

        <HeyPill
          size={58}
          onPress={() => setHeyTarget({ type: 'app', id: listing.id, label: listing.name })}
        />
      </View>

      <HeySheet
        visible={!!heyTarget}
        listing={listing}
        target={heyTarget}
        heysLeft={store.heysLeftToday}
        unlimited={store.isPro}
        viaAppName={shortName(viaApp.name)}
        onClose={() => setHeyTarget(null)}
        onSend={sendHey}
      />

      <BuilderSheet
        visible={builderOpen}
        listing={listing}
        onClose={() => setBuilderOpen(false)}
        onOpenLink={(kind, value) => {
          setBuilderOpen(false);
          router.push({ pathname: '/browser', params: { kind, value } });
        }}
      />
    </View>
  );
}

/** Wordmark and filters share one row, so the deck gets the vertical space. */
function DiscoverHeader({
  filters,
  onChange,
  inset = true,
}: {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  /** Off when the parent already applies the page gutter. */
  inset?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: inset ? layout.gutter : 0,
        paddingTop: 6,
        minHeight: 48,
      }}
    >
      <View style={{ flexShrink: 0 }}>
        <HeaderLogo hand />
      </View>
      {/* The chips scroll out under the right edge of the screen. */}
      <FilterBar
        filters={filters}
        onChange={onChange}
        style={{ flex: 1, marginRight: inset ? -layout.gutter : 0 }}
      />
    </View>
  );
}
