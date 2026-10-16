import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
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
import { useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radii } from '@/theme/tokens';

/** The person-side onboarding answers that carry a "Visible on profile" choice. */
const VISIBILITY_FIELDS: { key: string; label: string }[] = [
  { key: 'job', label: 'Job title' },
  { key: 'workplace', label: 'Where you work' },
  { key: 'look', label: "What you're looking for" },
  { key: 'l', label: 'Life outside building' },
  { key: 'd', label: 'Devices you test on' },
];

export default function Account() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const toast = useToast();
  const store = useStore();

  const [confirmDelete, setConfirmDelete] = useState(false);

  const { user } = store;
  const publicUrl = `hey100.com/${user.username}`;
  const inviteUrl = `hey100.com/i/${user.referralCode}`;

  const toggleVisible = (key: string) =>
    store.updateUser({ hidden: { ...user.hidden, [key]: !user.hidden[key] } });

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
                ['Email', 'Added when sign-in is live'],
                ['Sign-in method', 'Apple, Google or GitHub'],
              ] as const
            ).map(([label, detail], index) => (
              <Pressable
                key={label}
                accessibilityRole="button"
                onPress={() => toast('Sign-in lands with real auth')}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 16,
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderColor: c.line,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Txt size={15} weight={500} style={{ flex: 1 }}>
                  {label}
                </Txt>
                <Txt size={13} muted>
                  {detail}
                </Txt>
              </Pressable>
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

        <View style={{ gap: 2, marginTop: 4 }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => toast('Sign out lands with real auth')}
            style={({ pressed }) => ({ paddingVertical: 14, opacity: pressed ? 0.7 : 1 })}
          >
            <Txt size={15} weight={600} color={c.danger}>
              Sign out
            </Txt>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => setConfirmDelete(true)}
            style={({ pressed }) => ({ paddingVertical: 14, opacity: pressed ? 0.7 : 1 })}
          >
            <Txt size={15} weight={600} color={c.danger}>
              Delete account
            </Txt>
          </Pressable>
        </View>
      </ScrollView>

      <Sheet visible={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <View style={{ gap: 16 }}>
          <Txt font="mono" size={18} weight={500}>
            Delete your account?
          </Txt>

          <Txt size={14} lh={1.5} muted>
            Your listings come down, your matches and chats close, and the feedback you gave other
            builders is anonymised. This can&apos;t be undone.
          </Txt>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setConfirmDelete(false);
              toast('Account deletion lands with real auth');
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

          <Btn label="Keep my account" variant="ghost" size="md" full onPress={() => setConfirmDelete(false)} />
        </View>
      </Sheet>
    </View>
  );
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
