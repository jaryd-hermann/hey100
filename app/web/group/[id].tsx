import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/ui/AppIcon';
import { Btn } from '@/components/ui/Btn';
import { Chip } from '@/components/ui/Chip';
import { Sheet } from '@/components/ui/Sheet';
import { Txt } from '@/components/ui/Txt';
import { slugify } from '@/data/mock';
import { groupSharePath, useCommunityHome } from '@/data/repo/community';
import { GroupCover } from '@/features/community/GroupCover';
import { GroupPower } from '@/features/community/GroupPower';
import { seedBySlug, seedHome, useSeedTick } from '@/features/community/seed';
import { useDevMode } from '@/lib/devMode';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radii } from '@/theme/tokens';

/**
 * A preview of the public group at hey100.com/g/{slug}. Join is gated
 * behind the app, same as tapping through a shared listing.
 */
export default function WebGroupPreview() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useCommunityHome();
  const { devMode } = useDevMode();
  useSeedTick();
  const [signupOpen, setSignupOpen] = useState(false);

  const group = useMemo(() => {
    const needle = id ?? '';
    const fromSeed = seedBySlug(needle);
    if (fromSeed) return fromSeed;
    if (devMode) {
      const { mine, discover } = seedHome();
      const hit = [...mine, ...discover].find(
        (row) => row.id === needle || slugify(row.name) === needle,
      );
      if (hit) return hit;
    }
    return (
      [...(data?.mine ?? []), ...(data?.discover ?? [])].find(
        (row) => row.id === needle || slugify(row.name) === needle,
      ) ?? null
    );
  }, [data, devMode, id]);

  const intercept = () => setSignupOpen(true);
  const path = group ? groupSharePath(group) : `g/${id}`;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: layout.gutter,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderColor: c.line,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color={c.ink} />
        </Pressable>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            justifyContent: 'center',
          }}
        >
          <Ionicons name="lock-closed" size={11} color={c.muted} />
          <Txt size={12.5} muted numberOfLines={1}>
            hey100.com/{path}
          </Txt>
        </View>
        <Ionicons name="ellipsis-horizontal" size={19} color={c.muted} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 30, paddingHorizontal: layout.gutter, gap: 16 }}
      >
        <Pressable
          onPress={intercept}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 11,
            marginTop: layout.gutter,
            padding: 12,
            borderRadius: radii.card,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.line,
          }}
        >
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              backgroundColor: c.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Txt size={17}>✋</Txt>
          </View>
          <View style={{ flex: 1 }}>
            <Txt size={13.5} weight={600}>
              Hey100
            </Txt>
            <Txt size={12} muted>
              Find your first 100 users
            </Txt>
          </View>
          <Btn label="Get" variant="ink" size="sm" onPress={intercept} />
        </Pressable>

        {group ? (
          <View style={{ gap: 16, paddingTop: 6 }}>
            <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
              <GroupCover group={group} size={62} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt font="mono" size={18} weight={500} numberOfLines={1}>
                  {group.name}
                </Txt>
                {group.audience || group.bio ? (
                  <Txt size={14.5} muted numberOfLines={1}>
                    {group.audience || group.bio}
                  </Txt>
                ) : null}
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
              <Chip
                label={
                  group.joinMode === 'request'
                    ? 'Request to join'
                    : group.joinMode === 'criteria'
                      ? 'Match criteria'
                      : 'Anyone can join'
                }
                size="sm"
              />
              <Chip label={`${group.memberCount.toLocaleString()} members`} size="sm" />
              {group.ratingAvg != null && group.ratingCount ? (
                <Chip
                  label={`${group.ratingAvg.toFixed(1)} (${group.ratingCount.toLocaleString()})`}
                  size="sm"
                  left={<Ionicons name="star" size={12} color="#FFCC00" />}
                />
              ) : null}
            </View>
            {group.bio ? (
              <Txt size={15} lh={1.45} muted>
                {group.bio}
              </Txt>
            ) : null}
            <GroupPower power={group.power} />
            <Btn label="Join group" variant="accent" size="lg" full onPress={intercept} />
          </View>
        ) : (
          <View style={{ paddingTop: 40 }}>
            <Txt muted center>
              This group is only available in the Hey100 app.
            </Txt>
          </View>
        )}
      </ScrollView>

      <Sheet visible={signupOpen} onClose={() => setSignupOpen(false)}>
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {group ? (
              <GroupCover group={group} size={52} />
            ) : (
              <AppIcon hue={128} name="Hey100" size={52} />
            )}
            <View style={{ flex: 1 }}>
              <Txt font="mono" size={16} weight={500} numberOfLines={1}>
                Get the app to join {group?.name ?? 'this group'}
              </Txt>
              <Txt size={13.5} muted numberOfLines={2}>
                Groups live in Hey100. Download the app to request or join.
              </Txt>
            </View>
          </View>
          <Btn
            label="Sign up"
            variant="accent"
            size="lg"
            full
            onPress={() => {
              setSignupOpen(false);
              router.push('/onboarding');
            }}
          />
          <Btn label="Get the iOS app" variant="surface" size="lg" full onPress={() => setSignupOpen(false)} />
          <Btn label="Keep browsing" variant="ghost" size="md" full onPress={() => setSignupOpen(false)} />
        </View>
      </Sheet>
    </View>
  );
}
