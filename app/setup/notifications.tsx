import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Btn } from '@/components/ui/Btn';
import { Txt } from '@/components/ui/Txt';
import { requestPushPermission } from '@/lib/onesignal';
import { useTheme } from '@/theme/ThemeProvider';
import { layout } from '@/theme/tokens';

export default function SetupNotifications() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { appId } = useLocalSearchParams<{ appId?: string }>();
  const [asking, setAsking] = useState(false);

  const next = () =>
    router.replace({ pathname: '/setup/bio', params: { appId: appId ?? '' } });

  const enable = async () => {
    if (asking) return;
    setAsking(true);
    try {
      await requestPushPermission();
    } catch {
      // Declining is fine — they can turn them on later in Settings.
    } finally {
      setAsking(false);
      next();
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.bg,
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 20,
        paddingHorizontal: layout.gutter,
        justifyContent: 'space-between',
      }}
    >
      <View style={{ gap: 18, paddingTop: 24 }}>
        <Txt font="mono" size={34} weight={500} lh={1.15} tracking={-0.4}>
          Turn on notifications
        </Txt>
        <Txt size={20} lh={1.4} weight={400}>
          You'll know when someone says hey, a match opens, or a builder actually replies.
        </Txt>
      </View>

      <View style={{ gap: 10 }}>
        <Btn
          label={asking ? 'Asking…' : 'Turn on notifications'}
          variant="accent"
          size="lg"
          full
          onPress={() => void enable()}
        />
        <Btn label="Not now" variant="ghost" size="md" full onPress={next} />
      </View>
    </View>
  );
}
