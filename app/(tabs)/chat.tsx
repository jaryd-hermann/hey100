import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { AppIcon } from '@/components/ui/AppIcon';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Txt } from '@/components/ui/Txt';
import { MATCH_APPS, shortName } from '@/data/mock';
import type { Match } from '@/data/types';
import { FREE_MATCH_LIMIT, useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

export default function ChatScreen() {
  const router = useRouter();
  const { c } = useTheme();
  const store = useStore();

  const open = (id: string) => router.push({ pathname: '/chat/[id]', params: { id } });

  return (
    <Screen
      title="Chat"
      headerRight={
        store.isPro ? null : (
          <Txt font="mono" size={12} muted>
            {store.matches.length} of {FREE_MATCH_LIMIT + store.user.bonusMatches} free
          </Txt>
        )
      }
    >
      <View style={{ gap: 12 }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => open('team')}
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <Card tone="soft" padding={14} radius={radii.cardLg}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 13,
                  backgroundColor: c.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Txt font="logo" size={17} color={c.accentInk}>
                  00
                </Txt>
              </View>

              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Txt font="mono" size={15} weight={500}>
                    Hey100 Team
                  </Txt>
                  <Chip label="Pinned" size="sm" tone="accent" />
                </View>
                <Txt size={13.5} muted numberOfLines={1}>
                  Hey, Jaryd here. This thread comes straight to me.
                </Txt>
                <Txt size={11.5} color={c.accentText}>
                  Jaryd, founder · DMs open
                </Txt>
              </View>
            </View>
          </Card>
        </Pressable>

        {store.matches.map((match) => (
          <MatchRow key={match.id} match={match} onPress={() => open(match.id)} />
        ))}

        {store.matches.length === 0 ? (
          <View style={{ paddingTop: 50, alignItems: 'center', gap: 10 }}>
            <Txt size={15} lh={1.5} muted center style={{ maxWidth: 260 }}>
              No matches yet. A chat opens once you both say hey.
            </Txt>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

function MatchRow({ match, onPress }: { match: Match; onPress: () => void }) {
  const { c } = useTheme();
  const store = useStore();

  const listing = store.listing(match.appId) ?? MATCH_APPS[match.appId];
  const viaApp = store.apps[match.viaAppId];
  if (!listing) return null;

  const complete = match.mine === 'Feedback sent' && match.theirs === 'Feedback sent';
  const status = complete
    ? { label: 'Trade complete', tone: 'default' as const }
    : match.turn
      ? { label: 'Your turn', tone: 'accent' as const }
      : match.expiresInDays
        ? { label: `${match.expiresInDays} days left`, tone: 'default' as const }
        : { label: 'Waiting', tone: 'default' as const };

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <Card padding={14} radius={radii.cardLg}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View>
            <AppIcon hue={listing.hue} name={listing.name} size={48} />
            {viaApp ? (
              <View
                style={{
                  position: 'absolute',
                  bottom: -3,
                  right: -4,
                  borderRadius: 8,
                  borderWidth: 2,
                  borderColor: c.surface,
                }}
              >
                <AppIcon hue={viaApp.hue} name={viaApp.name} size={22} />
              </View>
            ) : null}
          </View>

          <View style={{ flex: 1, gap: 3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Txt font="mono" size={15} weight={500} style={{ flex: 1 }} numberOfLines={1}>
                {shortName(listing.name)}
              </Txt>
              <Txt size={11.5} muted>
                {match.time}
              </Txt>
            </View>

            <Txt size={13.5} muted numberOfLines={1}>
              {match.last}
            </Txt>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 3 }}>
              <Chip label={status.label} size="sm" tone={status.tone} />
              {viaApp ? (
                <Txt size={11.5} muted numberOfLines={1}>
                  via {shortName(viaApp.name)}
                </Txt>
              ) : null}
            </View>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
