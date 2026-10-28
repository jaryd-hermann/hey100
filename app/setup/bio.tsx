import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, Avatar } from '@/components/ui/AppIcon';
import { Btn } from '@/components/ui/Btn';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Txt } from '@/components/ui/Txt';
import { updateMyProfile } from '@/data/repo/profile';
import { useAuth } from '@/features/auth/AuthProvider';
import { BIO_MAX } from '@/features/profile/fields';
import { builderRole } from '@/features/profile/builderCard';
import { toProfilePatch } from '@/features/profile/mapProfile';
import { useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radii } from '@/theme/tokens';

const AVATAR = 40;
const BADGE = 18;

export default function SetupBio() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const store = useStore();
  const { userId } = useAuth();
  const { appId } = useLocalSearchParams<{ appId?: string }>();
  const [bio, setBio] = useState(store.user.bio);
  const [saving, setSaving] = useState(false);

  const user = store.user;
  const app = store.ownedApps.find((item) => item.id === appId) ?? store.primaryApp;
  const role = builderRole(user.job, user.workplace);

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
    <View
      style={{
        flex: 1,
        backgroundColor: c.bg,
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 20,
        paddingHorizontal: layout.gutter,
      }}
    >
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ gap: 16, paddingTop: 24, paddingBottom: 20 }}
      >
        <Txt font="mono" size={27} weight={500} lh={1.22}>
          Write a short bio
        </Txt>
        <Txt size={15.5} lh={1.5} muted>
          One or two lines about what you build.
        </Txt>

        <Card padding={16} radius={radii.cardLg}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: AVATAR, height: AVATAR }}>
              <Avatar
                name={user.realName || user.username || 'You'}
                seed={user.username}
                uri={user.photo}
                size={AVATAR}
              />
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  bottom: 0,
                  left: 0,
                  borderRadius: AVATAR / 2,
                  borderWidth: 1.5,
                  borderColor: c.ink,
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  right: -4,
                  bottom: -4,
                  borderWidth: 2,
                  borderColor: c.surface,
                  borderRadius: Math.round(BADGE * 0.26) + 2,
                }}
              >
                <AppIcon hue={app.hue} name={app.name} uri={app.icon} size={BADGE} />
              </View>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt size={16} weight={700} numberOfLines={1}>
                {user.realName || 'You'}
              </Txt>
              {user.username ? (
                <Txt font="mono" size={13} muted numberOfLines={1}>
                  @{user.username}
                </Txt>
              ) : null}
              {role ? (
                <Txt size={13.5} muted numberOfLines={1}>
                  {role}
                </Txt>
              ) : null}
            </View>
          </View>
        </Card>

        <Field
          value={bio}
          onChangeText={setBio}
          placeholder="Building X on nights and weekends."
          multiline
          minHeight={120}
          max={BIO_MAX}
          accent
          autoFocus
        />
      </ScrollView>

      <View style={{ gap: 10 }}>
        <Btn
          label={saving ? 'Saving…' : 'Save bio'}
          variant="accent"
          size="lg"
          full
          dim={!bio.trim()}
          onPress={() => void finish(bio.trim())}
        />
        <Btn label="Skip" variant="ghost" size="md" full onPress={() => void finish('')} />
      </View>
    </View>
  );
}
