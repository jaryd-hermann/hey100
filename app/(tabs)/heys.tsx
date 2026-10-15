import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { AppIcon } from '@/components/ui/AppIcon';
import { Btn } from '@/components/ui/Btn';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { Label, Txt } from '@/components/ui/Txt';
import { shortName } from '@/data/mock';
import { captureEvent } from '@/lib/analytics';
import { useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

export default function HeysScreen() {
  const router = useRouter();
  const { c } = useTheme();
  const toast = useToast();
  const store = useStore();

  const heyBack = (heyId: string) => {
    const result = store.heyBack(heyId);
    captureEvent('hey_back', { matched: result.matched });
    if (result.matchId) {
      const hey = store.heys.find((item) => item.id === heyId);
      router.push({
        pathname: '/match',
        params: {
          appId: result.matchId,
          viaAppId: hey?.viaAppId ?? store.primaryApp.id,
          paywall: result.hitPaywall ? '1' : '',
        },
      });
    }
  };

  return (
    <Screen title="Heys">
      {store.heys.length === 0 ? (
        <View style={{ paddingTop: 80, alignItems: 'center', gap: 12 }}>
          <Txt font="mono" size={18} weight={500} center>
            No heys waiting.
          </Txt>
          <Txt size={15} lh={1.5} muted center style={{ maxWidth: 270 }}>
            Say hey to a few apps in Discover. A note doubles your reply rate.
          </Txt>
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          <Txt size={14} lh={1.45} muted>
            {store.heys.length} builder{store.heys.length === 1 ? '' : 's'} said hey to your apps.
            Hey back to open a chat.
          </Txt>

          {store.heys.map((hey) => {
            const listing = store.listing(hey.appId);
            const viaApp = store.apps[hey.viaAppId];
            if (!listing) return null;

            return (
              <Card key={hey.id} padding={16} radius={radii.cardLg} style={{ gap: 14 }}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/hey/[id]', params: { id: hey.id } })}
                  style={({ pressed }) => ({ gap: 14, opacity: pressed ? 0.85 : 1 })}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
                    <AppIcon hue={listing.hue} name={listing.name} size={52} />
                    <View style={{ flex: 1 }}>
                      <Txt font="mono" size={15} weight={500} numberOfLines={1}>
                        {listing.name}
                      </Txt>
                      <Txt size={13} muted numberOfLines={1}>
                        {listing.builder} · {listing.cat}
                      </Txt>
                    </View>
                  </View>

                  <View
                    style={{
                      backgroundColor: c.bg,
                      borderRadius: radii.card,
                      padding: 13,
                      gap: 8,
                      borderWidth: 1,
                      borderColor: c.line,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {viaApp ? (
                        <AppIcon hue={viaApp.hue} name={viaApp.name} size={18} />
                      ) : null}
                      <Label size={10} style={{ flex: 1 }}>
                        Said hey to {shortName(viaApp?.name ?? 'your app')}&apos;s {hey.target}
                      </Label>
                    </View>
                    <Txt size={15} lh={1.45}>
                      {hey.note}
                    </Txt>
                  </View>
                </Pressable>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Btn
                    label="Pass"
                    variant="surface"
                    style={{ flex: 1 }}
                    onPress={() => {
                      store.dismissHey(hey.id);
                      store.passApp(hey.appId);
                      toast('Passed, silently');
                    }}
                  />
                  <Btn
                    label="Hey back"
                    variant="accent"
                    left={<Txt size={15}>✋</Txt>}
                    style={{ flex: 1.3 }}
                    onPress={() => heyBack(hey.id)}
                  />
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
