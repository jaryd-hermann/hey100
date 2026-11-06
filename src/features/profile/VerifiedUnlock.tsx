import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { VerifiedBadge } from '@/components/brand/Marks';
import { Btn } from '@/components/ui/Btn';
import { Sheet } from '@/components/ui/Sheet';
import { Txt } from '@/components/ui/Txt';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthProvider';
import { useMyKarma, VERIFIED_KARMA } from '@/features/profile/karma';

const SEEN_KEY = 'hey100.verified-unlock-seen';

export function VerifiedUnlockHost() {
  const router = useRouter();
  const params = useGlobalSearchParams<{ verified?: string }>();
  const { userId, isAdmin } = useAuth();
  const { karma, verified } = useMyKarma();
  const [open, setOpen] = useState(false);
  const last = useRef<number | null>(null);

  useEffect(() => {
    if (!userId) return;
    void syncKarma(karma);
  }, [karma, userId]);

  useEffect(() => {
    if (!verified || isAdmin) {
      last.current = karma;
      return;
    }
    const prev = last.current;
    last.current = karma;
    if (params.verified === '1') {
      setOpen(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      return;
    }
    if (prev != null && prev < VERIFIED_KARMA && karma >= VERIFIED_KARMA) {
      setOpen(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      return;
    }
    void AsyncStorage.getItem(SEEN_KEY).then((seen) => {
      if (!seen && karma >= VERIFIED_KARMA) {
        setOpen(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    });
  }, [isAdmin, karma, params.verified, verified]);

  return (
    <Sheet
      visible={open}
      onClose={() => {
        setOpen(false);
        void AsyncStorage.setItem(SEEN_KEY, '1');
        if (params.verified === '1') router.replace('/profile');
      }}
    >
      <View style={{ gap: 14, alignItems: 'center', paddingTop: 8 }}>
        <VerifiedBadge size={56} />
        <Txt font="mono" size={24} weight={500} center>
          You are verified
        </Txt>
        <Txt size={16} center lh={1.45}>
          You earned the verified badge for being a great community member.
        </Txt>
        <Btn
          label="Nice"
          variant="accent"
          size="lg"
          full
          onPress={() => {
            setOpen(false);
            void AsyncStorage.setItem(SEEN_KEY, '1');
            if (params.verified === '1') router.replace('/profile');
          }}
        />
      </View>
    </Sheet>
  );
}

async function syncKarma(karma: number): Promise<void> {
  const db = getSupabase();
  if (!db) return;
  await db.rpc('sync_my_karma', { p_karma: karma });
}
