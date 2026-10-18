import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeaderLogo } from '@/components/brand/Logo';
import { AppIcon, Avatar } from '@/components/ui/AppIcon';
import { Btn } from '@/components/ui/Btn';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { Label, Txt } from '@/components/ui/Txt';
import { MILESTONES, shortName, slugify } from '@/data/mock';
import { captureEvent } from '@/lib/analytics';
import { useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radii } from '@/theme/tokens';

type ShareKind = 'listing' | 'testimonial' | 'milestone' | 'invite';

/** One share sheet serves all five distribution loops. */
export default function ShareSheet() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const toast = useToast();
  const store = useStore();

  const { kind = 'listing', appId, feedbackId, milestoneId } = useLocalSearchParams<{
    kind: ShareKind;
    appId?: string;
    feedbackId?: string;
    milestoneId?: string;
  }>();

  const app = store.apps[appId ?? ''] ?? store.primaryApp;
  const slug = slugify(app.name);
  const inviteUrl = `hey100.com/i/${store.user.referralCode}`;
  const listingUrl = `hey100.com/${slug}`;

  const feedback = feedbackId
    ? store.inbox[appId ?? '']?.list.find((entry) => entry.id === feedbackId)
    : undefined;
  const milestone = MILESTONES.find((item) => item.id === milestoneId);

  const url = kind === 'invite' ? inviteUrl : listingUrl;

  const postText =
    kind === 'invite'
      ? `I'm on Hey100 finding the first users for ${shortName(app.name)}. Join me and we both get +3 matches: https://${inviteUrl}`
      : kind === 'testimonial'
        ? `"${feedback?.text ?? ''}" — ${feedback?.who ?? ''}, via Hey100`
        : kind === 'milestone'
          ? `${milestone?.title ?? ''} on Hey100 🎉 https://${listingUrl}`
          : `${shortName(app.name)} is looking for its first 100 users. Want to try it? Match with me on Hey100: https://${listingUrl}`;

  const share = async (channel: string) => {
    captureEvent('share_opened', { kind, channel });
    if (channel === 'Copy link') {
      await Clipboard.setStringAsync(`https://${url}`).catch(() => {});
      toast('Link copied');
      return;
    }
    if (channel === 'Copy embed') {
      await Clipboard.setStringAsync(
        `<a href="https://${listingUrl}"><img src="https://hey100.com/badge/${slug}.svg"></a>`,
      ).catch(() => {});
      toast('Embed code copied');
      return;
    }
    await Share.share({ message: postText }).catch(() => {});
  };

  const channels =
    kind === 'testimonial'
      ? ['Save image', 'Copy embed', 'X', 'LinkedIn']
      : kind === 'invite'
        ? ['Share invite', 'Copy link']
        : ['X', 'LinkedIn', 'Threads', 'Copy link'];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: layout.gutter,
          paddingBottom: 10,
        }}
      >
        <Txt font="mono" size={17} weight={500}>
          Share
        </Txt>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Close">
          <Ionicons name="close" size={24} color={c.muted} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingBottom: 40, gap: 16 }}
      >
        {/* Card preview. The listing version doubles as the Open Graph image. */}
        <View
          style={{
            borderRadius: radii.cardLg,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.line,
            padding: 18,
            gap: 14,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <HeaderLogo />
          </View>

          {kind === 'testimonial' && feedback ? (
            <>
              <Txt size={19} lh={1.45}>
                &ldquo;{feedback.text}&rdquo;
              </Txt>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Avatar name={feedback.who} size={34} />
                <View style={{ flex: 1 }}>
                  <Txt size={14} weight={600}>
                    {feedback.who}
                  </Txt>
                  <Txt size={12} muted>
                    {feedback.app}
                  </Txt>
                </View>
              </View>
              <Txt size={11.5} muted>
                via Hey100 · {listingUrl}
              </Txt>
            </>
          ) : kind === 'milestone' && milestone ? (
            <>
              <Txt size={34}>{milestone.badge}</Txt>
              <Txt font="mono" size={19} weight={500} lh={1.3}>
                {milestone.title}
              </Txt>
              <Txt size={13.5} muted lh={1.45}>
                {milestone.sub}
              </Txt>
              <Txt size={11.5} muted>
                {listingUrl}
              </Txt>
            </>
          ) : kind === 'invite' ? (
            <>
              <Txt font="mono" size={20} weight={500} lh={1.3}>
                +3 matches for both of us
              </Txt>
              <Txt size={14.5} lh={1.5} muted>
                When you list your app on Hey100, we each get three more matches.
              </Txt>
              <Txt font="mono" size={13} color={c.accentText}>
                {inviteUrl}
              </Txt>
            </>
          ) : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <AppIcon hue={app.hue} name={app.name} uri={app.icon} size={48} />
                <View style={{ flex: 1 }}>
                  <Txt font="mono" size={15} weight={500} numberOfLines={1}>
                    {app.name}
                  </Txt>
                  <Txt size={13} muted numberOfLines={1}>
                    {app.sub}
                  </Txt>
                </View>
              </View>

              {app.prompts.slice(0, 3).map(([label, answer]) => (
                <View key={label} style={{ gap: 4 }}>
                  <Label size={10}>{label}</Label>
                  <Txt size={14.5} lh={1.4} numberOfLines={2}>
                    {answer}
                  </Txt>
                </View>
              ))}

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  borderTopWidth: 1,
                  borderColor: c.line,
                  paddingTop: 13,
                }}
              >
                <Avatar name={store.user.realName} size={30} />
                <Txt size={13} weight={500} style={{ flex: 1 }}>
                  Want to try this? Match with me on Hey100
                </Txt>
              </View>
            </>
          )}
        </View>

        <Card padding={14} style={{ gap: 8 }}>
          <Label>Post text</Label>
          <Txt size={14.5} lh={1.5}>
            {postText}
          </Txt>
        </Card>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {channels.map((channel) => (
            <Btn
              key={channel}
              label={channel}
              variant={channel.startsWith('Copy') || channel === 'Save image' ? 'surface' : 'ink'}
              size="md"
              onPress={() => share(channel)}
              style={{ flexGrow: 1, minWidth: '45%' }}
            />
          ))}
        </View>

        {kind === 'listing' ? (
          <Pressable
            onPress={() => router.push({ pathname: '/web/[slug]', params: { slug } })}
            style={{ paddingVertical: 8 }}
          >
            <Txt size={14} weight={600} color={c.accentText}>
              Preview the web page →
            </Txt>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}
