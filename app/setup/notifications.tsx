import { Ionicons } from '@expo/vector-icons';
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
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20, paddingHorizontal: layout.gutter, justifyContent: 'space-between' }}>
      <View style={{ gap: 16, paddingTop: 24 }}>
        <Ionicons name="notifications-outline" size={36} color={c.accentText} />
        <Txt font="mono" size={27} weight={500} lh={1.22}>
          Know when someone says hey
        </Txt>
        <Txt size={15.5} lh={1.5} muted>
          A match, a reply, feedback, or a group you would actually join. You can turn any of it
          off later in Settings.
        </Txt>
      </View>

      <View style={{ gap: 10 }}>
        <Btn label={asking ? 'Asking…' : 'Turn on notifications'} variant="accent" size="lg" full onPress={() => void enable()} />
        <Btn label="Not now" variant="ghost" size="md" full onPress={next} />
      </View>
    </View>
  );
}
