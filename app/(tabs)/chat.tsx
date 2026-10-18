import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { AppIcon } from '@/components/ui/AppIcon';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Txt } from '@/components/ui/Txt';
import { MATCH_APPS, shortName } from '@/data/mock';
import type { Match } from '@/data/types';
import { TEAM_ID, threadPreview, timeRank } from '@/features/chat/chatMeta';
import { TeamMark } from '@/features/chat/TeamMark';
import { FREE_MATCH_LIMIT, useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

type Row =
  | { kind: 'team'; id: string; time: string; last: string }
  | { kind: 'match'; id: string; time: string; match: Match };

export default function ChatScreen() {
  const router = useRouter();
  const store = useStore();
  const deleted = store.deletedChats;

  const open = (id: string) => router.push({ pathname: '/chat/[id]', params: { id } });

  // The Team thread is a normal chat, so it sorts by recency with the matches.
  const rows = useMemo<Row[]>(() => {
    const team = threadPreview(store.messages[TEAM_ID] ?? []);

    const items: Row[] = [
      ...(deleted.includes(TEAM_ID)
        ? []
        : [{ kind: 'team', id: TEAM_ID, time: team.time, last: team.last } as Row]),
      ...store.matches
        .filter((match) => !deleted.includes(match.id))
        .map((match): Row => ({ kind: 'match', id: match.id, time: match.time, match })),
    ];

    return items.sort((a, b) => timeRank(a.time) - timeRank(b.time));
  }, [deleted, store.matches, store.messages]);

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
        {rows.map((row) =>
          row.kind === 'team' ? (
            <TeamRow key={row.id} last={row.last} time={row.time} onPress={() => open(row.id)} />
          ) : (
            <MatchRow key={row.id} match={row.match} onPress={() => open(row.id)} />
          ),
        )}

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

function TeamRow({ last, time, onPress }: { last: string; time: string; onPress: () => void }) {
  const { c } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <Card padding={14} radius={radii.cardLg}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TeamMark size={48} badge={22} />

          <View style={{ flex: 1, gap: 3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Txt font="mono" size={15} weight={500} style={{ flex: 1 }} numberOfLines={1}>
                Hey100 Team
              </Txt>
              <Txt size={11.5} muted>
                {time}
              </Txt>
            </View>

            <Txt size={13.5} muted numberOfLines={1}>
              {last}
            </Txt>

            <Txt size={11.5} color={c.accentText} numberOfLines={1}>
              Jaryd, founder · DMs open
            </Txt>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

function MatchRow({ match, onPress }: { match: Match; onPress: () => void }) {
  const { c } = useTheme();
  const store = useStore();

  const listing = store.listing(match.appId) ?? MATCH_APPS[match.appId];
  const viaApp = store.apps[match.viaAppId];
  if (!listing) return null;

  const unread = match.unread ?? 0;
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
      accessibilityLabel={unread ? `${shortName(listing.name)}, ${unread} unread` : undefined}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <Card
        padding={14}
        radius={radii.cardLg}
        style={unread ? { borderColor: c.accent } : undefined}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View>
            <AppIcon hue={listing.hue} name={listing.name} uri={listing.icon} size={48} />
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
                <AppIcon hue={viaApp.hue} name={viaApp.name} uri={viaApp.icon} size={22} />
              </View>
            ) : null}
          </View>

          <View style={{ flex: 1, gap: 3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Txt font="mono" size={15} weight={500} style={{ flex: 1 }} numberOfLines={1}>
                {shortName(listing.name)}
              </Txt>
              <Txt size={11.5} muted={!unread} color={unread ? c.accentText : undefined}>
                {match.time}
              </Txt>
            </View>

            <Txt
              size={13.5}
              weight={unread ? 500 : 400}
              muted={!unread}
              numberOfLines={1}
            >
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

          {unread ? (
            <View
              style={{
                minWidth: 22,
                height: 22,
                borderRadius: 11,
                paddingHorizontal: 7,
                backgroundColor: c.accent,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Txt font="mono" size={12} weight={600} color={c.accentInk}>
                {unread}
              </Txt>
            </View>
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}
