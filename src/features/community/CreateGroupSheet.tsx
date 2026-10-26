import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Btn } from '@/components/ui/Btn';
import { Field } from '@/components/ui/Field';
import { Label, Txt } from '@/components/ui/Txt';
import {
  createCommunityGroup,
  JOIN_CRITERIA,
  uploadGroupCover,
  type JoinCriterion,
  type JoinMode,
} from '@/data/repo/community';
import { pickAvatar } from '@/features/profile/avatar';
import { useAuth } from '@/features/auth/AuthProvider';
import { captureEvent } from '@/lib/analytics';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/theme/ThemeProvider';

export function CreateGroupForm({
  onCreated,
  onClose,
}: {
  onCreated: (groupId: string) => void;
  onClose?: () => void;
}) {
  const { c } = useTheme();
  const toast = useToast();
  const { userId } = useAuth();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [audience, setAudience] = useState('');
  const [cover, setCover] = useState<string | null>(null);
  const [joinMode, setJoinMode] = useState<JoinMode>('open');
  const [criteria, setCriteria] = useState<JoinCriterion[]>([]);
  const [busy, setBusy] = useState(false);

  const pickCover = async () => {
    const picked = await pickAvatar();
    if (!picked) return;
    if ('error' in picked) {
      toast(picked.error);
      return;
    }
    setCover(picked.uri);
  };

  const submit = async () => {
    if (!name.trim() || !userId || busy) return;
    setBusy(true);
    try {
      const coverPath = cover ? await uploadGroupCover(userId, cover) : undefined;
      const id = await createCommunityGroup({
        name: name.trim(),
        bio: bio.trim(),
        audience: audience.trim(),
        coverPath: coverPath ?? undefined,
        joinMode,
        criteria,
      });
      setName('');
      setBio('');
      setAudience('');
      setCover(null);
      setJoinMode('open');
      setCriteria([]);
      captureEvent('group_created', { join_mode: joinMode, has_cover: !!coverPath });
      onCreated(id);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not create the group');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: 16 }}>
      {onClose ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
            <Ionicons name="close" size={24} color={c.ink} />
          </Pressable>
        </View>
      ) : null}
      <Pressable onPress={() => void pickCover()} style={{ alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 104,
            height: 104,
            borderRadius: 27,
            backgroundColor: cover ? c.raised : c.surface,
            borderWidth: cover ? 3 : 1.5,
            borderColor: cover ? c.bg : c.line,
            borderStyle: cover ? 'solid' : 'dashed',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {cover ? (
            <Image source={{ uri: cover }} style={{ width: 104, height: 104 }} />
          ) : (
            <Txt size={34} muted>
              +
            </Txt>
          )}
        </View>
        <Txt size={13.5} muted>
          {cover ? 'Change image' : 'Add image · optional'}
        </Txt>
      </Pressable>

      <Field
        label="Name"
        value={name}
        onChangeText={(value) => setName(value.slice(0, 40))}
        max={40}
        placeholder="e.g. Indie Fitness Apps"
      />
      <Field
        label="Bio"
        value={bio}
        onChangeText={(value) => setBio(value.slice(0, 160))}
        max={160}
        multiline
        minHeight={96}
        placeholder="What do people talk about here?"
      />

      <View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Label>This group is for</Label>
          <Txt size={12.5} muted>
            Optional
          </Txt>
        </View>
        <Field
          value={audience}
          onChangeText={(value) => setAudience(value.slice(0, 60))}
          placeholder="e.g. Builders with a live fitness app"
        />
      </View>

      <View style={{ gap: 10 }}>
        <Label>Who can join</Label>
        {(
          [
            ['open', 'Anyone can join', 'Builders join instantly'],
            ['request', 'Request to join', 'They write a note. Anyone in the group can approve.'],
            ['criteria', 'If they match this criteria', 'They can join without approval if they match. They still tap Join.'],
          ] as const
        ).map(([mode, label, desc]) => {
          const on = joinMode === mode;
          return (
            <Pressable
              key={mode}
              onPress={() => setJoinMode(mode)}
              style={{
                minHeight: 64,
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: on ? c.ink : c.line,
                backgroundColor: on ? c.raised : c.surface,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <View style={{ flex: 1, gap: 3 }}>
                <Txt size={15.5} weight={600}>
                  {label}
                </Txt>
                <Txt size={13.5} muted>
                  {desc}
                </Txt>
              </View>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  borderWidth: 2,
                  borderColor: on ? c.ink : c.muted,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: on ? c.ink : 'transparent',
                  }}
                />
              </View>
            </Pressable>
          );
        })}
      </View>

      {joinMode === 'criteria' ? (
        <View style={{ gap: 8 }}>
          {JOIN_CRITERIA.map((item) => {
            const on = criteria.includes(item.id);
            return (
              <Pressable
                key={item.id}
                onPress={() =>
                  setCriteria((prev) => (on ? prev.filter((id) => id !== item.id) : [...prev, item.id]))
                }
                style={{
                  minHeight: 52,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: on ? c.ink : c.line,
                  backgroundColor: on ? c.raised : c.surface,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: on ? c.ink : c.muted,
                    backgroundColor: on ? c.ink : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {on ? (
                    <Txt size={13} weight={700} color={c.bg}>
                      ✓
                    </Txt>
                  ) : null}
                </View>
                <Txt size={15} weight={600} style={{ flex: 1 }}>
                  {item.label}
                </Txt>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <Txt size={13.5} lh={1.45} muted>
        You'll be the group admin. You approve requests and can remove posts.
      </Txt>

      <Btn
        label={busy ? 'Creating…' : 'Create group'}
        variant="accent"
        size="lg"
        full
        disabled={!name.trim() || busy || (joinMode === 'criteria' && !criteria.length)}
        onPress={() => void submit()}
      />
    </View>
  );
}
