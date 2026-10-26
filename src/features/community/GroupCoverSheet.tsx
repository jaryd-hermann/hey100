import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Avatar } from '@/components/ui/AppIcon';
import { Btn } from '@/components/ui/Btn';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { Label, Txt } from '@/components/ui/Txt';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import {
  checkCommunityJoin,
  JOIN_CRITERIA,
  type CommunityGroup,
  type JoinCriterion,
} from '@/data/repo/community';
import { isServerId } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';

import { GroupCover } from './GroupCover';
import { GroupPower } from './GroupPower';
import { copyGroupLink } from './shareGroup';
import { firstName, shortWhen } from './time';
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
  const subtitle = group.audience || group.bio;

  return (
    <Sheet visible tall onClose={onClose}>
      <View style={{ gap: 16 }}>
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <GroupCover group={group} size={62} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt
                font="mono"
                size={18}
                weight={500}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {group.name}
              </Txt>
              {subtitle ? (
                <Txt size={14.5} muted numberOfLines={1}>
                  {subtitle}
                </Txt>
              ) : null}
            </View>
            <Pressable
              onPress={() => copyGroupLink(group, toast)}
              hitSlop={12}
              accessibilityLabel="Copy group link"
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="link-outline" size={20} color={c.ink} />
            </Pressable>
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
            {group.ownerName ? <Chip label={group.ownerName} size="sm" /> : null}
            {group.ratingAvg != null && group.ratingCount ? (
              <Chip
                label={`${group.ratingAvg.toFixed(1)} (${group.ratingCount.toLocaleString()})`}
                size="sm"
                left={<Ionicons name="star" size={12} color="#FFCC00" />}
              />
            ) : null}
          </View>

          {group.bio && group.audience ? (
            <Txt size={15} lh={1.45} muted>
              {group.bio}
            </Txt>
          ) : null}
        </View>

        <View style={{ gap: 8 }}>
          <Label>Activity</Label>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              [String(group.weeklyActive ?? group.threadCount ?? 0), 'threads this week'],
              [group.memberCount >= 1000 ? `${(group.memberCount / 1000).toFixed(1)}k` : String(group.memberCount), 'members'],
              [shortWhen(group.lastAt) || '—', 'last active'],
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

        {stack.length ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flexDirection: 'row' }}>
              {stack.map((person, index) => (
                <View key={`${person.name}-${index}`} style={{ marginLeft: index ? -8 : 0 }}>
                  <Avatar name={person.name} uri={person.photo} size={30} />
                </View>
              ))}
            </View>
            <Txt size={14} muted>
              {stack.map((person) => firstName(person.name)).join(', ')}
              {group.memberCount > stack.length ? ` and ${group.memberCount - stack.length} others` : ''}
            </Txt>
          </View>
        ) : null}

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
      </View>
    </Sheet>
  );
}
