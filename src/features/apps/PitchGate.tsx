import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Btn } from '@/components/ui/Btn';
import { Txt } from '@/components/ui/Txt';
import { useTheme } from '@/theme/ThemeProvider';
import { layout } from '@/theme/tokens';

type PitchFlowProps = {
  visible: boolean;
  builder: string;
  onClose: () => void;
  onPublish: (uri: string, seconds: number) => void | Promise<void>;
  skipIntro?: boolean;
};

/**
 * Always shows the how-to-pitch intro. The camera module is only loaded when
 * they tap Start, so a missing native camera never blanks the first screen.
 */
export function PitchGate(props: PitchFlowProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState(false);
  const [Flow, setFlow] = useState<React.ComponentType<PitchFlowProps> | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!props.visible) {
      setReady(false);
      setMissing(false);
    }
  }, [props.visible]);

  const who = props.builder.replace(/^@/, '').split(/[\s·]/)[0] || 'you';

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
  if (ready && Flow) return <Flow {...props} skipIntro />;

  if (!props.visible) return null;

  return (
    <Modal visible animationType="slide" onRequestClose={props.onClose}>
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: layout.gutter,
            paddingBottom: 10,
          }}
        >
          <Pressable onPress={props.onClose} hitSlop={12} accessibilityLabel="Close">
            <Ionicons name="close" size={26} color={c.ink} />
          </Pressable>
          <Txt font="mono" size={17} weight={500} style={{ flex: 1, textAlign: 'center' }}>
            Quick pitch
          </Txt>
          <View style={{ width: 26 }} />
        </View>

        <View
          style={{
            flex: 1,
            paddingHorizontal: layout.gutter,
            paddingBottom: insets.bottom + 20,
            gap: 18,
          }}
        >
          {missing ? (
            <>
              <Txt size={22} weight={700}>
                Camera isn’t in this build
              </Txt>
              <Txt size={15} lh={1.45} muted>
                Rebuild the iOS app after adding expo-camera, then record a quick pitch. The
                simulator can still preview this intro.
              </Txt>
              <View style={{ flex: 1 }} />
              <Btn label="Close" onPress={props.onClose} />
            </>
          ) : (
            <>
              <Txt size={22} weight={700} lh={1.25}>
                A 30-second hello from {who} to the community.
              </Txt>
              <Txt size={15.5} lh={1.5} muted>
                Say what the app is, who it is for, and the one thing you want them to try. Look at
                the camera. Skip the deck — this is a video handshake.
              </Txt>
              <Txt size={15.5} lh={1.5} muted>
                Front camera, optional mirror, 30 seconds on the clock. You can retake as many times
                as you want before you publish.
              </Txt>
              <View style={{ flex: 1 }} />
              <Btn label="Start recording" variant="accent" size="lg" full onPress={start} />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
