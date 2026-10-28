import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AppIcon, Avatar } from '@/components/ui/AppIcon';
import { Btn } from '@/components/ui/Btn';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { Label, Txt } from '@/components/ui/Txt';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import {
  checkCommunityJoin,
  JOIN_CRITERIA,
  isMatchGroup,
  type CommunityGroup,
  type JoinCriterion,
} from '@/data/repo/community';
import { isServerId } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';
import { layout } from '@/theme/tokens';

import { GroupCover } from './GroupCover';
import { GroupPower } from './GroupPower';
import { MemberChip } from './MemberStack';
import { copyGroupLink } from './shareGroup';
import { lastActiveLabel } from './time';
import { seedThreads } from './seed';

export function GroupCoverSheet({
  group,
  busy,
  onClose,
  onJoin,
}: {
  group: CommunityGroup | null;
  busy?: boolean;
  onClose: () => void;
  onJoin: (note?: string, skipApproval?: boolean) => void;
}) {
  const { c } = useTheme();
  const toast = useToast();
  const [note, setNote] = useState('');
  const [check, setCheck] = useState<{ id: JoinCriterion; label: string; met: boolean; how: string }[]>([]);

  useEffect(() => {
    setNote('');
    if (!group || group.joinMode !== 'criteria') {
      setCheck([]);
      return;
    }
    if (!isServerId(group.id)) {
      setCheck(
        (group.criteria ?? []).map((id) => {
          const item = JOIN_CRITERIA.find((row) => row.id === id);
          return { id, label: item?.label ?? id, met: id !== 'revenue', how: item?.how ?? '' };
        }),
      );
      return;
    }
    void checkCommunityJoin(group.id).then((result) => setCheck(result.items));
  }, [group]);

  if (!group) return <Sheet visible={false} onClose={onClose} children={null} />;

  const waiting = group.membership === 'pending';
  const joined = group.membership === 'active';
  const unmet = check.length > 0 && check.some((item) => !item.met);
  const needsApproval = group.joinMode === 'request' || (group.joinMode === 'criteria' && unmet);
  const needsNote = needsApproval && !joined && !waiting;
  const seededRecent = seedThreads(group.id).slice(0, 2);
  const recent = seededRecent.length
    ? seededRecent
    : group.lastPreview
      ? [
          {
            id: 'last',
            authorName: group.lastAuthor ?? 'A builder',
            authorPhoto: group.lastAuthorPhoto,
            body: group.lastPreview,
            replyCount: 0,
          },
        ]
      : [];
  const stack = group.memberStack ?? [];

  return (
    <Sheet
      visible
      tall
      onClose={onClose}
      header={
        <View
          style={{
            minHeight: 168,
            backgroundColor: '#0E100F',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 52,
          }}
        >
          <Txt font="system" size={32} weight={700} color="#FFFFFF" lh={1.05} center>
            {group.name}
          </Txt>
        </View>
      }
    >
      <View style={{ gap: 16 }}>
        <View style={{ gap: 12 }}>
          <View
            style={{
              marginTop: -22,
              zIndex: 2,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <GroupCover group={group} size={56} round />
            <MemberChip people={stack} total={group.memberCount} />
          </View>

          {group.bio ? (
            <Txt size={15} lh={1.45}>
              {group.bio}
            </Txt>
          ) : null}

          {group.audience ? (
            <Txt size={15} lh={1.45}>
              <Txt font="system" size={15} weight={700}>
                Great for
              </Txt>
              : {group.audience}
            </Txt>
          ) : null}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
            <Chip
              label={
                group.joinMode === 'request'
                  ? 'Request to join'
                  : group.joinMode === 'criteria'
                    ? 'Match criteria'
                    : isMatchGroup(group)
                      ? 'Matched with the app'
                      : 'Anyone can join'
              }
              size="sm"
            />
            {isMatchGroup(group) && group.listingName ? (
              <Chip
                label={`Must like ${group.listingName}`}
                size="sm"
                left={
                  <AppIcon
                    hue={group.listingHue ?? group.hue ?? 128}
                    name={group.listingName}
                    uri={group.listingIcon}
                    size={16}
                  />
                }
              />
            ) : null}
            {group.ownerName ? <Chip label={`Admin: ${group.ownerName}`} size="sm" /> : null}
            {group.ratingAvg != null && group.ratingCount ? (
              <Chip
                label={`${group.ratingAvg.toFixed(1)} (${group.ratingCount.toLocaleString()})`}
                size="sm"
                left={<Ionicons name="star" size={12} color="#FFCC00" />}
              />
            ) : null}
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Label>Activity</Label>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              [String(group.weeklyActive ?? group.threadCount ?? 0), 'threads this week'],
              [group.memberCount >= 1000 ? `${(group.memberCount / 1000).toFixed(1)}k` : String(group.memberCount), 'members'],
              [lastActiveLabel(group.lastAt), 'last active'],
            ].map(([value, label]) => (
              <View
                key={label}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: c.raised,
                  borderWidth: 1,
                  borderColor: c.line,
                  gap: 3,
                }}
              >
                <Txt font="mono" size={18} weight={500}>
                  {value}
                </Txt>
                <Txt size={12} muted>
                  {label}
                </Txt>
              </View>
            ))}
          </View>
        </View>

        <GroupPower power={group.power} />

        {recent.length ? (
          <View style={{ gap: 10 }}>
            <Label>Recent threads</Label>
            {recent.map((thread) => (
              <View
                key={thread.id}
                style={{
                  padding: 14,
                  borderRadius: 16,
                  backgroundColor: c.raised,
                  borderWidth: 1,
                  borderColor: c.line,
                  gap: 6,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Avatar name={thread.authorName} uri={thread.authorPhoto} size={24} />
                  <Txt size={14} weight={600} style={{ flex: 1 }} numberOfLines={1}>
                    {thread.authorName}
                  </Txt>
                  <Txt size={12} muted>
                    {thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'}
                  </Txt>
                </View>
                <Txt size={14} lh={1.4} numberOfLines={3}>
                  {thread.body}
                </Txt>
              </View>
            ))}
          </View>
        ) : null}

        {check.length ? (
          <View style={{ gap: 8 }}>
            <Label>Your fit</Label>
            {check.map((item) => (
              <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Txt size={14.5} weight={600} color={item.met ? c.accentText : c.danger}>
                  {item.met ? '✓' : '✕'} {item.label}
                </Txt>
              </View>
            ))}
            <Txt size={13} muted>
              {unmet
                ? 'You can still request to join. Anyone in the group can approve.'
                : 'You can join without waiting for approval.'}
            </Txt>
          </View>
        ) : null}

        {needsNote ? (
          <Field
            label="Note to the group"
            value={note}
            onChangeText={setNote}
            multiline
            minHeight={80}
            placeholder="Why you want in, and what you ship"
          />
        ) : null}

        <View style={{ gap: 10 }}>
          <Btn
            label={
              joined
                ? 'Open group'
                : waiting
                  ? 'Request pending'
                  : needsApproval
                    ? 'Request to join'
                    : 'Join group'
            }
            variant="accent"
            size="lg"
            full
            disabled={waiting || busy || (needsNote && !note.trim())}
            onPress={() => onJoin(note.trim() || undefined, !needsApproval)}
          />
          {isMatchGroup(group) ? null : (
            <Btn
              label="Share link"
              variant="ghost"
              size="md"
              full
              left={<Ionicons name="link-outline" size={18} color={c.muted} />}
              onPress={() => copyGroupLink(group, toast)}
            />
          )}
        </View>
      </View>
    </Sheet>
  );
}
