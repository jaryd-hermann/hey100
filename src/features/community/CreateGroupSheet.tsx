import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { Btn } from '@/components/ui/Btn';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { Identicon } from '@/components/ui/Identicon';
import { Label, Txt } from '@/components/ui/Txt';
import {
  createCommunityGroup,
  identiconCoverPath,
  JOIN_CRITERIA,
  updateCommunityGroup,
  uploadGroupCover,
  type CommunityGroup,
  type JoinCriterion,
  type JoinMode,
} from '@/data/repo/community';
import { pickAvatar } from '@/features/profile/avatar';
import { useAuth } from '@/features/auth/AuthProvider';
import { captureEvent } from '@/lib/analytics';
import { isServerId } from '@/lib/supabase';
import { useStore } from '@/store/AppStore';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/theme/ThemeProvider';

export function CreateGroupForm({
  group,
  onCreated,
  onClose,
}: {
  group?: CommunityGroup | null;
  onCreated: (groupId: string) => void;
  onClose?: () => void;
}) {
  const { c } = useTheme();
  const toast = useToast();
  const { userId } = useAuth();
  const store = useStore();
  const listings = store.ownedApps.filter((app) => isServerId(app.id));
  const editing = !!group;
  const [name, setName] = useState(group?.name ?? '');
  const [bio, setBio] = useState(group?.bio ?? '');
  const [audience, setAudience] = useState(group?.audience ?? '');
  const [cover, setCover] = useState<string | null>(group?.coverUrl ?? null);
  const [iconSeed, setIconSeed] = useState<string | null>(group?.iconSeed ?? null);
  const [coverDirty, setCoverDirty] = useState(false);
  const [joinMode, setJoinMode] = useState<JoinMode>(group?.joinMode ?? 'open');
  const [criteria, setCriteria] = useState<JoinCriterion[]>(group?.criteria ?? []);
  const [listingId, setListingId] = useState<string | null>(
    group?.listingId ?? listings[0]?.id ?? null,
  );
  const [busy, setBusy] = useState(false);
  const listing = listings.find((app) => app.id === listingId) ?? listings[0];

  const pickCover = async () => {
    const picked = await pickAvatar();
    if (!picked) return;
    if ('error' in picked) {
      toast(picked.error);
      return;
    }
    setCover(picked.uri);
    setCoverDirty(true);
  };

  const submit = async () => {
    if (!name.trim() || !userId || busy) return;
    setBusy(true);
    try {
      const generatedSeed = iconSeed || name.trim() || 'new-group';
      const uploaded = cover && coverDirty && !cover.startsWith('identicon:')
        ? await uploadGroupCover(userId, cover)
        : null;
      const nextCover =
        uploaded ??
        (coverDirty || !editing ? identiconCoverPath(generatedSeed) : undefined);
      if (editing && group) {
        await updateCommunityGroup(group.id, {
          name: name.trim(),
          bio: bio.trim(),
          audience: audience.trim(),
          coverPath: nextCover,
          joinMode,
          criteria,
          listingId: joinMode === 'match' ? listing?.id : undefined,
        });
        captureEvent('group_updated', { group_id: group.id, join_mode: joinMode });
        onCreated(group.id);
        return;
      }
      const id = await createCommunityGroup({
        name: name.trim(),
        bio: bio.trim(),
        audience: audience.trim(),
        coverPath: nextCover ?? identiconCoverPath(generatedSeed),
        joinMode,
        criteria,
        listingId: joinMode === 'match' ? listing?.id : undefined,
      });
      setName('');
      setBio('');
      setAudience('');
      setCover(null);
      setIconSeed(null);
      setCoverDirty(false);
      setJoinMode('open');
      setCriteria([]);
      setListingId(listings[0]?.id ?? null);
      captureEvent('group_created', { join_mode: joinMode, has_cover: !!cover });
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
      <View style={{ alignItems: 'center', gap: 10 }}>
        <Pressable onPress={() => void pickCover()} accessibilityLabel="Replace group icon">
          <View
            style={{
              width: 104,
              height: 104,
              borderRadius: 27,
              backgroundColor: cover ? c.raised : c.surface,
              borderWidth: cover ? 3 : 0,
              borderColor: cover ? c.bg : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {cover ? (
              <Image source={{ uri: cover }} style={{ width: 104, height: 104 }} />
            ) : (
              <Identicon seed={iconSeed || name.trim() || 'new-group'} size={104} radius={27} />
            )}
          </View>
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Pressable onPress={() => void pickCover()} hitSlop={8}>
            <Txt size={13.5} muted>
              {cover ? 'Change image' : 'Tap to replace'}
            </Txt>
          </Pressable>
          {cover ? (
            <Pressable
              onPress={() => {
                setCover(null);
                setCoverDirty(true);
              }}
              hitSlop={8}
            >
              <Txt size={13.5} muted>
                Use generated
              </Txt>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => {
                setIconSeed(`${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
                setCoverDirty(true);
              }}
              hitSlop={8}
              accessibilityLabel="Shuffle generated icon"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
            >
              <Ionicons name="shuffle-outline" size={15} color={c.muted} />
              <Txt size={13.5} muted>
                Shuffle
              </Txt>
            </Pressable>
          )}
        </View>
      </View>

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
            ['match', 'Private: Only people who match with my app', 'Nobody else can see it'],
          ] as const
        ).map(([mode, label, desc]) => {
          const on = joinMode === mode;
          return (
            <Pressable
              key={mode}
              onPress={() => {
                if (mode === 'match' && !listings.length) {
                  toast('Publish a listing first to make a private match group');
                  return;
                }
                setJoinMode(mode);
                if (mode === 'match' && listings.length === 1) setListingId(listings[0].id);
              }}
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
                {mode === 'match' && on && listing ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <Txt size={13.5} weight={600}>
                      Must like
                    </Txt>
                    <AppIcon hue={listing.hue} name={listing.name} uri={listing.icon} size={22} />
                  </View>
                ) : null}
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

      {joinMode === 'match' && listings.length > 1 ? (
        <View style={{ gap: 8 }}>
          <Label>Which app</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {listings.map((app) => (
              <Chip
                key={app.id}
                label={app.name}
                selected={listingId === app.id}
                onPress={() => setListingId(app.id)}
                left={<AppIcon hue={app.hue} name={app.name} uri={app.icon} size={18} />}
              />
            ))}
          </View>
        </View>
      ) : null}

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

      {editing ? null : (
        <Txt size={13.5} lh={1.45} muted>
          You'll be the group admin. You approve requests and can remove posts.
        </Txt>
      )}

      <Btn
        label={busy ? (editing ? 'Saving…' : 'Creating…') : editing ? 'Save changes' : 'Create group'}
        variant="accent"
        size="lg"
        full
        disabled={
          !name.trim() ||
          busy ||
          (joinMode === 'criteria' && !criteria.length) ||
          (joinMode === 'match' && !listing)
        }
        onPress={() => void submit()}
      />
    </View>
  );
}
