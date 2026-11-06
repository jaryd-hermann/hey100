import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KarmaMark } from '@/components/brand/Marks';
import { Btn } from '@/components/ui/Btn';
import { Card } from '@/components/ui/Card';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { Label, Txt } from '@/components/ui/Txt';
import { FEEDBACK_FIELD_POINTS, KARMA_PEACH_TEXT, feedbackKarmaEarned } from '@/features/profile/karma';
import { shortName } from '@/data/mock';
import { PitchFlow } from '@/features/apps/PitchFlow';
import { uploadAsset } from '@/features/apps/uploadShots';
import { useAuth } from '@/features/auth/AuthProvider';
import { captureEvent } from '@/lib/analytics';
import { publicUrl } from '@/lib/supabase';
import { useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, layout, radii } from '@/theme/tokens';

const KEEP_OPTIONS = ['Yes', 'Maybe', 'No'] as const;

export default function FeedbackForm() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const toast = useToast();
  const store = useStore();
  const { userId } = useAuth();

  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const match = store.matches.find((item) => item.id === matchId);
  const listing = match ? store.listing(match.appId) : undefined;
  const given = match?.givenFeedback;
  const editing = !!given;
  const shotPaths = useRef<Record<string, string>>({});
  const existingVideo = useRef<string | null>(null);

  const [impression, setImpression] = useState(0);
  const [sentence, setSentence] = useState('');
  const [keep, setKeep] = useState<(typeof KEEP_OPTIONS)[number] | null>(null);
  const [keepWhy, setKeepWhy] = useState('');
  const [confusion, setConfusion] = useState('');
  const [bestMoment, setBestMoment] = useState('');
  const [bug, setBug] = useState('');
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [price, setPrice] = useState('');
  const [sending, setSending] = useState(false);
  const [earned, setEarned] = useState(0);
  const firstName = listing?.builder.split(' ')[0] || 'them';

  useEffect(() => {
    if (!given) return;
    setImpression(given.stars);
    setSentence(given.summary);
    setKeep(given.keep === 'Yes' || given.keep === 'Maybe' || given.keep === 'No' ? given.keep : null);
    setKeepWhy(given.keepWhy ?? '');
    setConfusion(given.confusion ?? '');
    setBestMoment(given.bestMoment ?? '');
    setBug(given.bug ?? '');
    setPrice((given.price ?? '').replace(/[^0-9.]/g, ''));
    const paths = given.bugShots?.length ? given.bugShots : given.bugShot ? [given.bugShot] : [];
    shotPaths.current = {};
    setScreenshots(
      paths.map((path) => {
        const uri = publicUrl('listing-media', path);
        shotPaths.current[uri] = path;
        return uri;
      }),
    );
    if (given.videoPath) {
      existingVideo.current = given.videoPath;
      setVideoUri(publicUrl('listing-media', given.videoPath));
    }
  }, [given]);

  const ready = impression > 0 && !!sentence.trim() && !!keep;
  const karmaPoints = useMemo(
    () =>
      feedbackKarmaEarned({
        impression,
        sentence,
        keep,
        keepWhy,
        confusion,
        bestMoment,
        bug,
        screenshots: screenshots.length,
        video: !!videoUri,
        price,
      }),
    [
      bestMoment,
      bug,
      confusion,
      impression,
      keep,
      keepWhy,
      price,
      screenshots.length,
      sentence,
      videoUri,
    ],
  );

  const attach = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 6,
    });
    if (result.canceled) return;
    setScreenshots((prev) => [...prev, ...result.assets.map((asset) => asset.uri)]);
  };

  const submit = async () => {
    if (!ready || !match || sending) {
      if (!ready) toast('Add a first impression and whether you’d keep using it');
      return;
    }

    setSending(true);

    try {
      // The screenshot goes up first, so the review is never saved pointing at
      // an image that is not there. Existing edits reuse the stored paths.
      const bugShots =
        userId && screenshots.length
          ? (
              await Promise.all(
                screenshots.map((uri, index) =>
                  shotPaths.current[uri]
                    ? shotPaths.current[uri]
                    : uploadAsset(userId, uri, 'image', `bug-${index}`),
                ),
              )
            ).filter((path): path is string => !!path)
          : [];
      const videoPath =
        videoUri && userId
          ? existingVideo.current && videoUri.startsWith('http')
            ? existingVideo.current
            : ((await uploadAsset(userId, videoUri, 'video', 'feedback')) ?? undefined)
          : undefined;

      await store.submitFeedback(match.id, {
        stars: impression,
        summary: sentence.trim(),
        keep: keep ?? undefined,
        keepWhy: keepWhy.trim() || undefined,
        confusion: confusion.trim() || undefined,
        bestMoment: bestMoment.trim() || undefined,
        bug: bug.trim() || undefined,
        bugShot: bugShots[0],
        bugShots,
        videoPath,
        price: price.trim() ? `$${price.trim()}/mo` : undefined,
      });

      captureEvent(editing ? 'feedback_updated' : 'feedback_sent', {
        impression,
        keep,
        price: price.trim(),
        has_bug: !!bug.trim(),
        has_screenshot: bugShots.length > 0,
        has_video: !!videoPath,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (editing) {
        toast('Feedback updated');
        router.back();
        return;
      }
      setEarned(karmaPoints);
    } catch {
      setSending(false);
      toast("That didn't send. Try again.");
    }
  };

  if (!match || !listing) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.bg,
          paddingTop: insets.top + 40,
          paddingHorizontal: layout.gutter,
        }}
      >
        <Txt muted>That trade is no longer open.</Txt>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: layout.gutter,
          paddingBottom: 12,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Txt size={15} weight={600} muted>
            Cancel
          </Txt>
        </Pressable>
        <Txt font="mono" size={12} muted>
          ~3 min
        </Txt>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingBottom: 150,
          gap: 16,
        }}
      >
        <Txt font="mono" size={25} weight={500} lh={1.25}>
          {editing ? 'Edit your feedback' : `Feedback for ${shortName(listing.name)}`}
        </Txt>
        <Txt size={14} lh={1.45} muted>
          They asked for feedback on {listing.asked || 'anything'}.
        </Txt>

        <Card padding={16} radius={radii.cardLg} style={{ gap: 12 }}>
          <FieldLabel label="First impression" earned={impression > 0 && !!sentence.trim()} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[1, 2, 3, 4, 5].map((value) => {
              const active = impression === value;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  onPress={() => setImpression(value)}
                  style={{
                    flex: 1,
                    height: 52,
                    borderRadius: radii.card,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: active ? c.ink : c.bg,
                    borderWidth: 1.5,
                    borderColor: active ? c.ink : c.line,
                  }}
                >
                  <Txt font="mono" size={17} weight={600} color={active ? c.bg : c.ink}>
                    {value}
                  </Txt>
                </Pressable>
              );
            })}
          </View>
          <Input value={sentence} onChange={setSentence} placeholder="And one sentence on why" />
        </Card>

        <Card padding={16} radius={radii.cardLg} style={{ gap: 12 }}>
          <FieldLabel label="Would you keep using it?" earned={!!keep} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {KEEP_OPTIONS.map((option) => {
              const active = keep === option;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  onPress={() => setKeep(option)}
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: radii.pill,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: active ? c.ink : 'transparent',
                    borderWidth: 1.5,
                    borderColor: active ? c.ink : c.line,
                  }}
                >
                  <Txt size={14.5} weight={600} color={active ? c.bg : c.ink}>
                    {option}
                  </Txt>
                </Pressable>
              );
            })}
          </View>
          <Input
            value={keepWhy}
            onChange={setKeepWhy}
            placeholder={`Help ${firstName} with why`}
            multiline
          />
        </Card>

        <Card padding={16} radius={radii.cardLg} style={{ gap: 12 }}>
          <FieldLabel label="Biggest confusion" earned={!!confusion.trim()} />
          <Input
            value={confusion}
            onChange={setConfusion}
            placeholder="Where did you stall?"
            multiline
          />
        </Card>

        <Card padding={16} radius={radii.cardLg} style={{ gap: 12 }}>
          <FieldLabel label="Best moment" earned={!!bestMoment.trim()} />
          <Input
            value={bestMoment}
            onChange={setBestMoment}
            placeholder="When did it click?"
            multiline
          />
        </Card>

        <Card padding={16} radius={radii.cardLg} style={{ gap: 12 }}>
          <FieldLabel
            label="Found a bug?"
            earned={!!bug.trim() || screenshots.length > 0 || !!videoUri}
          />
          <Input value={bug} onChange={setBug} placeholder="What broke, and where" multiline />
          {screenshots.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {screenshots.map((uri) => (
                <Pressable key={uri} onPress={() => setScreenshots((prev) => prev.filter((item) => item !== uri))}>
                  <Image source={{ uri }} style={{ width: 72, height: 96, borderRadius: 10 }} />
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
          <Pressable
            onPress={attach}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              height: 44,
              paddingHorizontal: 14,
              borderRadius: radii.pill,
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: screenshots.length ? c.accent : c.muted,
              alignSelf: 'flex-start',
            }}
          >
            <Ionicons
              name={screenshots.length ? 'checkmark' : 'add'}
              size={16}
              color={screenshots.length ? c.accentText : c.muted}
            />
            <Txt size={13.5} weight={600} color={screenshots.length ? c.accentText : c.muted}>
              {screenshots.length ? 'Add another screenshot' : 'Add screenshots'}
            </Txt>
          </Pressable>
          <Pressable
            onPress={() => setVideoOpen(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              height: 44,
              paddingHorizontal: 14,
              borderRadius: radii.pill,
              borderWidth: 1.5,
              borderColor: videoUri ? c.accent : c.line,
              alignSelf: 'flex-start',
            }}
          >
            <Ionicons name={videoUri ? 'checkmark' : 'videocam-outline'} size={16} color={videoUri ? c.accentText : c.ink} />
            <Txt size={13.5} weight={600} color={videoUri ? c.accentText : c.ink}>
              {videoUri ? 'Video note attached' : 'Video note reply'}
            </Txt>
          </Pressable>
        </Card>

        <Card padding={16} radius={radii.cardLg} style={{ gap: 12 }}>
          <FieldLabel label="What would you pay?" earned={!!price.trim()} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Txt size={18} weight={600}>
              $
            </Txt>
            <TextInput
              value={price}
              onChangeText={(value) => setPrice(value.replace(/[^0-9.]/g, ''))}
              placeholder="0"
              placeholderTextColor={c.muted}
              keyboardType="decimal-pad"
              style={{
                flex: 1,
                height: 46,
                borderRadius: radii.input,
                backgroundColor: c.bg,
                borderWidth: 1,
                borderColor: c.line,
                paddingHorizontal: 13,
                color: c.ink,
                fontFamily: fonts.body,
                fontSize: 16,
              }}
            />
            <Txt size={14} muted>
              / month
            </Txt>
          </View>
        </Card>
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <LinearGradient colors={[`${c.bg}00`, c.bg]} style={{ height: 28 }} />
        <View
          style={{
            backgroundColor: c.bg,
            paddingHorizontal: layout.gutter,
            paddingBottom: insets.bottom + 14,
          }}
        >
          <Btn
            label={sending ? (editing ? 'Saving…' : 'Sending…') : editing ? 'Save changes' : 'Send feedback'}
            variant="accent"
            size="lg"
            full
            dim={!ready || sending}
            onPress={() => void submit()}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 10 }}>
            <KarmaMark size={22} />
            <Txt size={15} weight={600} color={KARMA_PEACH_TEXT}>
              Earn +{karmaPoints} Karma
            </Txt>
          </View>
        </View>
      </View>
      <Sheet visible={earned > 0} onClose={() => router.back()}>
        <View style={{ gap: 14, alignItems: 'center', paddingTop: 8 }}>
          <KarmaMark size={44} />
          <Txt font="mono" size={36} weight={500} color={c.accentText}>
            +{earned} karma
          </Txt>
          <Txt size={20} weight={700} center>
            You just shared your insight with {firstName}
          </Txt>
          <Txt size={15} muted center lh={1.45}>
            Thanks for helping and making the community stronger!
          </Txt>
          <Btn label="Done" variant="accent" size="lg" full onPress={() => router.back()} />
        </View>
      </Sheet>
      <PitchFlow
        visible={videoOpen}
        builder={listing.builder}
        skipIntro
        hideTimer
        maxSeconds={300}
        publishLabel="Attach video"
        onClose={() => setVideoOpen(false)}
        onPublish={(uri) => {
          existingVideo.current = null;
          setVideoUri(uri);
          setVideoOpen(false);
        }}
      />
    </View>
  );
}

function FieldLabel({ label, earned }: { label: string; earned: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Label style={{ flex: 1 }}>{label}</Label>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <KarmaMark size={18} />
        <Txt size={13} weight={600} color={earned ? KARMA_PEACH_TEXT : c.muted}>
          +{FEEDBACK_FIELD_POINTS}
        </Txt>
      </View>
    </View>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  multiline,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  const { c } = useTheme();

  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={c.muted}
      multiline={multiline}
      style={{
        minHeight: multiline ? 76 : 46,
        borderRadius: radii.input,
        backgroundColor: c.bg,
        borderWidth: 1,
        borderColor: c.line,
        paddingHorizontal: 13,
        paddingTop: multiline ? 12 : 0,
        paddingBottom: multiline ? 12 : 0,
        color: c.ink,
        fontFamily: fonts.body,
        fontSize: 15,
        textAlignVertical: multiline ? 'top' : 'center',
      }}
    />
  );
}
