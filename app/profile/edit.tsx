import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/AppIcon';
import { Btn } from '@/components/ui/Btn';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { OptionSheet } from '@/components/ui/OptionSheet';
import { Select } from '@/components/ui/Select';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { Label, Txt } from '@/components/ui/Txt';
import { USERNAME_PATTERN, generateUsername } from '@/features/onboarding/useOnboardingDraft';
import {
  COMPANY_SIZES,
  DEPARTMENTS,
  INDUSTRIES,
  YEARS_EXPERIENCE,
} from '@/features/onboarding/steps';
import { BIO_MAX, EDITABLE_GROUPS, SOCIAL_FIELDS } from '@/features/profile/fields';
import { updateMyProfile } from '@/data/repo/profile';
import { useAuth } from '@/features/auth/AuthProvider';
import { pickAvatar, uploadAvatar } from '@/features/profile/avatar';
import { toProfilePatch } from '@/features/profile/mapProfile';
import { useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { layout } from '@/theme/tokens';

/** Keeps the editor's socials keyed by network, which is how it renders them. */
function toMap(socials: [kind: string, value: string][]): Record<string, string> {
  return Object.fromEntries(socials);
}

export default function EditProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const toast = useToast();
  const store = useStore();
  const { userId } = useAuth();

  const { user } = store;

  const [realName, setRealName] = useState(user.realName);
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio);
  const [workplace, setWorkplace] = useState(user.workplace);
  const [job, setJob] = useState(user.job);
  const [industry, setIndustry] = useState(user.industry);
  const [companySize, setCompanySize] = useState(user.companySize);
  const [department, setDepartment] = useState(user.department);
  const [yearsExperience, setYearsExperience] = useState(user.yearsExperience);
  const [pickingGroup, setPickingGroup] = useState<string | null>(null);
  const [socials, setSocials] = useState<Record<string, string>>(() => toMap(user.socials));
  const [tags, setTags] = useState<Record<string, string[]>>(user.tags);
  const [ownWords, setOwnWords] = useState<Record<string, string>>(user.ownWords);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState(user.photo);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Any network the user already has but the editor doesn't offer still gets a row.
  const socialRows = useMemo<[kind: string, placeholder: string][]>(() => {
    const offered = SOCIAL_FIELDS.map(([kind]) => kind);
    const extras = user.socials
      .map(([kind]) => kind)
      .filter((kind) => !offered.includes(kind))
      .map((kind) => [kind, 'link'] as [string, string]);
    return [...SOCIAL_FIELDS, ...extras];
  }, [user.socials]);

  const nextSocials = socialRows
    .map(([kind]) => [kind, (socials[kind] ?? '').trim()] as [string, string])
    .filter(([, value]) => !!value);

  const nameOk = !!realName.trim();
  const usernameOk = USERNAME_PATTERN.test(username);

  const photoDirty = photo !== user.photo;
  const dirty =
    photoDirty ||
    realName.trim() !== user.realName ||
    username !== user.username ||
    bio.trim() !== user.bio ||
    workplace.trim() !== user.workplace ||
    job.trim() !== user.job ||
    industry !== user.industry ||
    companySize !== user.companySize ||
    department !== user.department ||
    yearsExperience !== user.yearsExperience ||
    JSON.stringify(nextSocials) !== JSON.stringify(user.socials) ||
    JSON.stringify(tags) !== JSON.stringify(user.tags) ||
    JSON.stringify(ownWords) !== JSON.stringify(user.ownWords);

  const toggleTag = (group: string, option: string) =>
    setTags((prev) => {
      const current = prev[group] ?? [];
      const cap = EDITABLE_GROUPS.find((row) => row.group === group)?.max;
      if (!current.includes(option) && cap && current.length >= cap) {
        toast(`Pick up to ${cap}`);
        return prev;
      }
      return {
        ...prev,
        [group]: current.includes(option)
          ? current.filter((item) => item !== option)
          : [...current, option],
      };
    });

  const persistPhoto = async (ownerId: string, uri: string) => {
    const url = await uploadAvatar(ownerId, uri);
    if (!url) throw new Error('upload failed');
    await updateMyProfile(ownerId, { photo_url: url });
    return url;
  };

  /**
   * The photo saves on its own rather than waiting for Save, because an upload
   * that only lands on a later button press is a photo the user thinks is lost.
   */
  const changePhoto = async () => {
    if (uploadingPhoto) return;

    const picked = await pickAvatar();
    if (!picked) return;
    if ('error' in picked) {
      toast(picked.error);
      return;
    }

    setPhoto(picked.uri);
    if (!userId) return;

    setUploadingPhoto(true);
    try {
      const url = await persistPhoto(userId, picked.uri);
      setPhoto(url);
      store.updateUser({ photo: url });
      toast('Photo saved');
    } catch {
      toast('Could not save that photo. Tap Save to try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const cancel = () => {
    if (dirty) {
      setConfirmDiscard(true);
      return;
    }
    router.back();
  };

  const save = async () => {
    if (!nameOk) {
      toast('Add your name');
      return;
    }
    if (!usernameOk) {
      toast('Pick a username to continue');
      return;
    }
    if (saving) return;
    if (uploadingPhoto) {
      toast('Still uploading your photo');
      return;
    }
    if (!dirty) {
      router.back();
      return;
    }

    const edits = {
      realName: realName.trim(),
      username,
      bio: bio.trim(),
      workplace: workplace.trim(),
      job: job.trim(),
      industry,
      companySize,
      department,
      yearsExperience,
      socials: nextSocials,
      tags,
      ownWords,
    };

    setSaving(true);
    try {
      let nextPhoto = photo;
      if (userId && photoDirty && photo && !/^https?:\/\//i.test(photo)) {
        nextPhoto = await persistPhoto(userId, photo);
        setPhoto(nextPhoto);
      }

      // The server first, so "Profile saved" is never shown for a write that
      // the database refused.
      if (userId) {
        await updateMyProfile(
          userId,
          toProfilePatch({ ...edits, ...(photoDirty ? { photo: nextPhoto } : {}) }),
        );
      }

      store.updateUser({ ...edits, ...(photoDirty ? { photo: nextPhoto } : {}) });
      toast('Profile saved');
      router.back();
    } catch (error) {
      toast(
        (error as { code?: string }).code === '23505'
          ? 'That username is taken'
          : 'Could not save. Try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  const canSave = nameOk && usernameOk && !saving && !uploadingPhoto;

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
        <Pressable onPress={cancel} hitSlop={12} accessibilityLabel="Cancel editing">
          <Txt size={15} weight={500} muted>
            Cancel
          </Txt>
        </Pressable>

        <Txt font="mono" size={17} weight={500} style={{ flex: 1, textAlign: 'center' }}>
          Edit profile
        </Txt>

        <Pressable onPress={save} hitSlop={12} accessibilityLabel="Save profile">
          <Txt size={15} weight={600} color={canSave ? c.accentText : c.muted}>
            Save
          </Txt>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingBottom: 60, gap: 24 }}
      >
        <View style={{ alignItems: 'center', paddingTop: 6, gap: 10 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={photo ? 'Change your photo' : 'Add a photo'}
            onPress={() => void changePhoto()}
            style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
          >
            <Avatar name={realName || user.realName} uri={photo} size={76} />
          </Pressable>
          <Txt size={13} weight={500} color={c.accentText}>
            {uploadingPhoto ? 'Uploading…' : photo ? 'Change photo' : 'Add a photo'}
          </Txt>
        </View>

        <Field
          label="Your name"
          value={realName}
          onChangeText={setRealName}
          placeholder="Your name"
          hint="Only shown once you match and start chatting."
        />

        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Label style={{ flex: 1 }}>Username</Label>
            <Pressable
              onPress={() => setUsername(generateUsername())}
              hitSlop={10}
              accessibilityLabel="Shuffle username"
            >
              <Txt size={13} weight={600} color={c.accentText}>
                ↻ Shuffle
              </Txt>
            </Pressable>
          </View>

          <Field
            value={username}
            onChangeText={(next) => setUsername(next.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            autoCapitalize="none"
            autoCorrect={false}
            mono
            max={20}
            placeholder="username"
            hint={
              usernameOk
                ? `Your public page is hey100.com/${username}`
                : 'Lowercase letters, numbers and underscores, up to 20 characters.'
            }
          />
        </View>

        <Field
          label="Bio"
          value={bio}
          onChangeText={setBio}
          placeholder="What are you building, and how do you test?"
          multiline
          minHeight={118}
          max={BIO_MAX}
          hint="The intro at the top of your profile."
        />

        <View style={{ gap: 11 }}>
          <Label>Socials</Label>
          <Txt size={13} lh={1.45} muted>
            Tapping one on your profile opens it without leaving Hey100. Leave a network blank to
            drop it.
          </Txt>

          {socialRows.map(([kind, placeholder]) => (
            <Field
              key={kind}
              label={kind}
              value={socials[kind] ?? ''}
              onChangeText={(value) => setSocials((prev) => ({ ...prev, [kind]: value }))}
              placeholder={placeholder}
              autoCapitalize="none"
              autoCorrect={false}
              mono
            />
          ))}
        </View>

        <View style={{ gap: 12 }}>
          <Label>Day job</Label>

          <Select
            label="Industry"
            value={industry}
            placeholder="The market you work in"
            options={INDUSTRIES}
            optional
            onChange={setIndustry}
          />

          <Field
            label="Where do you work?"
            value={workplace}
            onChangeText={setWorkplace}
            placeholder="The company, studio, or “indie”."
            multiline
            minHeight={72}
          />

          <Select
            label="Company size"
            value={companySize}
            placeholder="How big is the team"
            options={COMPANY_SIZES}
            optional
            onChange={setCompanySize}
          />

          <Select
            label="Department"
            value={department}
            placeholder="Engineering, design, marketing…"
            options={DEPARTMENTS}
            optional
            onChange={setDepartment}
          />

          <Field
            label="What's your job title?"
            value={job}
            onChangeText={setJob}
            placeholder="Full-time indie? Say that."
            multiline
            minHeight={72}
          />

          <Select
            label="Years of experience"
            value={yearsExperience}
            placeholder="How long you've been at it"
            options={YEARS_EXPERIENCE}
            optional
            onChange={setYearsExperience}
          />
        </View>

        {EDITABLE_GROUPS.map((group) => (
          <View key={group.group} style={{ gap: 11 }}>
            <Label>{group.label}</Label>
            <Txt size={13} lh={1.45} muted>
              {group.title}
            </Txt>

            {group.search ? (
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {(tags[group.group] ?? []).map((option) => (
                    <Chip
                      key={option}
                      label={option}
                      selected
                      onPress={() => toggleTag(group.group, option)}
                    />
                  ))}
                </View>
                <Chip
                  label={group.max ? `Add · up to ${group.max}` : 'Add'}
                  onPress={() => setPickingGroup(group.group)}
                />
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {group.opts.map((option) => (
                  <Chip
                    key={option}
                    label={option}
                    selected={(tags[group.group] ?? []).includes(option)}
                    onPress={() => toggleTag(group.group, option)}
                  />
                ))}
              </View>
            )}

            {group.own ? (
              <Field
                value={ownWords[group.group] ?? ''}
                onChangeText={(text) => setOwnWords((prev) => ({ ...prev, [group.group]: text }))}
                placeholder="In your own words"
                multiline
                minHeight={92}
              />
            ) : null}
          </View>
        ))}

        <Txt size={12.5} lh={1.45} muted>
          Anything you hide under Settings → Account is still used to find your matches. It just
          doesn&apos;t show on your public page.
        </Txt>
      </ScrollView>

      <Sheet visible={confirmDiscard} onClose={() => setConfirmDiscard(false)}>
        <View style={{ gap: 16 }}>
          <Txt font="mono" size={18} weight={500}>
            Discard your changes?
          </Txt>

          <Txt size={14} lh={1.5} muted>
            Your profile stays exactly as it was before you started editing.
          </Txt>

          <Btn
            label="Discard changes"
            variant="surface"
            size="md"
            full
            onPress={() => {
              setConfirmDiscard(false);
              router.back();
            }}
          />

          <Btn
            label="Keep editing"
            variant="ghost"
            size="md"
            full
            onPress={() => setConfirmDiscard(false)}
          />
        </View>
      </Sheet>

      {EDITABLE_GROUPS.filter((group) => group.search).map((group) => (
        <OptionSheet
          key={group.group}
          visible={pickingGroup === group.group}
          onClose={() => setPickingGroup(null)}
          title={group.title}
          options={[...new Set([...group.opts, ...(tags[group.group] ?? [])])]}
          selected={tags[group.group] ?? []}
          max={group.max}
          onToggle={(option) => toggleTag(group.group, option)}
        />
      ))}
    </View>
  );
}
