import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { AppIcon, Avatar } from '@/components/ui/AppIcon';
import { Txt } from '@/components/ui/Txt';
import { MATCH_APPS, shortName } from '@/data/mock';
import type { Match } from '@/data/types';
import { Segmented } from '@/components/ui/Segmented';
import { AdminInbox } from '@/features/chat/AdminInbox';
import { firstName, TEAM_ID, threadPreview, timeRank } from '@/features/chat/chatMeta';
import { JarydMark } from '@/features/chat/TeamMark';
import { CommunityHome } from '@/features/community/CommunityHome';
import { OfficialMark } from '@/features/community/OfficialMark';
import { useDevLoop } from '@/features/dev/useDevLoop';
import { useAuth } from '@/features/auth/AuthProvider';
import { useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';

const HEY100_ICON = require('../../assets/images/icon.png');

type ChatDesk = 'dms' | 'community' | 'admin';

type Row =
  | { kind: 'team'; id: string; time: string; last: string }
  | { kind: 'match'; id: string; time: string; match: Match };

export default function ChatScreen() {
  const router = useRouter();
  const store = useStore();
  const loop = useDevLoop();
  const { isAdmin } = useAuth();
  const [desk, setDesk] = useState<ChatDesk>('dms');
  const deleted = store.deletedChats;

  const open = (id: string) => router.push({ pathname: '/chat/[id]', params: { id } });

  // Jaryd's 1:1 sorts with match rows, including for the admin account.
  const rows = useMemo<Row[]>(() => {
    const team = threadPreview(loop.messages(TEAM_ID));

    const items: Row[] = [
      ...(!deleted.includes(TEAM_ID)
        ? [{ kind: 'team', id: TEAM_ID, time: team.time, last: team.last } as Row]
        : []),
      ...loop.matches
        .filter((match) => !deleted.includes(match.id))
        .map((match): Row => ({ kind: 'match', id: match.id, time: match.time, match })),
    ];

    return items.sort((a, b) => timeRank(a.time) - timeRank(b.time));
  }, [deleted, loop]);

  return (
    <Screen
      title="Chat"
      headerRight={
        <Segmented
          value={desk}
          onChange={setDesk}
          options={
            isAdmin
              ? [
                  { id: 'dms', label: 'DMs' },
                  { id: 'community', label: 'Community' },
                  { id: 'admin', label: 'Admin' },
                ]
              : [
                  { id: 'dms', label: 'DMs' },
                  { id: 'community', label: 'Community' },
                ]
          }
        />
      }
    >
      {desk === 'admin' && isAdmin ? (
        <AdminInbox />
      ) : desk === 'community' ? (
        <CommunityHome />
      ) : (
        <View style={{ gap: 4 }}>
          {rows.map((row) =>
            row.kind === 'team' ? (
              <TeamRow key={row.id} last={row.last} time={row.time} onPress={() => open(row.id)} />
            ) : (
              <MatchRow key={row.id} match={row.match} onPress={() => open(row.id)} />
            ),
          )}

          {loop.matches.length === 0 && deleted.includes(TEAM_ID) ? (
            <View style={{ paddingTop: 50, alignItems: 'center', gap: 10 }}>
              <Txt size={15} lh={1.5} muted center style={{ maxWidth: 260 }}>
                No matches yet. A chat opens once you both say hey.
              </Txt>
            </View>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

function TeamRow({ last, time, onPress }: { last: string; time: string; onPress: () => void }) {
  const { c } = useTheme();
  const badgeSize = Math.round(58 * 0.4);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 12,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View style={{ width: 58, height: 58 }}>
        <JarydMark size={58} />
        <View
          style={{
            position: 'absolute',
            right: -3,
            bottom: -3,
            borderWidth: 2,
            borderColor: c.bg,
            borderRadius: Math.round(badgeSize * 0.26),
            overflow: 'hidden',
          }}
        >
          <Image source={HEY100_ICON} style={{ width: badgeSize, height: badgeSize }} />
        </View>
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 0 }}>
            <Txt size={16.5} weight={600} numberOfLines={1} style={{ flexShrink: 1 }}>
              Jaryd from Hey100
            </Txt>
            <OfficialMark size={15} />
          </View>
          {time ? (
            <Txt size={13} muted>
              {time}
            </Txt>
          ) : null}
        </View>
        <Txt size={14.5} muted numberOfLines={1}>
          {last}
        </Txt>
      </View>
    </Pressable>
  );
}

function MatchRow({ match, onPress }: { match: Match; onPress: () => void }) {
  const { c } = useTheme();
  const store = useStore();

  const listing = store.listing(match.appId) ?? MATCH_APPS[match.appId];
  if (!listing) return null;

  const unread = match.unread ?? 0;
  const builder = firstName(listing.builder);
  const app = shortName(listing.name);
  const badgeSize = Math.round(58 * 0.4);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={unread ? `${builder} from ${app}, ${unread} unread` : `${builder} from ${app}`}
      onPress={onPress}
      style={({ pressed }) => ({
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 12,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {unread ? (
        <View
          style={{
            position: 'absolute',
            left: -14,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: c.accentText,
          }}
        />
      ) : null}

      <View style={{ width: 58, height: 58 }}>
        <Avatar name={listing.builder} uri={listing.builderPhoto} size={58} />
        <View
          style={{
            position: 'absolute',
            right: -3,
            bottom: -3,
            borderWidth: 2,
            borderColor: c.bg,
            borderRadius: Math.round(badgeSize * 0.26),
          }}
        >
          <AppIcon hue={listing.hue} name={listing.name} uri={listing.icon} size={badgeSize} />
        </View>
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Txt size={16.5} weight={600} style={{ flex: 1 }} numberOfLines={1}>
            {builder} from {app}
          </Txt>
          <Txt size={13} muted={!unread} color={unread ? c.accentText : undefined}>
            {match.time}
          </Txt>
        </View>
        <Txt size={14.5} muted={!unread} numberOfLines={1}>
          {match.last}
        </Txt>
      </View>
    </Pressable>
  );
}
