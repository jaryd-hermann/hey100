import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Btn } from '@/components/ui/Btn';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { Label, Txt } from '@/components/ui/Txt';
import { shortName } from '@/data/mock';
import { uploadAsset } from '@/features/apps/uploadShots';
import { useAuth } from '@/features/auth/AuthProvider';
import { captureEvent } from '@/lib/analytics';
import { useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, layout, radii } from '@/theme/tokens';

const KEEP_OPTIONS = ['Yes', 'Maybe', 'No'] as const;
const PRICE_OPTIONS = ["Wouldn't pay", '$1–3', '$3–5', '$5–10', 'One-time'];

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

  const [impression, setImpression] = useState(0);
  const [sentence, setSentence] = useState('');
  const [keep, setKeep] = useState<(typeof KEEP_OPTIONS)[number] | null>(null);
  const [confusion, setConfusion] = useState('');
  const [bestMoment, setBestMoment] = useState('');
  const [bug, setBug] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [price, setPrice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const ready = impression > 0 && !!sentence.trim() && !!keep;

  const attach = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!result.canceled) setScreenshot(result.assets[0].uri);
  };

  const submit = async () => {
    if (!ready || !match || sending) {
      if (!ready) toast('Add a first impression and whether you’d keep using it');
      return;
    }

    setSending(true);

    try {
      // The screenshot goes up first, so the review is never saved pointing at
      // an image that is not there.
      const bugShot =
        screenshot && userId
          ? ((await uploadAsset(userId, screenshot, 'image', 'bug')) ?? undefined)
          : undefined;

      await store.submitFeedback(match.id, {
        stars: impression,
        summary: sentence.trim(),
        keep: keep ?? undefined,
        confusion: confusion.trim() || undefined,
        bestMoment: bestMoment.trim() || undefined,
        bug: bug.trim() || undefined,
        bugShot,
        price: price ?? undefined,
      });

      captureEvent('feedback_sent', {
        impression,
        keep,
        price,
        has_bug: !!bug.trim(),
        has_screenshot: !!screenshot,
      });
      toast('Feedback sent');
      router.back();
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
          Feedback for {shortName(listing.name)}
        </Txt>
        <Txt size={14} lh={1.45} muted>
          They asked for feedback on {listing.asked || 'anything'}.
        </Txt>

        <Card padding={16} radius={radii.cardLg} style={{ gap: 12 }}>
          <Label>First impression</Label>
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
          <Label>Would you keep using it?</Label>
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
        </Card>

        <Card padding={16} radius={radii.cardLg} style={{ gap: 12 }}>
          <Label>Biggest confusion</Label>
          <Input
            value={confusion}
            onChange={setConfusion}
            placeholder="Where did you stall?"
            multiline
          />
        </Card>

        <Card padding={16} radius={radii.cardLg} style={{ gap: 12 }}>
          <Label>Best moment</Label>
          <Input
            value={bestMoment}
            onChange={setBestMoment}
            placeholder="When did it click?"
            multiline
          />
        </Card>

        <Card padding={16} radius={radii.cardLg} style={{ gap: 12 }}>
          <Label>Found a bug?</Label>
          <Input value={bug} onChange={setBug} placeholder="What broke, and where" multiline />
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
              borderColor: screenshot ? c.accent : c.muted,
              alignSelf: 'flex-start',
            }}
          >
            <Ionicons
              name={screenshot ? 'checkmark' : 'add'}
              size={16}
              color={screenshot ? c.accentText : c.muted}
            />
            <Txt size={13.5} weight={600} color={screenshot ? c.accentText : c.muted}>
              {screenshot ? 'Screenshot attached' : 'Add screenshot'}
            </Txt>
          </Pressable>
        </Card>

        <Card padding={16} radius={radii.cardLg} style={{ gap: 12 }}>
          <Label>Would you pay? What feels right?</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {PRICE_OPTIONS.map((option) => {
              const active = price === option;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  onPress={() => setPrice(option)}
                  style={{
                    height: 40,
                    paddingHorizontal: 14,
                    borderRadius: radii.pill,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: active ? c.ink : 'transparent',
                    borderWidth: 1.5,
                    borderColor: active ? c.ink : c.line,
                  }}
                >
                  <Txt size={13.5} weight={600} color={active ? c.bg : c.ink}>
                    {option}
                  </Txt>
                </Pressable>
              );
            })}
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
            label={sending ? 'Sending…' : 'Send feedback'}
            variant="accent"
            size="lg"
            full
            dim={!ready || sending}
            onPress={() => void submit()}
          />
        </View>
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
