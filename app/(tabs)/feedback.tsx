import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Image } from 'expo-image';

import { Glyph, glyphs } from '@/components/brand/Glyph';
import { Screen } from '@/components/layout/Screen';
import { AppIcon, Avatar } from '@/components/ui/AppIcon';
import { Btn } from '@/components/ui/Btn';
import { Card } from '@/components/ui/Card';
import { PageTabs } from '@/components/ui/PageTabs';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { Fuzzy } from '@/components/ui/Fuzzy';
import { Txt } from '@/components/ui/Txt';
import { INBOX, shortName } from '@/data/mock';
import type { FeedbackEntry, OwnedApp } from '@/data/types';
import { firstName } from '@/features/chat/chatMeta';
import { useAuth } from '@/features/auth/AuthProvider';
import { useDevLoop } from '@/features/dev/useDevLoop';
import { edgeDates, InsightDeck, type InsightStat } from '@/features/feedback/InsightDeck';
import { useListingInsights } from '@/features/feedback/PremiumInsights';
import type { ListingInsights } from '@/data/repo/insights';
import { useDevMode } from '@/lib/devMode';
import { captureEvent } from '@/lib/analytics';
import { useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radii } from '@/theme/tokens';

const PERIODS = [
  { id: 'all', label: 'All time' },
  { id: '7', label: 'Last 7 days' },
  { id: '30', label: 'Last 30 days' },
] as const;
type Period = 'all' | 7 | 30;
type Desk = 'basic' | 'advanced' | 'feedback';

const EXPLAIN: Record<string, string> = {
  views: 'People who opened this listing.',
  skips: 'People who passed on it.',
  heys: 'People who sent a hey.',
  ratio: 'Heys divided by views.',
  responses: 'Written feedback that came back.',
  impression: 'The average star rating.',
  price: 'What testers said they would pay, per month.',
  keep: 'The share who would keep using it.',
  fit: 'Among people who opened this listing and then heyed or passed, the share who heyed.',
  liked: 'The part of the listing that starts the most heys.',
  scroll: 'How far down the listing people get before they leave.',
  pitch: 'How long people watch the quick pitch.',
};

const FIELD_TAGS = [
  { id: 'first', label: 'First impressions' },
  { id: 'keep', label: 'Would keep using' },
  { id: 'confusion', label: 'Confusions' },
  { id: 'moment', label: 'Moments' },
  { id: 'bug', label: 'Bugs' },
] as const;
type FieldTag = (typeof FIELD_TAGS)[number]['id'];

export default function FeedbackInbox() {
  const { c } = useTheme();
  const store = useStore();
  const loop = useDevLoop();
  const { isAdmin } = useAuth();
  const { devMode } = useDevMode();
  const showSamples = isAdmin && devMode;

  const [appId, setAppId] = useState(store.primaryApp.id);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [days, setDays] = useState<Period>('all');
  const [periodOpen, setPeriodOpen] = useState(false);
  const [desk, setDesk] = useState<Desk>('basic');
  const [openEntry, setOpenEntry] = useState<FeedbackEntry | null>(null);

  const app = store.apps[appId] ?? store.primaryApp;
  const data = loop.inbox(appId);
  const list = commentList(data?.list ?? [], showSamples).filter((entry) => inPeriod(entry.createdAt, days));
  const lockedCount = list.filter((entry) => entry.unlocked === false).length;
  const insights = useListingInsights(app.id, days).data;
  const compareDays = days === 'all' ? 60 : days * 2;
  const wider = useListingInsights(app.id, compareDays).data;

  return (
    <Screen
      header={
        <View style={{ paddingHorizontal: layout.gutter, paddingTop: 8, paddingBottom: 12, gap: 14 }}>
          <PageTabs
            value={desk}
            onChange={setDesk}
            options={[
              { id: 'basic', label: 'Basic' },
              {
                id: 'advanced',
                label: 'Advanced',
                mark: <Glyph source={glyphs.proSolid} size={28} color="#C6F24E" />,
              },
              { id: 'feedback', label: 'Feedback', count: lockedCount },
            ]}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Switch app"
              onPress={() => setSwitcherOpen(true)}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <AppIcon hue={app.hue} name={app.name} uri={app.icon} size={28} />
              <Txt size={15} weight={600} numberOfLines={1} style={{ flexShrink: 1 }}>
                {shortName(app.name)}
              </Txt>
              <Ionicons name="chevron-down" size={14} color={c.muted} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change date range"
              onPress={() => setPeriodOpen(true)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <Txt size={14} weight={600}>
                {PERIODS.find((period) => period.id === String(days))?.label}
              </Txt>
              <Ionicons name="chevron-down" size={14} color={c.muted} />
            </Pressable>
          </View>
        </View>
      }
    >
      {desk === 'feedback' ? (
        <FeedbackList appId={appId} appName={shortName(app.name)} list={list} onOpen={setOpenEntry} />
      ) : desk === 'advanced' ? (
        <View style={{ gap: 22 }}>
          {store.isPro ? null : <AdvancedSampleBanner />}
          <InsightDeck
            stats={store.isPro ? advancedStats(insights) : sampleAdvanced()}
            dates={edgeDates(days === 'all' ? 90 : days)}
          />
          <AudienceBreakdown audience={store.isPro ? insights?.audience : SAMPLE_AUDIENCE} sample={!store.isPro} />
        </View>
      ) : (
        <View style={{ gap: 18 }}>
          <InsightDeck
            stats={basicStats(data, insights, wider, days, showSamples, list)}
            dates={edgeDates(days === 'all' ? 90 : days)}
          />
          <KeepBar list={list.filter((entry) => entry.unlocked !== false)} />
          <Comments app={app} list={list} onOpen={setOpenEntry} />
          <Txt size={12.5} muted>
            Only you can see these numbers.
          </Txt>
        </View>
      )}

      <Sheet visible={periodOpen} onClose={() => setPeriodOpen(false)}>
        <View style={{ gap: 8 }}>
          <Txt font="mono" size={18} weight={500} style={{ marginBottom: 4 }}>
            Date range
          </Txt>
          {PERIODS.map((period) => {
            const id: Period = period.id === 'all' ? 'all' : period.id === '7' ? 7 : 30;
            const on = days === id;
            return (
              <Pressable
                key={period.id}
                accessibilityRole="button"
                onPress={() => {
                  setDays(id);
                  setPeriodOpen(false);
                }}
                style={{
                  minHeight: 48,
                  borderRadius: radii.option,
                  paddingHorizontal: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: on ? c.raised : c.surface,
                  borderWidth: 1.5,
                  borderColor: on ? c.ink : c.line,
                }}
              >
                <Txt size={15} weight={600} style={{ flex: 1 }}>
                  {period.label}
                </Txt>
                {on ? <Ionicons name="checkmark" size={18} color={c.accentText} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Sheet>

      <Sheet visible={switcherOpen} onClose={() => setSwitcherOpen(false)}>
        <View style={{ gap: 10 }}>
          <Txt font="mono" size={18} weight={500} style={{ marginBottom: 4 }}>
            Your apps
          </Txt>
          {store.ownedApps.map((owned) => (
            <Pressable
              key={owned.id}
              accessibilityRole="button"
              onPress={() => {
                setAppId(owned.id);
                setSwitcherOpen(false);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 13,
                borderRadius: radii.option,
                backgroundColor: owned.id === appId ? c.raised : c.surface,
                borderWidth: 1.5,
                borderColor: owned.id === appId ? c.ink : c.line,
              }}
            >
              <AppIcon hue={owned.hue} name={owned.name} uri={owned.icon} size={40} />
              <Txt size={15} weight={500} style={{ flex: 1 }} numberOfLines={1}>
                {shortName(owned.name)}
              </Txt>
              {owned.id === appId ? (
                <Ionicons name="checkmark" size={18} color={c.accentText} />
              ) : null}
            </Pressable>
          ))}
        </View>
      </Sheet>

      <FeedbackDetail entry={openEntry} onClose={() => setOpenEntry(null)} />
    </Screen>
  );
}

function countOf(value: string | number | undefined): number {
  const parsed = Number(String(value ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Prior period is the wider window minus this window. No series means no percent. */
function periodGrowth(current: number | undefined, wider: number | undefined): number | null {
  if (current == null || wider == null) return null;
  const prior = wider - current;
  if (prior <= 0) return null;
  return Math.round(((current - prior) / prior) * 100);
}

function firstNumber(value: string): number {
  const match = String(value).match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

/** Ends on the real total. Dev mode adds a wave so the line is easier to read. */
function seriesFor(total: number, mock: boolean): number[] {
  const steps = 8;
  return Array.from({ length: steps }, (_, index) => {
    const t = index / (steps - 1);
    if (!mock) return Math.round(total * t);
    const wave = 0.45 + 0.55 * Math.sin(index * 1.2);
    const value = total * Math.min(1, t * 0.55 + t * wave * 0.45);
    return index === steps - 1 ? Math.round(total) : Math.max(0, Math.round(value));
  });
}

function makeStat(
  id: string,
  label: string,
  value: string,
  growth: number | null,
  mock: boolean,
  chartValue?: number,
): InsightStat {
  return {
    id,
    label,
    value,
    growth,
    points: seriesFor(chartValue ?? firstNumber(value), mock),
    explain: EXPLAIN[id],
  };
}

function inPeriod(iso: string | undefined, days: Period): boolean {
  if (days === 'all' || !iso) return true;
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return true;
  return Date.now() - time <= days * 24 * 60 * 60 * 1000;
}

function keepShare(list: FeedbackEntry[], answer: FeedbackEntry['keep']): number {
  const answered = list.filter((entry) => entry.keep);
  if (!answered.length) return 0;
  return Math.round((answered.filter((entry) => entry.keep === answer).length / answered.length) * 100);
}

/** Dollars per month. A stored range uses the mean of its ends, which is still that scale. */
function fairPrice(value: string | undefined): string {
  const amounts = [...String(value ?? '').matchAll(/\d+(?:\.\d+)?/g)].map((match) => Number(match[0]));
  if (!amounts.length) return '—';
  const average = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
  const rounded = average >= 10 ? Math.round(average) : Math.round(average * 10) / 10;
  return `$${rounded}`;
}

function basicStats(
  data: ReturnType<ReturnType<typeof useDevLoop>['inbox']> | undefined,
  insights: ReturnType<typeof useListingInsights>['data'],
  wider: ReturnType<typeof useListingInsights>['data'],
  days: Period,
  mock: boolean,
  list: FeedbackEntry[],
): InsightStat[] {
  const funnel = data?.funnel ?? { views: '0', skips: '0', heys: '0', ratio: '—' };
  const useWindow = days !== 'all' && !!insights;
  const views = useWindow ? insights.views : countOf(funnel.views);
  const skips = useWindow ? insights.skips : countOf(funnel.skips);
  const heys = useWindow ? insights.likes : countOf(funnel.heys);
  const ratio = useWindow
    ? views
      ? Math.round((heys / views) * 100)
      : 0
    : countOf(funnel.ratio);
  const open = list.filter((entry) => entry.unlocked !== false);
  const responses = open.length || days !== 'all' ? open.length : (data?.responses ?? 0);
  const yes = open.length ? keepShare(open, 'Yes') : (data?.yes ?? 0);
  const compared = days !== 'all' && insights && wider && useWindow;

  return [
    makeStat('views', 'Views', String(views), compared ? periodGrowth(insights.views, wider.views) : null, mock),
    makeStat('skips', 'Skips', String(skips), compared ? periodGrowth(insights.skips, wider.skips) : null, mock),
    makeStat('heys', 'Heys', String(heys), compared ? periodGrowth(insights.likes, wider.likes) : null, mock),
    makeStat('ratio', 'Hey ratio', `${ratio}%`, null, mock),
    makeStat('responses', 'Responses', String(responses), null, mock),
    makeStat('impression', 'Impression', open.length ? impressionOf(open) : (data?.impression ?? '—'), null, mock),
    makeStat('price', 'Fair price', fairPrice(open.length ? commonPrice(open) : data?.price), null, mock),
    makeStat('keep', 'Would keep', `${yes}%`, null, mock),
  ];
}

const SAMPLE_AUDIENCE: ListingInsights['audience'] = {
  viewers: 86,
  interests: [
    { label: 'Productivity', pct: 34 },
    { label: 'AI tools', pct: 22 },
    { label: 'Finance', pct: 16 },
  ],
  jobs: [
    { label: 'Founder', pct: 28 },
    { label: 'Designer', pct: 19 },
    { label: 'Engineer', pct: 15 },
  ],
  devices: [
    { label: 'iPhone', pct: 61 },
    { label: 'Web', pct: 24 },
    { label: 'Android', pct: 15 },
  ],
};

function sampleAdvanced(): InsightStat[] {
  return [
    { id: 'fit', label: 'Fit sentiment', value: '64%', growth: null, points: [8, 14, 22, 28, 36, 44, 55, 64], explain: EXPLAIN.fit },
    { id: 'liked', label: 'Liked element', value: 'Demo', growth: null, points: [2, 4, 6, 9, 11, 14, 16, 18], explain: EXPLAIN.liked },
    { id: 'scroll', label: 'Scroll depth', value: '48%', growth: null, points: [12, 18, 24, 30, 34, 40, 44, 48], explain: EXPLAIN.scroll },
    { id: 'pitch', label: 'Pitch watch', value: '12s', growth: null, points: [4, 6, 7, 8, 9, 10, 11, 12], explain: EXPLAIN.pitch },
  ];
}

function AdvancedSampleBanner() {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Upgrade to view real advanced analytics"
      onPress={() => router.push('/paywall')}
    >
      <View style={{ backgroundColor: '#C6F24E', borderRadius: 22, padding: 16, gap: 8 }}>
        <Txt size={22} weight={700} lh={1.15} color="#111111">
          This is what Advanced analytics brings you
        </Txt>
        <Txt size={15} lh={1.4} color="#111111">
          Upgrade to view real data
        </Txt>
      </View>
    </Pressable>
  );
}

function advancedStats(insights: ListingInsights | null | undefined): InsightStat[] {
  const fit = insights?.fit.overall;
  const scroll = insights?.scrollDepth;
  const pitch = insights?.pitchWatches ? insights.pitchAvgSeconds : null;
  const liked =
    insights?.likedElement && insights.likedElement !== 'Not enough data yet' ? insights.likedElement : null;
  const series = insights?.series;
  return [
    {
      id: 'fit',
      label: 'Fit sentiment',
      value: fit == null ? '—' : `${Math.round(fit * 100)}%`,
      growth: null,
      points: series?.heys.length ? series.heys : null,
      explain: EXPLAIN.fit,
    },
    {
      id: 'liked',
      label: 'Liked element',
      value: liked ?? '—',
      growth: null,
      points: series?.heys.length ? series.heys : null,
      explain: EXPLAIN.liked,
    },
    {
      id: 'scroll',
      label: 'Scroll depth',
      value: scroll == null ? '—' : `${Math.round(scroll * 100)}%`,
      growth: null,
      points: series?.scroll.length ? series.scroll : null,
      explain: EXPLAIN.scroll,
    },
    {
      id: 'pitch',
      label: 'Pitch watch',
      value: pitch == null ? '—' : `${pitch % 1 ? pitch.toFixed(1) : pitch}s`,
      growth: null,
      points: series?.pitch.length ? series.pitch : null,
      explain: EXPLAIN.pitch,
    },
  ];
}

function impressionOf(list: FeedbackEntry[]): string {
  const stars = list
    .map((entry) => firstNumber(entry.stars))
    .filter((value) => value > 0);
  if (!stars.length) return '—';
  const average = stars.reduce((sum, value) => sum + value, 0) / stars.length;
  return `${Math.round(average * 10) / 10}/5`;
}

function commonPrice(list: FeedbackEntry[]): string {
  const counts = new Map<string, number>();
  for (const entry of list) {
    if (entry.price) counts.set(entry.price, (counts.get(entry.price) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
}

const LOCKED_SAMPLE: FeedbackEntry = {
  id: 'locked-demo',
  who: 'Nova Park',
  app: 'Sample',
  hue: 270,
  when: '1d',
  stars: '·/5',
  text: 'Share yours to read this.',
  confusion: '·',
  keep: 'Maybe',
  optIn: false,
  unlocked: false,
};

function commentList(list: FeedbackEntry[], mock: boolean): FeedbackEntry[] {
  const base = list.length || !mock ? list : INBOX.tide.list;
  if (!mock || base.some((entry) => entry.unlocked === false)) return base;
  return [...base, LOCKED_SAMPLE];
}

function fieldText(entry: FeedbackEntry, tag: FieldTag | null): string {
  if (tag === 'keep') return entry.keepWhy || entry.keep;
  if (tag === 'confusion') return entry.confusion;
  if (tag === 'moment') return entry.bestMoment ?? '';
  if (tag === 'bug') return entry.bug ?? '';
  return entry.text;
}

function fieldFilled(value: string): boolean {
  const text = value.trim();
  return !!text && text !== '—' && text !== '·' && !/^none\b/i.test(text);
}

function KeepBar({ list }: { list: FeedbackEntry[] }) {
  const { c } = useTheme();
  const [help, setHelp] = useState(false);
  const rows = [
    { label: 'Yes', pct: keepShare(list, 'Yes') },
    { label: 'Maybe', pct: keepShare(list, 'Maybe') },
    { label: 'No', pct: keepShare(list, 'No') },
  ];
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Txt size={16} weight={700}>
          Would keep using it
        </Txt>
        <Pressable accessibilityRole="button" accessibilityLabel="About would keep using" hitSlop={8} onPress={() => setHelp((on) => !on)}>
          <View
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              borderWidth: 1.5,
              borderColor: c.ink,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Txt size={11} weight={700}>
              ?
            </Txt>
          </View>
        </Pressable>
      </View>
      {help ? (
        <Txt size={13.5} lh={1.4} muted>
          {EXPLAIN.keep}
        </Txt>
      ) : null}
      {rows.map((row) => (
        <View key={row.label} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Txt size={14.5}>{row.label}</Txt>
            <Txt size={14} muted>
              {list.length ? `${row.pct}%` : '—'}
            </Txt>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: '#111111', overflow: 'hidden' }}>
            {list.length ? (
              <View style={{ width: `${row.pct}%`, height: '100%', backgroundColor: '#FFFFFF' }} />
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

function Comments({
  app,
  list,
  onOpen,
}: {
  app: OwnedApp;
  list: FeedbackEntry[];
  onOpen: (entry: FeedbackEntry) => void;
}) {
  const [tag, setTag] = useState<FieldTag | null>(null);
  const shown = list.filter((entry) => !tag || fieldFilled(fieldText(entry, tag)));

  return (
    <View style={{ gap: 14 }}>
      <Txt size={16} weight={700}>
        Comments
      </Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {FIELD_TAGS.map((item) => {
          const on = tag === item.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() => setTag(on ? null : item.id)}
              style={{
                borderRadius: 14,
                backgroundColor: on ? '#FFFFFF' : '#3C3C3B',
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}
            >
              <Txt size={12.5} weight={700} color={on ? '#111111' : '#F2F2F2'}>
                {item.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>
      {shown.length ? (
        shown.map((entry) => (
          <CommentRow
            key={entry.id}
            app={app}
            entry={entry}
            text={fieldText(entry, tag)}
            onPress={() => onOpen(entry)}
          />
        ))
      ) : (
        <Txt size={14} muted>
          —
        </Txt>
      )}
    </View>
  );
}

function CommentRow({
  app,
  entry,
  text,
  onPress,
}: {
  app: OwnedApp;
  entry: FeedbackEntry;
  text: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      <Avatar name={entry.who} size={36} />
      <View style={{ flex: 1, gap: 2 }}>
        <Txt size={13.5} weight={700}>
          {firstName(entry.who).toLowerCase()}{' '}
          <Txt size={13} muted>
            {entry.when}
          </Txt>
        </Txt>
        <Txt size={14.5} lh={1.4}>
          {text}
        </Txt>
      </View>
      <AppIcon hue={app.hue} name={app.name} uri={app.icon} size={44} />
    </Pressable>
  );
}

function AudienceBreakdown({
  audience,
  sample = false,
}: {
  audience?: ListingInsights['audience'];
  sample?: boolean;
}) {
  const viewers = audience?.viewers ?? 0;
  return (
    <View style={{ gap: 22 }}>
      <View style={{ gap: 4 }}>
        <Txt size={26} weight={700}>
          Who&apos;s viewing your app
        </Txt>
        <Txt size={13.5} muted>
          {sample
            ? 'Sample viewers. Upgrade to see who actually opened it.'
            : viewers
              ? `${viewers} ${viewers === 1 ? 'person' : 'people'} opened it in this range.`
              : 'No opens in this range yet.'}
        </Txt>
      </View>
      <ShareGroup title="Interests" rows={audienceRows(audience?.interests)} />
      <ShareGroup title="Job title" rows={audienceRows(audience?.jobs)} />
      <ShareGroup title="Devices" rows={audienceRows(audience?.devices)} />
    </View>
  );
}

function audienceRows(rows: ListingInsights['audience']['interests'] | undefined) {
  if (!rows?.length) return [{ label: '—', pct: null }];
  return rows.map((row) => ({ label: row.label, pct: row.pct }));
}

function ShareGroup({ title, rows }: { title: string; rows: { label: string; pct: number | null }[] }) {
  const { c } = useTheme();
  const [help, setHelp] = useState(false);
  const explain =
    title === 'Interests'
      ? 'Interests on the profiles of people who opened this listing.'
      : title === 'Devices'
        ? 'Devices those people said they test on.'
        : 'Job titles those people put on their profile.';
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Txt size={18} weight={700}>
          {title}
        </Txt>
        <Pressable accessibilityRole="button" accessibilityLabel={`About ${title}`} hitSlop={8} onPress={() => setHelp((on) => !on)}>
          <View
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              borderWidth: 1.5,
              borderColor: c.ink,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Txt size={11} weight={700}>
              ?
            </Txt>
          </View>
        </Pressable>
      </View>
      {help ? (
        <Txt size={13.5} lh={1.4} muted>
          {explain}
        </Txt>
      ) : null}
      {rows.map((row) => (
        <View key={`${title}-${row.label}`} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <Txt size={14.5} style={{ flex: 1 }} numberOfLines={1}>
              {row.label}
            </Txt>
            <Txt size={14} muted>
              {row.pct == null ? '—' : `${row.pct}%`}
            </Txt>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: c.raised, overflow: 'hidden' }}>
            {row.pct != null ? (
              <View style={{ width: `${Math.max(0, Math.min(100, row.pct))}%`, height: '100%', backgroundColor: '#FFFF00' }} />
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

function FeedbackList({
  appId,
  appName,
  list,
  onOpen,
}: {
  appId: string;
  appName: string;
  list: FeedbackEntry[];
  onOpen: (entry: FeedbackEntry) => void;
}) {
  if (!list.length) {
    return (
      <View style={{ paddingTop: 28, alignItems: 'center', gap: 10 }}>
        <Txt size={16} weight={600} center>
          No feedback yet
        </Txt>
        <Txt size={14} lh={1.5} muted center style={{ maxWidth: 280 }}>
          Send some heys to find matches. Reviews on {appName} land here after a trade.
        </Txt>
      </View>
    );
  }

  return (
    <View style={{ gap: 14 }}>
      {list.map((entry) => (
        <FeedbackCard key={entry.id} appId={appId} entry={entry} onOpen={() => onOpen(entry)} />
      ))}
    </View>
  );
}

function FeedbackCard({
  appId,
  entry,
  onOpen,
}: {
  appId: string;
  entry: FeedbackEntry;
  onOpen: () => void;
}) {
  const router = useRouter();
  const { c } = useTheme();
  const toast = useToast();
  const store = useStore();
  const locked = entry.unlocked === false;

  return (
    <Card padding={16} radius={radii.cardLg} style={{ gap: 13 }}>
      {/* The footer stays outside the press target: RN has no stopPropagation. */}
      <Pressable
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => ({ gap: 13, opacity: pressed ? 0.9 : 1 })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
          <Avatar name={entry.who} size={38} />
          <View style={{ flex: 1 }}>
            <Txt size={14.5} weight={600}>
              {entry.who}
            </Txt>
            <Txt size={12.5} muted>
              {entry.app} · {entry.when}
            </Txt>
          </View>
          <Txt font="mono" size={14} weight={600} color={c.accentText}>
            {entry.stars}
          </Txt>
          <Ionicons name="chevron-forward" size={16} color={c.muted} />
        </View>

        <Fuzzy locked={locked}>
          <View style={{ gap: 13 }}>
            <Txt size={16} lh={1.45}>
              &ldquo;{entry.text}&rdquo;
            </Txt>

            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Txt size={12.5} muted style={{ width: 86 }}>
                  Confusion
                </Txt>
                <Txt size={13.5} style={{ flex: 1 }}>
                  {entry.confusion}
                </Txt>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Txt size={12.5} muted style={{ width: 86 }}>
                  Keep using
                </Txt>
                <Txt size={13.5} style={{ flex: 1 }}>
                  {entry.keep}
                </Txt>
              </View>
              {entry.bestMoment ? <DetailLine label="Moment" value={entry.bestMoment} /> : null}
              {entry.bug ? <DetailLine label="Bug" value={entry.bug} /> : null}
              {entry.bugShots?.length ? <DetailLine label="Images" value={`${entry.bugShots.length} attached`} /> : null}
              {entry.videoPath ? <DetailLine label="Video" value="Demo attached" /> : null}
            </View>
          </View>
        </Fuzzy>
      </Pressable>

      {locked ? null : (
      <View
        style={{
          borderTopWidth: 1,
          borderColor: c.line,
          paddingTop: 13,
          gap: 10,
        }}
      >
        {entry.helpful ? (
          entry.optIn ? (
            <Btn
              label="Make testimonial card"
              variant="surface"
              size="sm"
              onPress={() =>
                router.push({
                  pathname: '/share',
                  params: { kind: 'testimonial', appId, feedbackId: entry.id },
                })
              }
              style={{ alignSelf: 'flex-start' }}
            />
          ) : (
            <Btn
              label={`Ask ${entry.who.split(' ')[0]} to share it`}
              variant="surface"
              size="sm"
              onPress={() => toast(`Asked ${entry.who.split(' ')[0]} in chat`)}
              style={{ alignSelf: 'flex-start' }}
            />
          )
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Txt size={13} muted style={{ flex: 1 }}>
              Was this helpful?
            </Txt>
            <Btn
              label="Helpful"
              variant="surface"
              size="sm"
              onPress={() => {
                void store.rateFeedback(appId, entry.id, 'yes');
                captureEvent('feedback_rated', { helpful: true });
              }}
            />
            <Btn
              label="Not really"
              variant="ghost"
              size="sm"
              onPress={() => {
                void store.rateFeedback(appId, entry.id, 'no');
                captureEvent('feedback_rated', { helpful: false });
              }}
            />
          </View>
        )}
      </View>
      )}
    </Card>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <Txt size={12.5} muted style={{ width: 86 }}>
        {label}
      </Txt>
      <Txt size={13.5} style={{ flex: 1 }}>
        {value}
      </Txt>
    </View>
  );
}

function FeedbackDetail({
  entry,
  onClose,
}: {
  entry: FeedbackEntry | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const { c } = useTheme();
  const store = useStore();
  const locked = entry?.unlocked === false;
  const matchId =
    entry?.matchId ??
    (entry
      ? store.matches.find((match) => store.listing(match.appId)?.builder === entry.who)?.id
      : undefined) ??
    (entry?.id === 'locked-demo' ? store.matches[0]?.id : undefined);

  return (
    <Sheet visible={!!entry} onClose={onClose} tall>
      {entry ? (
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
            <Avatar name={entry.who} size={42} />
            <View style={{ flex: 1 }}>
              <Txt size={16} weight={700}>
                {entry.who}
              </Txt>
              <Txt size={13} muted>
                {entry.app} · {entry.when}
              </Txt>
            </View>
            <Txt font="mono" size={16} weight={600} color={c.accentText}>
              {entry.stars}
            </Txt>
          </View>

          {locked ? (
            <View style={{ gap: 12 }}>
              <Txt size={18} weight={700}>
                This feedback is locked
              </Txt>
              <Txt size={15} lh={1.45}>
                Leave your own feedback on {firstName(entry.who)}&apos;s app and theirs unlocks here.
              </Txt>
              <Btn
                label="Give feedback"
                variant="accent"
                size="lg"
                full
                onPress={() => {
                  onClose();
                  if (matchId) {
                    router.push({ pathname: '/feedback-form', params: { matchId } });
                  }
                }}
              />
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              <Txt size={17} lh={1.45}>
                {entry.text}
              </Txt>
              <DetailLine label="Confusion" value={entry.confusion || '—'} />
              <DetailLine label="Keep using" value={[entry.keep, entry.keepWhy].filter(Boolean).join(' · ')} />
              <DetailLine label="Moment" value={entry.bestMoment || '—'} />
              <DetailLine label="Bug" value={entry.bug || '—'} />
              <DetailLine label="Fair price" value={entry.price || '—'} />
              {entry.bugShots?.map((uri) =>
                uri === 'demo' ? (
                  <View
                    key={uri}
                    style={{ height: 140, borderRadius: 16, backgroundColor: c.raised, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Txt size={14} weight={700}>
                      Screenshot
                    </Txt>
                  </View>
                ) : (
                  <Image key={uri} source={{ uri }} style={{ height: 180, borderRadius: 16 }} contentFit="cover" />
                ),
              )}
              {entry.videoPath ? (
                <View
                  style={{
                    height: 72,
                    borderRadius: 16,
                    backgroundColor: c.raised,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingHorizontal: 14,
                  }}
                >
                  <Ionicons name="play-circle" size={28} color={c.ink} />
                  <Txt size={15} weight={700}>
                    Video demo
                  </Txt>
                </View>
              ) : null}
              {matchId ? (
                <Btn
                  label="Open chat"
                  variant="surface"
                  onPress={() => {
                    onClose();
                    router.push({ pathname: '/chat/[id]', params: { id: matchId } });
                  }}
                />
              ) : null}
            </View>
          )}
        </View>
      ) : null}
    </Sheet>
  );
}
