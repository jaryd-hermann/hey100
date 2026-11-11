import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/AppIcon';
import { Txt } from '@/components/ui/Txt';
import { updateMyProfile } from '@/data/repo/profile';
import { useAuth } from '@/features/auth/AuthProvider';
import { FlowButton } from '@/features/onboarding/FlowButton';
import { INK } from '@/features/onboarding/look';
import { BIO_MAX } from '@/features/profile/fields';
import { toProfilePatch } from '@/features/profile/mapProfile';
import { useStore } from '@/store/AppStore';
import { fonts } from '@/theme/tokens';

const PLACEHOLDER = 'Building X on nights and weekends.';

export default function SetupBio() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const store = useStore();
  const { userId } = useAuth();
  const { appId } = useLocalSearchParams<{ appId?: string }>();
  const [bio, setBio] = useState(store.user.bio);
  const [saving, setSaving] = useState(false);

  const user = store.user;
  const handle = user.username ? `@${user.username}` : '@you';

  const finish = async (value: string) => {
    if (saving) return;
    setSaving(true);
    store.updateUser({ bio: value });
    if (userId) {
      try {
        await updateMyProfile(userId, toProfilePatch({ ownWords: { ...store.user.ownWords, bio: value } }));
      } catch {
        // The listing still opens; they can edit the bio from their profile.
      }
    }
    router.replace({
      pathname: '/my-app/[id]',
      params: { id: appId || store.primaryApp.id, setup: '1' },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFF00', paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={{ paddingHorizontal: 22, paddingTop: 14, gap: 9 }}>
        <Txt font="mono" size={29} weight={600} lh={1.12} tracking={-1.45} color={INK}>
          Write a short bio
        </Txt>
        <Txt size={16} lh={1.45} color="rgba(17,17,17,0.78)">
          One or two lines about what you build.
        </Txt>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 14 }}>
        <View>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 5,
              bottom: -5,
              borderRadius: 20,
              backgroundColor: INK,
            }}
          />
          <View
            style={{
              borderRadius: 20,
              borderWidth: 2,
              borderColor: INK,
              backgroundColor: '#FFFFFF',
              minHeight: 148,
            }}
          >
            <TextInput
              value={bio}
              onChangeText={(next) => setBio(next.slice(0, BIO_MAX))}
              placeholder={PLACEHOLDER}
              placeholderTextColor="rgba(17,17,17,0.42)"
              multiline
              autoFocus
              maxLength={BIO_MAX}
              textAlignVertical="top"
              style={{
                minHeight: 148,
                paddingTop: 16,
                paddingHorizontal: 16,
                paddingBottom: 30,
                color: INK,
                fontFamily: fonts.bodyMedium,
                fontSize: 18,
                lineHeight: 25,
              }}
            />
            <Txt
              font="mono"
              size={11.5}
              weight={600}
              color="#5B625C"
              style={{ position: 'absolute', right: 16, bottom: 12 }}
            >
              {bio.length}/{BIO_MAX}
            </Txt>
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            padding: 12,
            borderRadius: 18,
            backgroundColor: 'rgba(17,17,17,0.06)',
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: INK,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              borderWidth: 1.5,
              borderColor: INK,
              overflow: 'hidden',
            }}
          >
            <Avatar name={user.realName || user.username || 'You'} seed={user.username} uri={user.photo} size={36} />
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <Txt size={13.5} weight={700} color={INK} numberOfLines={1}>
              {handle}
            </Txt>
            <Txt size={13} lh={1.35} color={INK}>
              {bio.trim() || PLACEHOLDER}
            </Txt>
          </View>
        </View>
      </View>

      <View style={{ flex: 1 }} />
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 34),
          gap: 10,
        }}
      >
        <FlowButton
          label={saving ? 'Saving…' : 'Save bio'}
          bg={INK}
          fg="#FFFFFF"
          shadow={INK}
          dim={saving}
          onPress={() => void finish(bio.trim())}
        />
        <Pressable
          onPress={() => void finish('')}
          style={{ height: 30, alignItems: 'center', justifyContent: 'center' }}
        >
          <Txt size={14.5} weight={700} color={INK} style={{ textDecorationLine: 'underline' }}>
            Skip
          </Txt>
        </Pressable>
      </View>
    </View>
  );
}
