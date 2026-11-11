import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Txt } from '@/components/ui/Txt';
import { FlowButton } from '@/features/onboarding/FlowButton';
import { INK, LIME } from '@/features/onboarding/look';
import { requestPushPermission } from '@/lib/onesignal';

const NOTES = [
  {
    face: require('../../assets/images/onboarding/face-1.jpg'),
    text: 'Ali said hey to Shipnote',
    when: 'now',
    rotate: '-2deg',
  },
  {
    face: require('../../assets/images/onboarding/face-2.png'),
    text: "It's a match! You and Nina can chat now.",
    when: '2m ago',
    rotate: '1.5deg',
  },
  {
    face: require('../../assets/images/onboarding/face-3.png'),
    text: 'Priya replied: "Sent you feedback on onboarding"',
    when: '1h ago',
    rotate: '-1deg',
  },
];

export default function SetupNotifications() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { appId, then } = useLocalSearchParams<{ appId?: string; then?: string }>();
  const [asking, setAsking] = useState(false);

  const next = () => {
    if (then === 'paywall') {
      router.replace('/paywall?from=onboarding');
      return;
    }
    router.replace({ pathname: '/setup/bio', params: { appId: appId ?? '' } });
  };

  const enable = async () => {
    if (asking) return;
    setAsking(true);
    try {
      await requestPushPermission();
    } catch {
      // Declining is fine. They can turn them on later in Settings.
    } finally {
      setAsking(false);
      next();
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#0000EB',
        paddingTop: insets.top,
        paddingBottom: Math.max(insets.bottom, 16),
      }}
    >
      <StatusBar style="light" />
      <View style={{ paddingHorizontal: 22, paddingTop: 14, gap: 9 }}>
        <Txt font="mono" size={29} weight={600} lh={1.12} tracking={-1.45} color="#FFFFFF">
          Turn on notifications
        </Txt>
        <Txt size={16} lh={1.45} color="rgba(255,255,255,0.84)">
          You'll know when someone says hey, a match opens, or a builder actually replies.
        </Txt>
      </View>

      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 20, gap: 12 }}>
        {NOTES.map((note) => (
          <View key={note.when} style={{ transform: [{ rotate: note.rotate }] }}>
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 5,
                bottom: -5,
                borderRadius: 22,
                backgroundColor: INK,
              }}
            />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 13,
                paddingHorizontal: 14,
                borderRadius: 22,
                backgroundColor: '#FFFFFF',
                borderWidth: 2,
                borderColor: INK,
              }}
            >
              <Image
                source={note.face}
                contentFit="cover"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  borderWidth: 1.5,
                  borderColor: INK,
                  backgroundColor: '#F2F3EF',
                }}
              />
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <Txt font="mono" size={11} weight={700} color={INK} tracking={0.66}>
                    HEY100
                  </Txt>
                  <Txt size={11.5} color="#5B625C">
                    {note.when}
                  </Txt>
                </View>
                <Txt size={14.5} weight={600} color={INK} lh={1.35}>
                  {note.text}
                </Txt>
              </View>
            </View>
          </View>
        ))}
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 10 }}>
        <FlowButton
          label={asking ? 'Asking…' : 'Turn on notifications'}
          bg={LIME}
          fg={INK}
          shadow="#000000"
          dim={asking}
          onPress={() => void enable()}
        />
        <Pressable onPress={next} style={{ height: 30, alignItems: 'center', justifyContent: 'center' }}>
          <Txt size={14.5} weight={700} color="#FFFFFF" style={{ textDecorationLine: 'underline' }}>
            Not now
          </Txt>
        </Pressable>
      </View>
    </View>
  );
}
