import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/ui/AppIcon';
import { Btn } from '@/components/ui/Btn';
import { Sheet } from '@/components/ui/Sheet';
import { Txt } from '@/components/ui/Txt';
import { LISTINGS, shortName, slugify } from '@/data/mock';
import { AppPage } from '@/features/app-page/AppPage';
import { useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radii } from '@/theme/tokens';

/**
 * A preview of the public listing at hey100.com/{slug}. The real page is
 * server-rendered for Open Graph and search; this mirrors it for the owner.
 */
export default function WebListingPreview() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const store = useStore();

  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [signupOpen, setSignupOpen] = useState(false);

  const app =
    store.ownedApps.find((owned) => slugify(owned.name) === slug) ??
    Object.values(LISTINGS).find((listing) => slugify(listing.name) === slug) ??
    store.primaryApp;

  // Any interaction on the public page opens the sign-up sheet.
  const intercept = () => setSignupOpen(true);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: layout.gutter,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderColor: c.line,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color={c.ink} />
        </Pressable>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            justifyContent: 'center',
          }}
        >
          <Ionicons name="lock-closed" size={11} color={c.muted} />
          <Txt size={12.5} muted numberOfLines={1}>
            hey100.com/{slug}
          </Txt>
        </View>
        <Ionicons name="ellipsis-horizontal" size={19} color={c.muted} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}
      >
        <Pressable
          onPress={intercept}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 11,
            margin: layout.gutter,
            marginBottom: 6,
            padding: 12,
            borderRadius: radii.card,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.line,
          }}
        >
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              backgroundColor: c.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Txt size={17}>✋</Txt>
          </View>
          <View style={{ flex: 1 }}>
            <Txt size={13.5} weight={600}>
              Hey100
            </Txt>
            <Txt size={12} muted>
              Find your first 100 users
            </Txt>
          </View>
          <Btn label="Get" variant="ink" size="sm" onPress={intercept} />
        </Pressable>

        <View style={{ paddingHorizontal: layout.gutter, paddingTop: 10 }}>
          <AppPage
            listing={app}
            mode="web"
            onHey={intercept}
            onOpenBuilder={intercept}
            onOpenLink={intercept}
          />
        </View>

        <Pressable
          onPress={intercept}
          style={{
            margin: layout.gutter,
            marginTop: 26,
            padding: 16,
            borderRadius: radii.cardLg,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.line,
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Txt font="mono" size={15} weight={500}>
            Hey100
          </Txt>
          <Txt size={13} muted center>
            Discover · Heys · Chat · Feedback · Apps
          </Txt>
        </Pressable>
      </ScrollView>

      <Sheet visible={signupOpen} onClose={() => setSignupOpen(false)}>
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <AppIcon hue={app.hue} name={app.name} size={52} />
            <View style={{ flex: 1 }}>
              <Txt font="mono" size={16} weight={500} numberOfLines={1}>
                Want to try {shortName(app.name)}?
              </Txt>
              <Txt size={13.5} muted numberOfLines={2}>
                Match with {app.builder} on Hey100 and trade honest feedback.
              </Txt>
            </View>
          </View>

          <Btn
            label="Sign up to match"
            variant="accent"
            size="lg"
            full
            onPress={() => {
              setSignupOpen(false);
              router.push('/onboarding');
            }}
          />
          <Btn label="Get the iOS app" variant="surface" size="lg" full onPress={() => setSignupOpen(false)} />
          <Btn label="Keep browsing" variant="ghost" size="md" full onPress={() => setSignupOpen(false)} />
        </View>
      </Sheet>
    </View>
  );
}
