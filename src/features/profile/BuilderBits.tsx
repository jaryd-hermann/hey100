import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { Chip } from '@/components/ui/Chip';
import { Label, Txt } from '@/components/ui/Txt';
import { fetchShippedApps } from '@/data/repo/listings';
import type { AppConnection, AppListing, OwnedApp, ShippedApp } from '@/data/types';
import { shortName } from '@/data/mock';
import { useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';

export function VerifiedCaption({ noun }: { noun: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Ionicons name="checkmark-circle" size={12} color={c.accentText} />
      <Label size={10}>{noun}</Label>
    </View>
  );
}

export function verifiedMoney(
  listing: AppListing | OwnedApp,
  extra: (AppConnection | undefined)[] = [],
): { revenue?: string; customers?: string } {
  const lines = [...(listing.badges ?? []), ...extra.flatMap((row) => connectionLines(row))];
  const revenueBand = bandFrom(lines, /(\$[\d.,]+(?:\s*[–-]\s*\$?[\d.,]+)?[kKmM]?)/i);
  const customerBand = bandFrom(
    lines,
    /([\d.,]+(?:\s*[–-]\s*[\d.,]+)?[kKmM]?)\s+(?:customers|subscribers)/i,
  );
  const hasCustomers = lines.some((line) => /customer|subscriber|revenuecat/i.test(line));
  return {
    ...(revenueBand ? { revenue: revenueBand } : {}),
    ...(customerBand || hasCustomers ? { customers: customerBand ?? 'Verified' } : {}),
  };
}

function connectionLines(row?: AppConnection): string[] {
  if (!row) return [];
  return [row.badge, row.on, row.detail, ...(row.badges ?? [])].filter(
    (line): line is string => !!line,
  );
}

function bandFrom(lines: string[], pattern: RegExp): string | null {
  for (const line of lines) {
    const match = line.match(pattern);
    if (match?.[1]) return match[1].replace(/\s+/g, '');
  }
  return null;
}

function toShipped(app: Pick<AppListing | OwnedApp | ShippedApp, 'id' | 'name' | 'slug' | 'hue' | 'icon'>): ShippedApp {
  return {
    id: app.id,
    name: app.name,
    slug: app.slug,
    hue: app.hue,
    icon: app.icon,
  };
}

/** Every published app by this builder, including the one on screen. */
export function useBuilderProducts(listing: AppListing | OwnedApp | null, mine: boolean): ShippedApp[] {
  const store = useStore();
  const ownerId = listing?.ownerId;
  const { data } = useQuery({
    queryKey: ['builder-products', ownerId ?? listing?.id],
    enabled: !!listing && !mine && !!ownerId,
    queryFn: () => fetchShippedApps(ownerId as string),
    staleTime: 60_000,
  });

  if (!listing) return [];
  if (mine) {
    const apps = store.ownedApps.filter((app) => app.publishedAt || app.id === listing.id);
    return (apps.length ? apps : [listing]).map(toShipped);
  }

  const fetched = listing.shippedApps ?? data ?? [];
  if (fetched.some((app) => app.id === listing.id)) return fetched;
  return [toShipped(listing), ...fetched];
}

export function ChipRow({ label, items }: { label?: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <View style={{ gap: label ? 8 : 0 }}>
      {label ? <Label>{label}</Label> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {items.slice(0, 8).map((item) => (
          <Chip key={item} label={item} size="sm" />
        ))}
      </View>
    </View>
  );
}

export function ShippedProductsTray({
  apps,
  onOpen,
}: {
  apps: ShippedApp[];
  onOpen?: (app: ShippedApp) => void;
}) {
  if (!apps.length) return null;

  return (
    <View style={{ gap: 8 }}>
      <Label>Shipped products</Label>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingRight: 8 }}
      >
        {apps.map((app) => (
          <Pressable
            key={app.id}
            disabled={!onOpen}
            onPress={() => onOpen?.(app)}
            style={({ pressed }) => ({
              width: 76,
              alignItems: 'center',
              gap: 6,
              opacity: pressed && onOpen ? 0.7 : 1,
            })}
          >
            <AppIcon hue={app.hue} name={app.name} uri={app.icon} size={44} />
            <Txt size={11} weight={500} center numberOfLines={2}>
              {shortName(app.name)}
            </Txt>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export function useOpenShippedApp() {
  const router = useRouter();
  const store = useStore();

  return (app: ShippedApp) => {
    if (store.ownedApps.some((owned) => owned.id === app.id)) {
      router.push({ pathname: '/my-app/[id]', params: { id: app.id } });
      return;
    }
    if (app.slug) {
      router.push({ pathname: '/l/[slug]', params: { slug: app.slug } });
      return;
    }
    router.push({ pathname: '/listing/[id]', params: { id: app.id } });
  };
}

export function StatTile({ value, caption }: { value: string; caption: React.ReactNode }) {
  return (
    <View style={{ flex: 1, gap: 3 }}>
      <Txt font="mono" size={19} weight={500}>
        {value}
      </Txt>
      {typeof caption === 'string' ? <Label size={10}>{caption}</Label> : caption}
    </View>
  );
}

/** Only the stats that have actually been verified — empty tiles stay off the card. */
export function VerifiedStatsRow({
  revenue,
  customers,
  commits,
}: {
  revenue?: string;
  customers?: string;
  commits?: number | null;
}) {
  const tiles = [
    revenue ? (
      <StatTile key="revenue" value={revenue} caption={<VerifiedCaption noun="Revenue" />} />
    ) : null,
    customers ? (
      <StatTile key="customers" value={customers} caption={<VerifiedCaption noun="Customers" />} />
    ) : null,
    commits != null ? (
      <StatTile
        key="commits"
        value={commits.toLocaleString()}
        caption={<VerifiedCaption noun="Commits" />}
      />
    ) : null,
  ].filter(Boolean);

  if (!tiles.length) return null;
  return <View style={{ flexDirection: 'row' }}>{tiles}</View>;
}
