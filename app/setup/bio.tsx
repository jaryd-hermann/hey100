import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Btn } from '@/components/ui/Btn';
import { Field } from '@/components/ui/Field';
import { Txt } from '@/components/ui/Txt';
import { updateMyProfile } from '@/data/repo/profile';
import { useAuth } from '@/features/auth/AuthProvider';
import { BIO_MAX } from '@/features/profile/fields';
import { toProfilePatch } from '@/features/profile/mapProfile';
import { useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { layout } from '@/theme/tokens';

export default function SetupBio() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const store = useStore();
  const { userId } = useAuth();
  const { appId } = useLocalSearchParams<{ appId?: string }>();
  const [bio, setBio] = useState(store.user.bio);
  const [saving, setSaving] = useState(false);

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
        justifyContent: 'space-between',
      }}
    >
      <View style={{ gap: 16, paddingTop: 24 }}>
        <Txt font="mono" size={27} weight={500} lh={1.22}>
          Write a short bio
        </Txt>
        <Txt size={15.5} lh={1.5} muted>
          One or two lines about what you build. Same length as Twitter — {BIO_MAX} characters.
        </Txt>
        <Field
          value={bio}
          onChangeText={setBio}
          placeholder="Building X on nights and weekends."
          multiline
          minHeight={120}
          max={BIO_MAX}
        />
      </View>

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
