import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/AppIcon';
import { Txt } from '@/components/ui/Txt';
import type { PitchFlowProps as CameraProps } from '@/features/apps/PitchFlow';
import { FlowButton } from '@/features/onboarding/FlowButton';
import { INK, LIME } from '@/features/onboarding/look';

type PitchFlowProps = CameraProps & {
  /** The signed-in person's photo. Falls back to their identicon. */
  photo?: string;
  appName?: string;
};

/**
 * Always shows the how-to-pitch intro. The camera module is only loaded when
 * they tap Start, so a missing native camera never blanks the first screen.
 */
export function PitchGate(props: PitchFlowProps) {
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState(false);
  const [Flow, setFlow] = useState<React.ComponentType<CameraProps> | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!props.visible) {
      setReady(false);
      setMissing(false);
    }
  }, [props.visible]);

  const who = props.builder.replace(/^@/, '').split(/[\s·]/)[0] || 'you';
  const appName = props.appName?.trim() || 'this app';

  const start = () => {
    setReady(true);
    void import('./PitchFlow')
      .then((mod) => {
        if (mod.PitchFlow) setFlow(() => mod.PitchFlow);
        else setMissing(true);
      })
      .catch(() => setMissing(true));
  };

  // Keep the camera modal mounted while it hides so iOS can dismiss it.
  // Returning null here left the sheet on screen after Publish.
  if (ready && Flow) {
    const { photo: _photo, appName: _appName, ...camera } = props;
    return <Flow {...camera} skipIntro />;
  }

  if (!props.visible) return null;

  return (
    <Modal visible animationType="slide" onRequestClose={props.onClose}>
      <View style={{ flex: 1, backgroundColor: '#2E5CFF', paddingTop: insets.top }}>
        <StatusBar style="light" />
        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          <Pressable
            onPress={props.onClose}
            hitSlop={12}
            accessibilityLabel="Close"
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              borderWidth: 2,
              borderColor: INK,
              backgroundColor: '#FFFFFF',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="close" size={20} color={INK} />
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 22, paddingTop: 16, gap: 9 }}>
          <Txt font="mono" size={29} weight={600} lh={1.12} tracking={-1.45} color="#FFFFFF">
            {missing ? 'Camera isn’t in this build' : `A 30-second hello from ${who}.`}
          </Txt>
          <Txt size={16} lh={1.45} color="rgba(255,255,255,0.84)">
            {missing
              ? 'Rebuild the iOS app after adding expo-camera, then record a quick pitch.'
              : 'Say what the app is, who it is for, and the one thing you want them to try. Look at the camera.'}
          </Txt>
        </View>

        {missing ? <View style={{ flex: 1 }} /> : (
          <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 16 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                paddingVertical: 12,
                paddingLeft: 12,
                paddingRight: 18,
                borderRadius: 28,
                backgroundColor: '#161616',
              }}
            >
              <Avatar name={who} uri={props.photo} size={64} />
              <View style={{ flex: 1, gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="play" size={13} color={LIME} />
                  <Txt font="mono" size={13} weight={600} tracking={1.4} color={LIME}>
                    QUICK PITCH
                  </Txt>
                </View>
                <View style={{ height: 8, borderRadius: 4, backgroundColor: '#3A3A3A', overflow: 'hidden' }}>
                  <View style={{ width: '72%', height: 8, borderRadius: 4, backgroundColor: LIME }} />
                </View>
                <Txt font="mono" size={13} weight={500} color="#8E968F">
                  0:30
                </Txt>
              </View>
            </View>
            <Txt size={16} lh={1.45} color="#FFFFFF" style={{ marginTop: 16 }}>
              {`Hey, I'm ${who}, I made ${appName} because...`}
            </Txt>
          </View>
        )}

        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 24) }}>
          <FlowButton
            label={missing ? 'Close' : 'Start recording'}
            bg={LIME}
            fg={INK}
            shadow="#000000"
            onPress={missing ? props.onClose : start}
          />
        </View>
      </View>
    </Modal>
  );
}
