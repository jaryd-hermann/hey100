import { Ionicons } from '@expo/vector-icons';
import type { Session } from '@supabase/supabase-js';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Btn } from '@/components/ui/Btn';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { OptionRow } from '@/components/ui/OptionRow';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { Label, Txt } from '@/components/ui/Txt';
import { updateMyProfile } from '@/data/repo/profile';
import { useAuth } from '@/features/auth/AuthProvider';
import { signOut } from '@/features/auth/signIn';
import { toProfilePatch } from '@/features/profile/mapProfile';
import { deleteMyAccount } from '@/data/repo/safety';
import { resetAnalytics } from '@/lib/analytics';
import { useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radii } from '@/theme/tokens';

/** The person-side onboarding answers that carry a "Visible on profile" choice. */
const VISIBILITY_FIELDS: { key: string; label: string }[] = [
  { key: 'job', label: 'Job title' },
  { key: 'workplace', label: 'Where you work' },
  { key: 'look', label: "What you're looking for" },
  { key: 'd', label: 'Devices you test on' },
];

export default function Account() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const toast = useToast();
  const store = useStore();
  const { userId, email, session } = useAuth();
  const { delete: deleteParam } = useLocalSearchParams<{ delete?: string }>();

  const [confirmDelete, setConfirmDelete] = useState(deleteParam === '1');

  const { user } = store;
  const publicUrl = `hey100.com/${user.username}`;
  const inviteUrl = `hey100.com/i/${user.referralCode}`;

  const toggleVisible = (key: string) => {
    const hidden = { ...user.hidden, [key]: !user.hidden[key] };
    store.updateUser({ hidden });

    // The switch moves straight away; only a failure is worth interrupting for.
    if (userId) {
      updateMyProfile(userId, toProfilePatch({ hidden })).catch(() =>
        toast('Could not save that. Try again.'),
      );
    }
  };

  const signOutAndLeave = async () => {
    try {
      await signOut();
    } finally {
      // Back to the splash either way: a half-signed-out session is worse than
      // asking the user to sign in again.
      router.replace('/onboarding');
    }
  };

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
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Back to Settings">
          <Ionicons name="chevron-back" size={26} color={c.ink} />
        </Pressable>
        <Txt font="mono" size={17} weight={500} style={{ flex: 1 }}>
          Account
        </Txt>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingBottom: 60, gap: 22 }}
      >
        <Card padding={16} radius={radii.cardLg} style={{ gap: 12 }}>
          <Label>Username</Label>

          <Txt font="mono" size={20} weight={500}>
            @{user.username}
          </Txt>

          <CopyRow
            value={publicUrl}
            icon="link-outline"
            onCopy={() => {
              Clipboard.setStringAsync(`https://${publicUrl}`).catch(() => {});
              toast('Link copied');
            }}
          />

          <Txt size={12.5} lh={1.4} muted>
            Your public page. Lowercase letters, numbers and underscores, up to 20 characters.
          </Txt>
        </Card>

        <View style={{ gap: 11 }}>
          <Label>In Discover, show my</Label>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(
              [
                ['username', 'Username'],
                ['realName', 'Real name'],
              ] as const
            ).map(([value, label]) => (
              <Chip
                key={value}
                label={label}
                selected={user.showAs === value}
                onPress={() => store.updateUser({ showAs: value })}
              />
            ))}
          </View>

          <Txt size={12.5} lh={1.4} muted>
            Your real name is only shown once you match and start chatting.
          </Txt>
        </View>

        <View style={{ gap: 11 }}>
          <Label>Sign-in</Label>

          <Card padding={4} radius={radii.cardLg}>
            {(
              [
                ['Email', email ?? 'Not on this account'],
                ['Sign-in method', signInMethod(session)],
              ] as const
            ).map(([label, detail], index) => (
              <View
                key={label}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 16,
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderColor: c.line,
                }}
              >
                <Txt size={15} weight={500} style={{ flex: 1 }}>
                  {label}
                </Txt>
                <Txt size={13} muted>
                  {detail}
                </Txt>
              </View>
            ))}
          </Card>
        </View>

        <View style={{ gap: 11 }}>
          <Label>Visible on profile</Label>

          <Txt size={13} lh={1.45} muted>
            Anything you hide is still used to find your matches. It just doesn&apos;t show on your
            public page.
          </Txt>

          <View style={{ gap: 9 }}>
            {VISIBILITY_FIELDS.map((field) => (
              <OptionRow
                key={field.key}
                label={field.label}
                selected={!user.hidden[field.key]}
                onPress={() => toggleVisible(field.key)}
              />
            ))}
          </View>
        </View>

        <View style={{ gap: 11 }}>
          <Label>Invite code</Label>

          <CopyRow
            value={inviteUrl}
            icon="gift-outline"
            onCopy={() => {
              Clipboard.setStringAsync(`https://${inviteUrl}`).catch(() => {});
              toast('Invite link copied');
            }}
          />

          <Txt size={12.5} lh={1.4} muted>
            You both get +3 matches when they publish a listing, up to +15. You&apos;ve earned +
            {user.bonusMatches} so far.
          </Txt>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={signOutAndLeave}
          style={({ pressed }) => ({ paddingVertical: 14, opacity: pressed ? 0.7 : 1 })}
        >
          <Txt size={15} weight={600}>
            Sign out
          </Txt>
        </Pressable>

        <View style={{ gap: 11, marginTop: 8 }}>
          <Label color={c.danger}>Danger zone</Label>

          <Card
            padding={16}
            radius={radii.cardLg}
            style={{ gap: 12, borderWidth: 1.5, borderColor: c.danger }}
          >
            <Txt size={15} weight={600}>
              Delete account
            </Txt>
            <Txt size={13} lh={1.45} muted>
              Your listings come down, matches and chats close, and feedback you left is
              anonymised. Pro keeps billing through Apple until you cancel it there.
            </Txt>
            <Pressable
              accessibilityRole="button"
              onPress={() => setConfirmDelete(true)}
              style={({ pressed }) => ({
                alignSelf: 'flex-start',
                paddingVertical: 10,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Txt size={15} weight={600} color={c.danger}>
                Delete my account
              </Txt>
            </Pressable>
          </Card>
        </View>
      </ScrollView>

      <Sheet visible={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <View style={{ gap: 16 }}>
          <Txt font="mono" size={18} weight={500}>
            Delete your account?
          </Txt>

          <Txt size={14} lh={1.5} muted>
            Your listings come down, your matches and chats close, and the feedback you gave other
            builders is anonymised. This can&apos;t be undone. An active Pro subscription is billed
            by Apple until you cancel it in your Apple Account settings.
          </Txt>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void deleteMyAccount()
                .then(async () => {
                  resetAnalytics();
                  await signOut();
                  setConfirmDelete(false);
                  router.replace('/onboarding');
                })
                .catch(() => toast('Could not delete the account. Try again.'));
            }}
            style={({ pressed }) => ({
              height: 56,
              borderRadius: radii.pill,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1.5,
              borderColor: c.danger,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Txt size={16} weight={600} color={c.danger}>
              Delete account
            </Txt>
          </Pressable>

          <Btn
            label="Keep my account"
            variant="ghost"
            size="md"
            full
            onPress={() => setConfirmDelete(false)}
          />
        </View>
      </Sheet>
    </View>
  );
}

function signInMethod(session: Session | null): string {
  const providers = session?.user.identities?.map((item) => item.provider) ?? [];
  const fallback = session?.user.app_metadata?.provider;
  const ids = providers.length ? providers : typeof fallback === 'string' && fallback ? [fallback] : [];
  if (!ids.length) return 'Apple, Google, GitHub or email';
  return [...new Set(ids)]
    .map((id) => {
      if (id === 'email') return 'Email';
      if (id === 'apple') return 'Apple';
      if (id === 'google') return 'Google';
      if (id === 'github') return 'GitHub';
      return id;
    })
    .join(', ');
}

function CopyRow({
  value,
  icon,
  onCopy,
}: {
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  onCopy: () => void;
}) {
  const { c } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Copy ${value}`}
      onPress={onCopy}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        backgroundColor: c.bg,
        borderRadius: radii.card,
        borderWidth: 1,
        borderColor: c.line,
        paddingHorizontal: 13,
        paddingVertical: 11,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Ionicons name={icon} size={15} color={c.muted} />
      <Txt font="mono" size={13.5} style={{ flex: 1 }} numberOfLines={1}>
        {value}
      </Txt>
      <Ionicons name="copy-outline" size={15} color={c.muted} />
    </Pressable>
  );
}
