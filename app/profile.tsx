import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/AppIcon';
import { Btn } from '@/components/ui/Btn';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { useToast } from '@/components/ui/Toast';
import { Label, Txt } from '@/components/ui/Txt';
import { stripEmoji } from '@/data/mock';
import { useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radii } from '@/theme/tokens';

const TAG_ROWS: [label: string, group: string][] = [
  ['Day job', 'job'],
  ['Looking for', 'look'],
  ["Apps I'd try", 'cat'],
  ['Outside building', 'l'],
  ['Tests on', 'd'],
];

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const toast = useToast();
  const store = useStore();

  const { user } = store;
  const handle = user.username;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: layout.gutter,
          paddingBottom: 10,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={26} color={c.ink} />
        </Pressable>
        <Txt font="mono" size={17} weight={500} style={{ flex: 1 }}>
          Profile
        </Txt>
        <Pressable onPress={() => toast('Profile editing lands next')} hitSlop={10}>
          <Txt size={14} weight={600}>
            Edit
          </Txt>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingBottom: 60, gap: 16 }}
      >
        <View style={{ alignItems: 'center', gap: 10, paddingVertical: 10 }}>
          <Avatar name={user.realName} size={88} />
          <Txt size={22} weight={700}>
            {user.realName}
          </Txt>
          <Txt font="mono" size={14} muted>
            @{handle}
          </Txt>
          <Txt font="mono" size={12.5} color={c.accentText}>
            hey100.com/{handle}
          </Txt>
        </View>

        <Card padding={16} radius={radii.cardLg}>
          <View style={{ flexDirection: 'row' }}>
            {(
              [
                ['Feedback given', String(user.feedbackGiven)],
                ['Reply rate', user.replyRate],
                ['Rating', user.rating],
              ] as const
            ).map(([label, value]) => (
              <View key={label} style={{ flex: 1, gap: 3 }}>
                <Txt font="mono" size={19} weight={500}>
                  {value}
                </Txt>
                <Label size={10}>{label}</Label>
              </View>
            ))}
          </View>
        </Card>

        <Card tone="soft" padding={16} radius={radii.cardLg} style={{ gap: 12 }}>
          <Txt size={16} weight={700} color={c.accentText}>
            Invite builders
          </Txt>
          <Txt size={13.5} lh={1.45} color={c.accentText}>
            You both get +3 matches when they publish a listing, up to +15.
          </Txt>

          <Pressable
            onPress={() => {
              Clipboard.setStringAsync(`https://hey100.com/i/${user.referralCode}`).catch(() => {});
              toast('Invite link copied');
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 9,
              backgroundColor: c.surface,
              borderRadius: radii.card,
              paddingHorizontal: 13,
              paddingVertical: 11,
            }}
          >
            <Txt font="mono" size={13} style={{ flex: 1 }} numberOfLines={1}>
              hey100.com/i/{user.referralCode}
            </Txt>
            <Ionicons name="copy-outline" size={15} color={c.muted} />
          </Pressable>

          <View style={{ flexDirection: 'row', gap: 20 }}>
            <View>
              <Label size={10}>Joined</Label>
              <Txt font="mono" size={16} weight={500}>
                {user.invitedBy ? 1 : 0}
              </Txt>
            </View>
            <View>
              <Label size={10}>Matches earned</Label>
              <Txt font="mono" size={16} weight={500}>
                +{user.bonusMatches}
              </Txt>
            </View>
          </View>

          <Btn
            label="Share invite"
            variant="ink"
            size="sm"
            onPress={() => router.push({ pathname: '/share', params: { kind: 'invite' } })}
            style={{ alignSelf: 'flex-start' }}
          />
        </Card>

        {TAG_ROWS.map(([label, group]) => {
          const values =
            group === 'job'
              ? [user.job, user.workplace].filter(Boolean)
              : (user.tags[group] ?? []).map(stripEmoji);

          if (!values.length) return null;

          return (
            <View key={group} style={{ gap: 9 }}>
              <Label>{label}</Label>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                {values.map((value) => (
                  <Chip key={value} label={value} size="sm" />
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
