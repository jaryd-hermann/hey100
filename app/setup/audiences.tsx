import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Btn } from '@/components/ui/Btn';
import { OptionRow } from '@/components/ui/OptionRow';
import { Txt } from '@/components/ui/Txt';
import { persistListing } from '@/features/apps/persistListing';
import { useAuth } from '@/features/auth/AuthProvider';
import { FREE_AUDIENCE_LIMIT, PRO_AUDIENCE_LIMIT, useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { layout } from '@/theme/tokens';

function splitAudiences(value?: string): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function KeepAudiences() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const store = useStore();
  const { userId } = useAuth();
  const listing = store.primaryApp;
  const all = useMemo(() => splitAudiences(listing.ideal?.interests), [listing.ideal?.interests]);
  const extra = Math.max(0, all.length - FREE_AUDIENCE_LIMIT);
  const [keep, setKeep] = useState(all[0] ?? '');

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
    router.replace({ pathname: '/setup/notifications', params: { appId: listing.id } });
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 16 }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingBottom: insets.bottom + 28,
          gap: 18,
        }}
      >
        <Txt font="mono" size={26} weight={500} lh={1.2}>
          Free listings keep {FREE_AUDIENCE_LIMIT} audience
        </Txt>
        <Txt size={16} lh={1.5}>
          You picked {all.length}. As a free user you&apos;ll lose {extra} target audience
          {extra === 1 ? '' : 's'}. Keep the one that matters most, or go Pro to keep all{' '}
          {Math.min(all.length, PRO_AUDIENCE_LIMIT)}.
        </Txt>

        <View style={{ gap: 8 }}>
          {all.map((label) => (
            <OptionRow
              key={label}
              label={label}
              single
              selected={keep === label}
              onPress={() => setKeep(label)}
            />
          ))}
        </View>

        <Btn
          label="Keep all, Go Pro"
          variant="accent"
          size="lg"
          full
          onPress={() => router.replace({ pathname: '/paywall', params: { from: 'audiences' } })}
        />
        <Btn
          label={`Keep ${keep || 'one'} and stay free`}
          variant="ghost"
          size="md"
          full
          onPress={() => void continueFree()}
        />
      </ScrollView>
    </View>
  );
}
