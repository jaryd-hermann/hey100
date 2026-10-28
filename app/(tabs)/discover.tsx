import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeaderLogo } from '@/components/brand/Logo';
import { Btn } from '@/components/ui/Btn';
import { HeyPill } from '@/components/ui/HeyPill';
import { useToast } from '@/components/ui/Toast';
import { Txt } from '@/components/ui/Txt';
import { DECK_IDS, LISTINGS, shortName } from '@/data/mock';
import type { AppListing } from '@/data/types';
import { AppPage, CompactAppBar, useCompactBar, type HeyTarget } from '@/features/app-page/AppPage';
import { BuilderSheet } from '@/features/app-page/BuilderSheet';
import { setDeckSort } from '@/features/discover/deckSort';
import {
  FilterBar,
  INITIAL_FILTERS,
  applyFilters,
  type FilterState,
} from '@/features/discover/FilterBar';
import { HeySheet } from '@/features/discover/HeySheet';
import { AppCard } from '@/features/apps/AppCard';
import { BadgesSheet } from '@/features/apps/BadgesSheet';
import { ShareListingSheet } from '@/features/apps/ShareListingSheet';
import { useDailyHeyLimit } from '@/features/billing/DailyHeyLimit';
import { CommunityPromoCard } from '@/features/marketing/CommunityPromoCard';
import { ProductHint } from '@/features/marketing/ProductHint';
import { useFirstHint } from '@/features/marketing/useFirstHint';
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
  const heyLimit = useDailyHeyLimit();

  const scrollRef = useRef<ScrollView>(null);
  const { compact, onScroll, reset } = useCompactBar();

  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [index, setIndex] = useState(0);
  const [heyTarget, setHeyTarget] = useState<HeyTarget | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [badgesOpen, setBadgesOpen] = useState(false);
  const discoverHint = useFirstHint('discover', !store.previewAppId);

  const deck = useMemo(() => {
    if (store.previewAppId) {
      const mine = store.listing(store.previewAppId) ?? store.primaryApp;
      return mine ? [mine] : [];
    }
    // The server already excludes what has been passed, heyed or matched; the
    // bundled deck has none of that, so passes are filtered here for both.
    const source = store.deckIds
      ? store.deckIds.map((id) => store.listing(id))
      : DECK_IDS.map((id) => LISTINGS[id]);

    const listings = source.filter(
      (listing): listing is AppListing => !!listing && !store.passed.includes(listing.id),
    );

    const mine = store.primaryApp;
    return applyFilters(
      listings,
      filters,
      {
        cat: mine?.cat ?? '',
        interests: mine?.ideal?.interests ?? '',
        plat: mine?.plat ?? '',
      },
      { resort: !store.deckIds },
    );
  }, [filters, store, store.previewAppId]);

  useEffect(() => {
    setDeckSort(filters.sort);
  }, [filters.sort]);

  useEffect(() => {
    setIndex(0);
  }, [filters, store.previewAppId]);

  useEffect(() => {
    if (index >= deck.length) setIndex(0);
  }, [deck.length, index]);

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
      heyLimit.open();
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

    if (result.blocked) {
      if (result.blocked === 'daily_limit') heyLimit.open();
      else if (result.blocked === 'match_limit') router.push('/paywall?reason=match5');
      else toast("That hey didn't send. Try again.");
      return;
    }

    captureEvent('hey_sent', {
      app_id: listing.id,
      target_type: target.type,
      target: target.label,
      has_note: note.length > 0,
      matched: result.matched,
    });

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
    const mine = store.primaryApp;
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.bg,
          paddingTop: insets.top,
          paddingHorizontal: layout.gutter,
        }}
      >
        <DiscoverHeader filters={filters} onChange={setFilters} inset={false} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: layout.tabBarSpacer + 24,
            gap: 16,
            paddingTop: 12,
          }}
        >
          <Txt font="mono" size={28} weight={500} lh={1.15}>
            That&apos;s everyone for now.
          </Txt>
          <Txt size={15} lh={1.5} muted>
            {filtered
              ? 'New apps are listed every day. Clear your filters, or work on your listing.'
              : 'New apps are listed every day.'}
          </Txt>
          {filtered ? (
            <Btn
              label="Clear filters"
              variant="surface"
              onPress={() => {
                setFilters(INITIAL_FILTERS);
                setIndex(0);
              }}
            />
          ) : null}

          {mine ? (
            <AppCard
              app={mine}
              onShare={() => setShareOpen(true)}
              onBadges={() => setBadgesOpen(true)}
              onEdit={() => router.push({ pathname: '/my-app/[id]', params: { id: mine.id } })}
            />
          ) : null}

          <Btn
            label="Invite builders to Hey100"
            variant="accent"
            size="lg"
            full
            onPress={() => {
              Share.share({
                message: 'Find your first 100 users on Hey100: https://hey100.com',
              }).catch(() => {});
            }}
          />

          <CommunityPromoCard
            from="discover"
            onPress={() => router.push({ pathname: '/(tabs)/chat', params: { desk: 'community' } })}
          />
        </ScrollView>

        <ShareListingSheet
          visible={shareOpen}
          app={mine ?? null}
          onClose={() => setShareOpen(false)}
        />
        <BadgesSheet visible={badgesOpen} app={mine ?? null} onClose={() => setBadgesOpen(false)} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <DiscoverHeader filters={filters} onChange={setFilters} />

      {store.previewAppId ? (
        <View
          style={{
            marginHorizontal: layout.gutter,
            marginTop: 4,
            marginBottom: 8,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 14,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.line,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Txt size={13} style={{ flex: 1 }}>
            Preview · this is what everyone else sees
          </Txt>
          <Pressable onPress={() => store.setPreviewApp(null)} hitSlop={8}>
            <Txt size={13} weight={600} color={c.accentText}>
              Exit
            </Txt>
          </Pressable>
        </View>
      ) : (
        <View style={{ height: 14 }} />
      )}

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
          mode={store.previewAppId ? 'web' : 'discover'}
          onHey={setHeyTarget}
          onOpenBuilder={() => setBuilderOpen(true)}
          onOpenLink={(kind, value) =>
            router.push({ pathname: '/browser', params: { kind, value } })
          }
        />
      </ScrollView>

      <CompactAppBar listing={listing} visible={compact} top={insets.top} />

      {store.previewAppId ? null : (
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Pass on ${shortName(listing.name)}`}
            onPress={() => {
              void store.passApp(listing.id);
              captureEvent('app_passed', { app_id: listing.id });
              advance();
            }}
            style={({ pressed }) => ({
              width: 58,
              height: 58,
              borderRadius: 29,
              borderWidth: 2,
              borderColor: c.ink,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: c.raised,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Ionicons name="close" size={28} color={c.danger} />
          </Pressable>

          <HeyPill
            size={58}
            onPress={() => setHeyTarget({ type: 'app', id: listing.id, label: listing.name })}
          />
        </View>
      )}

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

      <ProductHint
        visible={discoverHint.visible}
        surface="discover"
        title="This is Discover"
        body={
          'This is Discover, where you find apps and their makers, and they find you! It\'s the "dating" part of the app. Once you both match you can DM and try each others apps and share feedback.\n\nPass with the X if it is not for you. Tap the green hand to say hey.'
        }
        onClose={discoverHint.dismiss}
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
