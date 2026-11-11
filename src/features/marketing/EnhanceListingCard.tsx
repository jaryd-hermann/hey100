import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';

import { Label, Txt } from '@/components/ui/Txt';
import { shortName } from '@/data/mock';
import type { IntegrationKey } from '@/data/types';
import { ConnectSheets, useIntegrationActions } from '@/features/apps/connect/ConnectSheets';
import { IntegrationMark } from '@/features/apps/connect/IntegrationMark';
import { listingStrength } from '@/features/apps/listingStrength';
import { useStore } from '@/store/AppStore';

const MISSING: { key: IntegrationKey; name: string }[] = [
  { key: 'stripe', name: 'Stripe - verify revenue' },
  { key: 'revenuecat', name: 'RevenueCat - verify customers' },
  { key: 'github', name: 'GitHub - verify commits' },
  { key: 'posthog', name: 'PostHog - verify usage' },
];

const chip = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 6,
  height: 38,
  paddingLeft: 6,
  paddingRight: 12,
  borderRadius: 999,
  borderWidth: 2,
  borderColor: '#111111',
  shadowColor: '#111111',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 1,
  shadowRadius: 0,
};

/** Shown when nothing is waiting in Received. The card opens the listing; each chip starts that connect flow. */
export function EnhanceListingCard() {
  const router = useRouter();
  const store = useStore();
  const app = store.primaryApp;
  const integrations = useIntegrationActions(app.id);
  const connections = integrations.connected;
  const missing = MISSING.filter((item) => !connections[item.key]);
  const strength = listingStrength(app, connections);
  const openListing = () => router.push({ pathname: '/my-app/[id]', params: { id: app.id } });

  return (
    <>
      <View
        style={{
          backgroundColor: '#FFFF00',
          borderRadius: 22,
          padding: 16,
          gap: 14,
        }}
      >
        <Pressable accessibilityRole="button" accessibilityLabel="Enhance your listing" onPress={openListing}>
          <View style={{ gap: 14 }}>
            <Label color="#111111">Enhance listing</Label>
            <Txt size={22} weight={700} lh={1.15} color="#111111">
              Make {shortName(app.name)} stand out
            </Txt>
          </View>
        </Pressable>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {missing.map((item) => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={item.name}
              onPress={() => void integrations.run(item.key)}
              style={[chip, { backgroundColor: '#FFFFFF' }]}
            >
              <IntegrationMark provider={item.key} connected size={22} />
              <Txt size={14} weight={700} color="#111111">
                {item.name}
              </Txt>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Listing strength ${strength.done} of ${strength.total}`}
            onPress={openListing}
            style={[chip, { backgroundColor: '#C6F24E', paddingLeft: 12 }]}
          >
            <Txt size={14} weight={700} color="#111111">
              Strength {strength.done}/{strength.total}
            </Txt>
          </Pressable>
        </View>
      </View>
      <ConnectSheets
        appId={app.id}
        appName={app.name}
        appIcon={app.icon}
        appHue={app.hue}
        storeUrl={app.storeUrl}
        sheet={integrations.sheet}
        onClose={() => integrations.setSheet(null)}
      />
    </>
  );
}
