import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wordmark } from '@/components/brand/Logo';
import { Txt } from '@/components/ui/Txt';
import { ME_KEY } from '@/features/account/useMe';
import { SignInSheet } from '@/features/auth/SignInSheet';
import { getSupabase } from '@/lib/supabase';
import { htg, palettes } from '@/theme/tokens';

const c = palettes.dark;
const MESSAGE = require('../assets/images/glyphs/message.png');
const EYE = require('../assets/images/glyphs/eye.png');
const LOCK = require('../assets/images/glyphs/lock-solid.png');
const DAN = require('../assets/images/splash-dan.jpg');

const sticker: ViewStyle = {
  position: 'absolute',
  borderRadius: 16,
  borderWidth: 2,
  shadowOpacity: 1,
  shadowRadius: 0,
  shadowOffset: { width: 0, height: 5 },
};

/** [O1] Splash. Signed-out entry; Continue opens the sign-in drawer [O1b]. */
export default function Welcome() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [signingIn, setSigningIn] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View pointerEvents="none" style={{ height: 330 }}>
        <View
          style={[
            sticker,
            {
              left: 24,
              top: 46,
              zIndex: 3,
              paddingVertical: 12,
              paddingHorizontal: 14,
              backgroundColor: htg.yours,
              borderColor: htg.sticker,
              shadowColor: '#000',
              transform: [{ rotate: '-5deg' }],
              gap: 5,
            },
          ]}
        >
          <Txt font="mono" size={10.5} weight={600} color="#3A3A14" tracking={1}>
            $5–10K · TODAY
          </Txt>
          <Txt font="mono" size={14} weight={500} color={htg.yoursInk} lh={1.3} tracking={-0.4} style={{ width: 190 }}>
            When did you hire your first person?
          </Txt>
        </View>

        <View
          style={[
            sticker,
            {
              right: 22,
              top: 146,
              zIndex: 3,
              paddingVertical: 12,
              paddingHorizontal: 14,
              backgroundColor: htg.otherBubble,
              borderColor: htg.sticker,
              shadowColor: '#000',
              transform: [{ rotate: '4deg' }],
              gap: 5,
            },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Image source={DAN} style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: htg.sticker }} />
            <Txt size={13} weight={700}>
              Dan · $14.2k
            </Txt>
          </View>
          <Txt size={13} lh={1.35} style={{ width: 170 }}>
            "At $12k. Part-time support, 20h a week."
          </Txt>
          <View style={{ flexDirection: 'row', gap: 5 }}>
            <Count label="🔥 44" />
            <Count label="💬 12" />
          </View>
        </View>

        <View
          style={[
            sticker,
            {
              left: 30,
              top: 262,
              zIndex: 4,
              paddingVertical: 10,
              paddingHorizontal: 12,
              backgroundColor: htg.above,
              borderColor: htg.aboveStroke,
              shadowColor: 'rgba(255,255,255,0.18)',
              transform: [{ rotate: '-3deg' }],
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            },
          ]}
        >
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              borderWidth: 1.5,
              borderColor: 'rgba(255,255,255,0.5)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Image source={LOCK} style={{ width: 16, height: 16 }} tintColor="#FFFFFF" />
          </View>
          <View style={{ gap: 1 }}>
            <Txt font="mono" size={13} weight={700} color="#FFFFFF">
              $25–50k · Mobile
            </Txt>
            <Txt size={11} color="#A9B0A9">
              41 answers today
            </Txt>
          </View>
          <View
            style={{
              height: 28,
              paddingHorizontal: 10,
              borderRadius: 14,
              backgroundColor: '#FFFFFF',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Image source={EYE} style={{ width: 14, height: 14 }} tintColor={htg.sticker} />
            <Txt size={11.5} weight={700} color={htg.sticker}>
              Peek
            </Txt>
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: 24, paddingTop: 50, gap: 18 }}>
        <Wordmark size={34} style={{ alignSelf: 'flex-start' }} />
        <View style={{ gap: 14 }}>
          <ValueLine icon={MESSAGE} text="Answer one question a day with founders in your category, at your size" />
          <ValueLine
            icon={EYE}
            text="Peek into other group chats, seeing what founders earning more than you are talking about"
          />
        </View>
      </View>

      <View style={{ position: 'absolute', left: 24, right: 24, bottom: insets.bottom + 20, gap: 10 }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setSigningIn(true)}
          style={({ pressed }) => ({
            height: 56,
            borderRadius: 28,
            backgroundColor: '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Txt size={16} weight={700} color={htg.sticker}>
            Continue
          </Txt>
        </Pressable>
      </View>

      <SignInSheet
        visible={signingIn}
        onClose={() => setSigningIn(false)}
        onSignedIn={async ({ userId, fullName }) => {
          // Apple shares the name only on the first authorization.
          if (fullName) {
            await getSupabase()
              ?.from('profiles')
              .update({ name: fullName })
              .eq('id', userId)
              .eq('name', '')
              .then(() => undefined, () => undefined);
          }
          await queryClient.invalidateQueries({ queryKey: ME_KEY });
          setSigningIn(false);
          router.replace('/');
        }}
      />
    </View>
  );
}

function Count({ label }: { label: string }) {
  return (
    <View style={{ height: 24, paddingHorizontal: 8, borderRadius: 12, backgroundColor: '#3A3F3B', justifyContent: 'center' }}>
      <Txt size={11.5} weight={600} color="#FFFFFF">
        {label}
      </Txt>
    </View>
  );
}

function ValueLine({ icon, text }: { icon: number; text: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 11,
          backgroundColor: c.raised,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Image source={icon} style={{ width: 18, height: 18 }} tintColor="#FFFFFF" />
      </View>
      <Txt size={16} weight={500} lh={1.42} style={{ flex: 1, paddingTop: 2 }}>
        {text}
      </Txt>
    </View>
  );
}
