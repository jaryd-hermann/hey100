import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HandMark } from '@/components/brand/Logo';
import { AppIcon } from '@/components/ui/AppIcon';
import { Btn } from '@/components/ui/Btn';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { Label, Txt } from '@/components/ui/Txt';
import { shortName } from '@/data/mock';
import { AppPage, CompactAppBar, useCompactBar } from '@/features/app-page/AppPage';
import { BuilderSheet } from '@/features/app-page/BuilderSheet';
import { PassReasonSheet } from '@/features/heys/PassReasonSheet';
import { captureEvent } from '@/lib/analytics';
import { useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radii } from '@/theme/tokens';

export default function LikerProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const toast = useToast();
  const store = useStore();

  const { id } = useLocalSearchParams<{ id: string }>();
  const { compact, onScroll } = useCompactBar();
  const [builderOpen, setBuilderOpen] = useState(false);
  const [passOpen, setPassOpen] = useState(false);

  const hey = store.heys.find((item) => item.id === id);
  const listing = hey ? store.listing(hey.appId) : undefined;
  const viaApp = hey ? store.apps[hey.viaAppId] : undefined;

  if (!hey || !listing) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.bg,
          paddingTop: insets.top + 40,
          paddingHorizontal: layout.gutter,
        }}
      >
        <Txt muted>This hey is no longer waiting.</Txt>
        <Btn
          label="Back to Heys"
          variant="surface"
          onPress={() => router.back()}
          style={{ marginTop: 16, alignSelf: 'flex-start' }}
        />
      </View>
    );
  }

  const commitPass = (reason?: string) => {
    void store.passHey(hey.id, reason);
    captureEvent('hey_passed', {
      source: 'liker_profile',
      reason: reason ?? null,
    });
    toast(reason ? 'Passed. That tunes Discover.' : 'Passed, silently');
    router.back();
  };

  /** Dismissing the sheet must still pass, or the tap is silently lost. */
  const closePassSheet = (stopAsking: boolean, reason?: string) => {
    if (stopAsking) store.dismissPassFeedback();
    setPassOpen(false);
    commitPass(reason);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: layout.gutter,
          paddingBottom: 10,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={26} color={c.ink} />
        </Pressable>
        <Txt font="mono" size={17} weight={500} style={{ flex: 1 }} numberOfLines={1}>
          {shortName(listing.name)}
        </Txt>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={64}
        onScroll={(event) => onScroll(event.nativeEvent.contentOffset.y)}
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingBottom: insets.bottom + 110,
        }}
      >
        <AppPage
          listing={listing}
          mode="liker"
          onOpenBuilder={() => setBuilderOpen(true)}
          onOpenLink={(kind, value) =>
            router.push({ pathname: '/browser', params: { kind, value } })
          }
          banner={
            <Card tone="soft" padding={14} radius={radii.cardLg} style={{ gap: 9 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {viaApp ? (
                  <AppIcon hue={viaApp.hue} name={viaApp.name} uri={viaApp.icon} size={18} />
                ) : null}
                <Label size={10} style={{ flex: 1 }}>
                  Said hey to {shortName(viaApp?.name ?? 'your app')}&apos;s {hey.target}
                </Label>
              </View>
              <Txt size={15.5} lh={1.45} color={c.accentText}>
                {hey.note}
              </Txt>
            </Card>
          }
        />
      </ScrollView>

      <CompactAppBar listing={listing} visible={compact} top={insets.top} />

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: layout.gutter,
          paddingTop: 12,
          paddingBottom: insets.bottom + 12,
          backgroundColor: c.bg,
          borderTopWidth: 1,
          borderColor: c.line,
          flexDirection: 'row',
          gap: 10,
        }}
      >
        <Btn
          label="Pass"
          variant="surface"
          size="lg"
          style={{ flex: 1 }}
          onPress={() => {
            if (store.passFeedbackDismissed) {
              commitPass();
              return;
            }
            setPassOpen(true);
          }}
        />
        <Btn
          label="Hey back"
          variant="accent"
          size="lg"
          left={<HandMark size={20} />}
          style={{ flex: 1.4 }}
          onPress={async () => {
            const result = await store.heyBack(hey.id);
            captureEvent('hey_back', {
              matched: result.matched,
              source: 'liker_profile',
            });

            if (result.blocked) {
              if (result.blocked === 'match_limit') router.replace('/paywall?reason=match5');
              else toast("That didn't go through. Try again.");
              return;
            }

            router.replace({
              pathname: '/match',
              params: {
                appId: hey.appId,
                viaAppId: hey.viaAppId,
                matchId: result.matchId ?? '',
                paywall: result.hitPaywall ? '1' : '',
              },
            });
          }}
        />
      </View>

      <PassReasonSheet
        visible={passOpen}
        appName={shortName(listing.name)}
        onClose={(stopAsking) => closePassSheet(stopAsking)}
        onSubmit={(reason, stopAsking) => closePassSheet(stopAsking, reason)}
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
