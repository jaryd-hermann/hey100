import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Txt } from '@/components/ui/Txt';
import { persistListing } from '@/features/apps/persistListing';
import { useAuth } from '@/features/auth/AuthProvider';
import { FlowButton } from '@/features/onboarding/FlowButton';
import { INK, LIME } from '@/features/onboarding/look';
import { FREE_AUDIENCE_LIMIT, useStore } from '@/store/AppStore';

function splitAudiences(value?: string): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function KeepAudiences() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const store = useStore();
  const { userId } = useAuth();
  const listing = store.primaryApp;
  const all = useMemo(() => splitAudiences(listing.ideal?.interests), [listing.ideal?.interests]);
  const [keep, setKeep] = useState(all[0] ?? '');
  const kept = keep || all[0] || 'this audience';

  const continueFree = async () => {
    const next = keep || all[0];
    if (next && listing.id) {
      const ideal = { ...listing.ideal, interests: next };
      store.updateApp(listing.id, { ideal });
      try {
        await persistListing(userId, listing.id, { ideal });
      } catch {
        // Local trim still applies if the listing patch is delayed.
      }
    }
    router.replace({ pathname: '/setup/bio', params: { appId: listing.id } });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#2E5CFF', paddingTop: insets.top }}>
      <StatusBar style="light" />
      <View style={{ paddingHorizontal: 22, paddingTop: 14, gap: 9 }}>
        <Txt font="mono" size={29} weight={600} lh={1.12} tracking={-1.45} color="#FFFFFF">
          Free listings keep {FREE_AUDIENCE_LIMIT} audience.
        </Txt>
        <Txt size={16} lh={1.45} color="rgba(255,255,255,0.84)">
          Pick the one to keep, or go back to Pro.
        </Txt>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 22, paddingTop: 22 }}>
        {all.map((label) => {
          const selected = kept === label;
          return (
            <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setKeep(label)}>
              <View>
                {selected ? null : (
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: 3,
                      bottom: -3,
                      borderRadius: 21,
                      backgroundColor: '#000000',
                    }}
                  />
                )}
                <View
                  style={{
                    minHeight: 42,
                    paddingHorizontal: 16,
                    borderRadius: 21,
                    borderWidth: 2,
                    borderColor: INK,
                    backgroundColor: selected ? LIME : '#FFFFFF',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Txt size={14.5} weight={600} color={INK}>
                    {selected ? `✓ ${label}` : label}
                  </Txt>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flex: 1 }} />
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 34), gap: 10 }}>
        <FlowButton
          label={`Keep ${kept}`}
          bg={LIME}
          fg={INK}
          shadow="#000000"
          onPress={() => void continueFree()}
        />
        <Pressable
          onPress={() => router.replace({ pathname: '/paywall', params: { from: 'audiences' } })}
          style={{ height: 30, alignItems: 'center', justifyContent: 'center' }}
        >
          <Txt size={14.5} weight={700} color="#FFFFFF" style={{ textDecorationLine: 'underline' }}>
            Go back to Pro
          </Txt>
        </Pressable>
      </View>
    </View>
  );
}
