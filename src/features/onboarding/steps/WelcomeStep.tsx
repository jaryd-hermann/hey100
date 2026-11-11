import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, View } from 'react-native';

import { HeroLogo } from '@/components/brand/Logo';
import { Btn } from '@/components/ui/Btn';
import { Txt } from '@/components/ui/Txt';
import { radii } from '@/theme/tokens';

const ICON = 72;
const BADGE = 26;

const TILES = [
  {
    logo: require('../../../../web/public/landing/logo-1.png'),
    face: require('../../../../web/public/landing/face-1.jpg'),
    rotate: '-8deg',
    ring: '#00FF00',
  },
  {
    logo: require('../../../../web/public/landing/logo-2.png'),
    face: require('../../../../web/public/landing/face-2.png'),
    rotate: '6deg',
    ring: '#FFFF00',
  },
  {
    logo: require('../../../../web/public/landing/logo-3.png'),
    face: require('../../../../web/public/landing/face-3.png'),
    rotate: '9deg',
    ring: '#00FFFF',
  },
  {
    logo: require('../../../../web/public/landing/logo-4.png'),
    face: require('../../../../web/public/landing/face-4.png'),
    rotate: '7deg',
    ring: '#FF00FF',
  },
  {
    logo: require('../../../../web/public/landing/logo-5.png'),
    face: require('../../../../web/public/landing/face-5.jpg'),
    rotate: '-5deg',
    ring: '#2E5CFF',
  },
  {
    logo: require('../../../../web/public/landing/logo-6.png'),
    face: require('../../../../web/public/landing/face-6.jpg'),
    rotate: '-10deg',
    ring: '#FF5900',
  },
];

export function WelcomeStep({
  onContinue,
  onLogIn,
}: {
  onContinue: () => void;
  onLogIn: () => void;
}) {
  return (
    <View style={{ flex: 1, paddingHorizontal: 28, paddingBottom: 44 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log in"
        onPress={onLogIn}
        hitSlop={10}
        style={({ pressed }) => ({
          alignSelf: 'flex-end',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 13,
          height: 34,
          borderRadius: radii.pill,
          borderWidth: 1.5,
          borderColor: '#FFFFFF',
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Ionicons name="log-in-outline" size={16} color="#FFFFFF" />
        <Txt size={13.5} weight={600} color="#FFFFFF">
          Log in
        </Txt>
      </Pressable>

      <View style={{ flex: 1, justifyContent: 'center', gap: 22 }}>
        <View style={{ height: 176, marginBottom: 8 }}>
          {TILES.map((tile, index) => (
            <View
              key={index}
              style={{
                position: 'absolute',
                left: 8 + (index % 3) * 108,
                top: index < 3 ? 0 : 86,
                width: ICON,
                height: ICON,
                transform: [{ rotate: tile.rotate }],
              }}
            >
              <Image
                source={tile.logo}
                contentFit="cover"
                style={{ width: ICON, height: ICON, borderRadius: 18, backgroundColor: '#111111' }}
              />
              <View
                style={{
                  position: 'absolute',
                  right: -5,
                  bottom: -5,
                  borderRadius: BADGE,
                  borderWidth: 3,
                  borderColor: tile.ring,
                  backgroundColor: tile.ring,
                }}
              >
                <Image
                  source={tile.face}
                  contentFit="cover"
                  style={{ width: BADGE, height: BADGE, borderRadius: BADGE / 2 }}
                />
              </View>
            </View>
          ))}
        </View>
        <HeroLogo />
        <Txt font="mono" size={27} weight={600} lh={1.2} tracking={-1.35} color="#FFFFFF">
          the{' '}
          <Txt font="mono" size={27} weight={600} color="#111111" style={{ backgroundColor: '#C6F24E' }}>
            {' '}‘product dating app’{' '}
          </Txt>{' '}
          for founders and indie makers.
        </Txt>
        <Txt size={16} lh={1.5} color="rgba(255,255,255,0.82)">
          Find people to try your product. DM users, get feedback, and chat with other builders.
        </Txt>
      </View>

      <View
        style={{
          borderRadius: radii.pill,
          shadowColor: '#000000',
          shadowOpacity: 1,
          shadowRadius: 0,
          shadowOffset: { width: 4, height: 4 },
          elevation: 6,
        }}
      >
        <Btn
          label="Continue"
          variant="accent"
          size="lg"
          full
          onPress={onContinue}
          style={{ borderColor: '#000000', borderWidth: 2 }}
        />
      </View>

      <Txt size={12.5} color="rgba(255,255,255,0.7)" center style={{ marginTop: 16 }}>
        For builders & devs with real products.
      </Txt>
    </View>
  );
}
