import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Avatar } from '@/components/ui/AppIcon';
import { Card } from '@/components/ui/Card';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { Txt } from '@/components/ui/Txt';
import { queryKeys } from '@/data/repo/keys';
import {
  fetchBuilderPublicGroups,
  joinCommunityGroup,
  type CommunityGroup,
} from '@/data/repo/community';
import { blockUser, reportContent } from '@/data/repo/safety';
import { GroupCover } from '@/features/community/GroupCover';
import { GroupCoverSheet } from '@/features/community/GroupCoverSheet';
import { useAuth } from '@/features/auth/AuthProvider';
import { ReportSheet } from '@/features/safety/ReportSheet';
import { shortName } from '@/data/mock';
import type { AppListing, OwnedApp } from '@/data/types';
import { recordProfileView } from '@/data/repo/notifications';
import {
  ChipRow,
  ShippedProductsTray,
  VerifiedStatsRow,
  useBuilderProducts,
  useOpenShippedApp,
  verifiedMoney,
} from '@/features/profile/BuilderBits';
import { VerifiedBadge } from '@/components/brand/Marks';
import { builderFromUser, publicRole } from '@/features/profile/builderCard';
import { KarmaChip } from '@/features/profile/KarmaCard';
import { isVerified, useMyKarma } from '@/features/profile/karma';
import { isServerId } from '@/lib/supabase';
import { useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

type SocialRow = [kind: string, value: string, icon: React.ComponentProps<typeof Ionicons>['name']];

const SOCIAL_ICONS: Record<string, SocialRow[2]> = {
  X: 'logo-twitter',
  GitHub: 'logo-github',
  LinkedIn: 'logo-linkedin',
  Instagram: 'logo-instagram',
  TikTok: 'logo-tiktok',
  YouTube: 'logo-youtube',
  Discord: 'logo-discord',
  Web: 'globe-outline',
};

export type BuilderSheetProps = {
  visible: boolean;
  listing: AppListing | OwnedApp | null;
  onClose: () => void;
  onOpenLink: (kind: string, value: string) => void;
};

/**
 * The developer sheet. Before a match this shows whatever the builder chose to
 * display in Discover, which may be a username rather than their real name.
 */
export function BuilderSheet({
  visible,
  listing,
  onClose,
  onOpenLink,
}: BuilderSheetProps) {
  const { c } = useTheme();
  const toast = useToast();
  const router = useRouter();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const store = useStore();
  const mineKarma = useMyKarma();
  const [reportOpen, setReportOpen] = useState(false);
  const [preview, setPreview] = useState<CommunityGroup | null>(null);
  const [joining, setJoining] = useState(false);
  const pending = useRef<
    null | { kind: 'group'; id: string } | { kind: 'preview'; group: CommunityGroup }
  >(null);

  const flushPending = () => {
    const next = pending.current;
    pending.current = null;
    if (next?.kind === 'group') {
      router.push({ pathname: '/group/[id]', params: { id: next.id } });
    }
    if (next?.kind === 'preview') {
      setPreview(next.group);
    }
  };
  const mine = !!listing && store.ownedApps.some((app) => app.id === listing.id);
  const builderId = mine ? userId : listing?.ownerId;
  const { data: groups = [] } = useQuery({
    queryKey: queryKeys.builderGroups(builderId ?? null),
    queryFn: () => fetchBuilderPublicGroups(builderId!),
    enabled: visible && !!builderId,
  });
  const products = useBuilderProducts(listing, mine);
  const openApp = useOpenShippedApp();

  useEffect(() => {
    if (!visible || !listing || mine || !isServerId(listing.id)) return;
    void recordProfileView(listing.id);
  }, [listing, mine, visible]);

  if (!listing) return <Sheet visible={false} onClose={onClose} children={null} />;
  const card = mine ? { ...listing, ...builderFromUser(store.user) } : listing;
  const role = publicRole(card.role);
  const socials: SocialRow[] = (mine ? store.user.socials : (listing.builderSocials ?? []))
    .filter(([, value]) => !!value)
    .map(([kind, value]) => [kind, value, SOCIAL_ICONS[kind] ?? 'globe-outline']);

  const commits = mine ? store.user.githubCommits : listing.githubCommits;
  const verified = verifiedMoney(
    listing,
    mine
      ? store.ownedApps.flatMap((app) => Object.values(store.connections[app.id] ?? {}))
      : [],
  );

  return (
    <>
    <Sheet
      visible={visible && !reportOpen && !preview}
      onClose={() => {
        pending.current = null;
        setPreview(null);
        onClose();
      }}
      onClosed={flushPending}
    >
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Avatar name={card.builder} uri={card.builderPhoto} size={60} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Txt size={19} weight={700} style={{ flexShrink: 1 }}>
                {card.builder}
              </Txt>
              {(mine ? mineKarma.verified : listing.builderKarma != null && isVerified(listing.builderKarma)) ? (
                <VerifiedBadge size={16} />
              ) : null}
            </View>
            {role ? (
              <Txt size={13.5} muted>
                {role}
              </Txt>
            ) : null}
            {(mine ? mineKarma.karma : listing.builderKarma) != null ? (
              <View style={{ marginTop: 6 }}>
                <KarmaChip
                  karma={mine ? mineKarma.karma : listing.builderKarma!}
                  verified={
                    mine
                      ? mineKarma.verified
                      : listing.builderKarma != null && isVerified(listing.builderKarma)
                  }
                />
              </View>
            ) : null}
            <Txt size={13.5} muted style={{ marginTop: 2 }}>
              Building {shortName(listing.name)}
            </Txt>
          </View>
        </View>

        {card.style ? (
          <Card tone="soft" padding={14}>
            <Txt size={14} lh={1.45} color={c.accentText}>
              {card.style}
            </Txt>
          </Card>
        ) : null}

        <ShippedProductsTray
          apps={products}
          onOpen={(app) => {
            onClose();
            setTimeout(() => openApp(app), 240);
          }}
        />

        {verified.revenue || verified.customers || commits != null ? (
          <Card padding={16}>
            <VerifiedStatsRow
              revenue={verified.revenue}
              customers={verified.customers}
              commits={commits}
            />
          </Card>
        ) : null}

        <ChipRow label="Skills" items={card.skills ?? []} />
        <ChipRow label="Apps I'd try" items={card.interests ?? []} />

        {groups.length ? (
          <View style={{ gap: 8 }}>
            <Txt size={12} muted>
              Groups
            </Txt>
            {groups.map((group) => (
              <Pressable
                key={group.id}
                onPress={() => {
                  pending.current =
                    group.membership === 'active'
                      ? { kind: 'group', id: group.id }
                      : { kind: 'preview', group };
                  onClose();
                }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: 12,
                  height: 52,
                  borderRadius: radii.option,
                  backgroundColor: c.surface,
                  borderWidth: 1,
                  borderColor: c.line,
                  opacity: pressed ? 0.75 : 1,
                })}
              >
                <GroupCover group={group} size={32} />
                <Txt size={14.5} weight={500} style={{ flex: 1 }} numberOfLines={1}>
                  {group.name}
                </Txt>
                <Ionicons name="chevron-forward" size={16} color={c.muted} />
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={{ gap: 8 }}>
          {socials.map(([kind, value, icon]) => (
            <Pressable
              key={kind}
              accessibilityRole="button"
              onPress={() => onOpenLink(kind, value)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 15,
                height: 52,
                borderRadius: radii.option,
                backgroundColor: c.surface,
                borderWidth: 1,
                borderColor: c.line,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Ionicons name={icon} size={18} color={c.ink} />
              <Txt size={14.5} weight={500} style={{ flex: 1 }}>
                {kind}
              </Txt>
              <Txt size={13} muted numberOfLines={1} style={{ maxWidth: 150 }}>
                {value}
              </Txt>
              <Ionicons name="chevron-forward" size={16} color={c.muted} />
            </Pressable>
          ))}
        </View>

        {!mine && listing.ownerId ? (
          <View style={{ gap: 8, marginTop: 8 }}>
            <Pressable
              onPress={() => setReportOpen(true)}
              style={({ pressed }) => ({
                height: 52,
                borderRadius: radii.option,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: c.surface,
                borderWidth: 1,
                borderColor: c.line,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Txt size={15} weight={600}>
                Report
              </Txt>
            </Pressable>
            <Pressable
              onPress={() => {
                void blockUser(listing.ownerId!)
                  .then(() => {
                    void queryClient.invalidateQueries({ queryKey: queryKeys.blocked(userId) });
                    void queryClient.invalidateQueries({ queryKey: queryKeys.deck(userId) });
                    void queryClient.invalidateQueries({ queryKey: queryKeys.threads(userId) });
                    void queryClient.invalidateQueries({ queryKey: queryKeys.heys(userId) });
                    toast('Blocked. They can no longer find or message you.');
                    onClose();
                  })
                  .catch(() => toast('Could not block'));
              }}
              style={({ pressed }) => ({
                height: 52,
                borderRadius: radii.option,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Txt size={15} weight={600} color={c.danger}>
                Block
              </Txt>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Sheet>
    <GroupCoverSheet
      group={preview}
      busy={joining}
      onClose={() => setPreview(null)}
      onClosed={flushPending}
      onJoin={(note, skipApproval) => {
        if (!preview || !userId || joining) return;
        setJoining(true);
        void joinCommunityGroup(preview, userId, note)
          .then((status) => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.communityHome(userId) });
            void queryClient.invalidateQueries({ queryKey: queryKeys.builderGroups(builderId ?? null) });
            if (status === 'active' || skipApproval) {
              pending.current = { kind: 'group', id: preview.id };
            } else {
              toast('Request sent. Anyone in the group can let you in.');
            }
            setPreview(null);
          })
          .catch(() => toast('Could not join'))
          .finally(() => setJoining(false));
      }}
    />
    <ReportSheet
      visible={reportOpen}
      title={`Report ${card.builder}`}
      onClose={() => setReportOpen(false)}
      onPick={(reason) => {
        setReportOpen(false);
        onClose();
        void reportContent({
          type: 'listing',
          id: listing.id,
          reason,
          userId: listing.ownerId,
        })
          .then(() => toast('Report sent to the Hey100 team'))
          .catch(() => toast('Could not send the report'));
      }}
    />
    </>
  );
}
