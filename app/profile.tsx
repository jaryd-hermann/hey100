import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/AppIcon';
import { Btn } from '@/components/ui/Btn';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { useToast } from '@/components/ui/Toast';
import { Label, Txt } from '@/components/ui/Txt';
import { stripEmoji } from '@/data/mock';
import { syncGithubProfile } from '@/data/repo/connections';
import { TAG_ROWS } from '@/features/profile/fields';
import { PRO_PRICE, useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radii } from '@/theme/tokens';

/** Network icons for the social pills, matching the developer sheet. */
const SOCIAL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  X: 'logo-twitter',
  GitHub: 'logo-github',
  LinkedIn: 'logo-linkedin',
  TikTok: 'logo-tiktok',
  Instagram: 'logo-instagram',
  YouTube: 'logo-youtube',
  Discord: 'logo-discord',
};

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const toast = useToast();
  const store = useStore();
  const queryClient = useQueryClient();
  const [githubBusy, setGithubBusy] = useState(false);

  const { user } = store;

  const connectGithub = async () => {
    if (githubBusy) return;
    setGithubBusy(true);
    try {
      let result = await syncGithubProfile();
      if (result.url) {
        const auth = await WebBrowser.openAuthSessionAsync(result.url, 'hey100://connect');
        if (auth.type !== 'success') return;
        result = await syncGithubProfile();
      }
      if (result.commits != null) {
        store.updateUser({ githubLogin: result.login, githubCommits: result.commits });
        toast('GitHub commits updated');
      }
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'GitHub did not connect');
    } finally {
      setGithubBusy(false);
    }
  };
  const handle = user.username;
  const socials = user.socials.filter(([, value]) => !!value);

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
        <Pressable onPress={() => router.push('/profile/edit')} hitSlop={10}>
          <Txt size={14} weight={600}>
            Edit
          </Txt>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingBottom: 60, gap: 16 }}
      >
        <View style={{ alignItems: 'center', gap: 10, paddingVertical: 10 }}>
          <Avatar name={user.realName} seed={user.username} uri={user.photo} size={88} />
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

        {user.bio || socials.length ? (
          <View style={{ gap: 12 }}>
            {user.bio ? (
              <Txt size={15} lh={1.5}>
                {user.bio}
              </Txt>
            ) : (
              <Pressable onPress={() => router.push('/profile/edit')}>
                <Txt size={15} color={c.accentText}>
                  Add a bio
                </Txt>
              </Pressable>
            )}

            {socials.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                {socials.map(([kind, value]) => (
                  <Chip
                    key={kind}
                    label={value}
                    size="sm"
                    tone="accent"
                    onPress={() => router.push({ pathname: '/browser', params: { kind, value } })}
                    left={
                      <Ionicons
                        name={SOCIAL_ICONS[kind] ?? 'globe-outline'}
                        size={13}
                        color={c.accentText}
                      />
                    }
                    right={<Ionicons name="open-outline" size={12} color={c.accentText} />}
                  />
                ))}
              </View>
            ) : null}
          </View>
        ) : (
          <Pressable onPress={() => router.push('/profile/edit')}>
            <Txt size={15} color={c.accentText}>
              Add a bio
            </Txt>
          </Pressable>
        )}

        <Pressable onPress={() => router.push('/paywall?from=profile')}>
          <Card padding={16} radius={radii.cardLg} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, gap: 3 }}>
              <Label size={10}>Subscription</Label>
              <Txt font="mono" size={18} weight={500}>
                {store.isPro ? 'Hey100 Pro' : 'Free'}
              </Txt>
              <Txt size={13} muted>
                {store.isPro ? `${PRO_PRICE} a month` : `Tap to upgrade · ${PRO_PRICE}/mo`}
              </Txt>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.muted} />
          </Card>
        </Pressable>

        {/* Real counts only. A dash means we do not have the number yet. */}
        <Card padding={16} radius={radii.cardLg}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 15 }}>
            {(
              [
                ["Heys given", String(store.sentHeys.length)],
                ['Feedback given', String(user.feedbackGiven)],
                ['Reply rate', user.replyRate],
                ['Rating', user.rating],
                ['Matches', String(store.matchesMade)],
                ['Users found', String(store.usersFound)],
              ] as const
            ).map(([label, value]) => (
              <View key={label} style={{ width: '33.33%', gap: 3 }}>
                <Txt font="mono" size={19} weight={500}>
                  {value}
                </Txt>
                <Label size={10}>{label}</Label>
              </View>
            ))}
          </View>
        </Card>

        <Pressable onPress={() => void connectGithub()} disabled={githubBusy}>
          <Card padding={16} radius={radii.cardLg} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ionicons name="logo-github" size={22} color={c.ink} />
            <View style={{ flex: 1, gap: 3 }}>
              <Label size={10}>GitHub</Label>
              <Txt font="mono" size={18} weight={500}>
                {user.githubCommits != null
                  ? `${user.githubCommits.toLocaleString()} commits`
                  : githubBusy
                    ? 'Counting…'
                    : 'Connect GitHub'}
              </Txt>
              <Txt size={13} muted>
                {user.githubLogin
                  ? `@${user.githubLogin} · across your repos`
                  : 'Shows your total commits as a builder'}
              </Txt>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.muted} />
          </Card>
        </Pressable>

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
              ? [user.job, user.department, user.workplace, user.industry].filter(Boolean)
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
