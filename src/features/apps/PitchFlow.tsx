import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Btn } from '@/components/ui/Btn';
import { rewindOnEnd } from '@/components/ui/InlineVideo';
import { Txt } from '@/components/ui/Txt';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radii } from '@/theme/tokens';

const LIMIT = 30;

type Step = 'intro' | 'record' | 'preview' | 'saving' | 'done';

export type PitchFlowProps = {
  visible: boolean;
  builder: string;
  onClose: () => void;
  onPublish: (uri: string, seconds: number) => void | Promise<void>;
  skipIntro?: boolean;
};

export function PitchFlow({ visible, builder, onClose, onPublish, skipIntro }: PitchFlowProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const camera = useRef<CameraView>(null);
  const [step, setStep] = useState<Step>(skipIntro ? 'record' : 'intro');
  const [mirror, setMirror] = useState(true);
  const [recording, setRecording] = useState(false);
  const [left, setLeft] = useState(LIMIT);
  const leftRef = useRef(LIMIT);
  const [uri, setUri] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [camPerm, requestCam] = useCameraPermissions();
  const [micPerm, requestMic] = useMicrophonePermissions();
  const [lensReady, setLensReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) {
      setStep(skipIntro ? 'record' : 'intro');
      setRecording(false);
      setLeft(LIMIT);
      setUri(null);
      setLensReady(false);
      setSaving(false);
    }
  }, [skipIntro, visible]);

  useEffect(() => {
    if (!visible || step !== 'record') {
      setLensReady(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      const cam = camPerm?.granted ? camPerm : await requestCam();
      const mic = micPerm?.granted ? micPerm : await requestMic();
      if (!cancelled && cam.granted && mic.granted) setLensReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [camPerm, micPerm, requestCam, requestMic, step, visible]);

  useEffect(() => {
    if (!recording) return;
    const tick = setInterval(() => {
      setLeft((prev) => {
        const next = prev - 1;
        leftRef.current = next;
        if (next <= 0) {
          void stop();
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [recording]);

  const start = async () => {
    if (!camPerm?.granted) {
      const next = await requestCam();
      if (!next.granted) return;
    }
    if (!micPerm?.granted) {
      const next = await requestMic();
      if (!next.granted) return;
    }
    if (!lensReady) return;
    setLeft(LIMIT);
    leftRef.current = LIMIT;
    setRecording(true);
    setStep('record');
    try {
      const clip = await camera.current?.recordAsync({ maxDuration: LIMIT });
      if (clip?.uri) {
        setUri(clip.uri);
        setSeconds(Math.max(1, LIMIT - leftRef.current));
        setStep('preview');
      }
    } catch {
      setRecording(false);
    }
  };

  const stop = async () => {
    if (!recording) return;
    setRecording(false);
    try {
      camera.current?.stopRecording();
    } catch {
      // recordAsync resolves with the file once stop is called.
    }
  };

  const who = builder.replace(/^@/, '').split(/[\s·]/)[0] || 'you';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: layout.gutter,
            paddingBottom: 10,
          }}
        >
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
            <Ionicons name="close" size={26} color={c.ink} />
          </Pressable>
          <Txt font="mono" size={17} weight={500} style={{ flex: 1, textAlign: 'center' }}>
            Quick pitch
          </Txt>
          <View style={{ width: 26 }} />
        </View>

        {step === 'intro' ? (
          <View style={{ flex: 1, paddingHorizontal: layout.gutter, paddingBottom: insets.bottom + 20, gap: 18 }}>
            <Txt size={22} weight={700} lh={1.25}>
              A 30-second hello from {who} to the community.
            </Txt>
            <Txt size={15.5} lh={1.5} muted>
              Say what the app is, who it is for, and the one thing you want them to try. Look at the
              camera. Skip the deck — this is a video handshake.
            </Txt>
            <Txt size={15.5} lh={1.5} muted>
              Front camera, optional mirror, 30 seconds on the clock. You can retake as many times as
              you want before you publish.
            </Txt>
            <View style={{ flex: 1 }} />
            <Btn
              label="Start recording"
              variant="accent"
              size="lg"
              full
              onPress={() => {
                setStep('record');
                void requestCam();
                void requestMic();
              }}
            />
          </View>
        ) : null}

        {step === 'record' ? (
          <View style={{ flex: 1 }}>
            <View style={{ flex: 1, marginHorizontal: layout.gutter, borderRadius: radii.cardLg, overflow: 'hidden', backgroundColor: '#111111' }}>
              {lensReady ? (
                <CameraView
                  key="live"
                  ref={camera}
                  facing="front"
                  mode="video"
                  mirror={mirror}
                  style={{ flex: 1 }}
                />
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                  <Txt size={15} color="#FFFFFF" center>
                    {camPerm?.granted === false || micPerm?.granted === false
                      ? 'Allow camera and microphone to record.'
                      : 'Opening camera…'}
                  </Txt>
                </View>
              )}
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: 16,
                  alignSelf: 'center',
                  left: 0,
                  right: 0,
                  alignItems: 'center',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {recording ? <RecDot /> : null}
                  <Txt font="mono" size={42} weight={700} color="#FFFFFF">
                    {recording ? left : LIMIT}
                  </Txt>
                </View>
              </View>
            </View>

            <View
              style={{
                paddingHorizontal: layout.gutter,
                paddingTop: 16,
                paddingBottom: insets.bottom + 16,
                gap: 12,
              }}
            >
              <Pressable
                onPress={() => setMirror((prev) => !prev)}
                style={{ alignSelf: 'center', paddingVertical: 6 }}
              >
                <Txt size={14} weight={600}>
                  {mirror ? 'Mirror on' : 'Mirror off'}
                </Txt>
              </Pressable>
              {recording ? (
                <Btn label="Done" variant="accent" size="lg" full onPress={() => void stop()} />
              ) : (
                <Btn
                  label={camPerm?.granted === false ? 'Allow camera' : 'Record'}
                  variant="accent"
                  size="lg"
                  full
                  onPress={() => void start()}
                />
              )}
            </View>
          </View>
        ) : null}

        {step === 'saving' || step === 'done' ? (
          <View
            style={{
              flex: 1,
              paddingHorizontal: layout.gutter,
              paddingBottom: insets.bottom + 20,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 14,
            }}
          >
            <Ionicons
              name={step === 'done' ? 'checkmark-circle' : 'cloud-upload-outline'}
              size={48}
              color={step === 'done' ? c.accentText : c.ink}
            />
            <Txt font="mono" size={20} weight={500} center>
              {step === 'done' ? 'Published' : 'Uploading your pitch'}
            </Txt>
            <Txt size={15} muted center>
              {step === 'done'
                ? 'Taking you to the listing so you can see it at the top.'
                : 'Saving the video to your listing. Keep this screen open.'}
            </Txt>
            {step === 'done' ? (
              <DoneRedirect onDone={onClose} />
            ) : null}
          </View>
        ) : null}

        {step === 'preview' && uri ? (
          <Preview
            uri={uri}
            seconds={seconds}
            bottom={insets.bottom}
            saving={saving}
            onRetake={() => {
              setUri(null);
              setLeft(LIMIT);
              leftRef.current = LIMIT;
              setStep('record');
            }}
            onPublish={async () => {
              setSaving(true);
              setStep('saving');
              try {
                await Promise.resolve(onPublish(uri, seconds || 1));
                setStep('done');
              } catch {
                setSaving(false);
                setStep('preview');
              }
            }}
          />
        ) : null}
      </View>
    </Modal>
  );
}

function RecDot() {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.25, duration: 480, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 480, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={{
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#FF3B30',
        opacity: pulse,
      }}
    />
  );
}

function DoneRedirect({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 900);
    return () => clearTimeout(timer);
  }, [onDone]);
  return null;
}

function Preview({
  uri,
  seconds,
  bottom,
  saving,
  onRetake,
  onPublish,
}: {
  uri: string;
  seconds: number;
  bottom: number;
  saving: boolean;
  onRetake: () => void;
  onPublish: () => void;
}) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
    instance.play();
  });

  useEffect(() => rewindOnEnd(player), [player]);

  return (
    <View style={{ flex: 1, paddingHorizontal: layout.gutter, paddingBottom: bottom + 16 }}>
      <VideoView
        player={player}
        style={{
          width: '100%',
          maxHeight: '72%',
          aspectRatio: 3 / 4,
          alignSelf: 'center',
          borderRadius: radii.cardLg,
          overflow: 'hidden',
          backgroundColor: '#111111',
        }}
        contentFit="cover"
        nativeControls
      />
      <View style={{ marginTop: 14, gap: 12 }}>
        <Txt size={14} muted>
          {seconds}s · look good? Publish it, or take it again.
        </Txt>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Btn label="Retake" variant="surface" size="lg" style={{ flex: 1 }} disabled={saving} onPress={onRetake} />
          <Btn
            label={saving ? 'Publishing…' : 'Publish'}
            variant="accent"
            size="lg"
            style={{ flex: 1.4 }}
            disabled={saving}
            onPress={onPublish}
          />
        </View>
      </View>
    </View>
  );
}
