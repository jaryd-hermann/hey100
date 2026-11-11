'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { useMe } from '@/components/app/MeContext';
import { useDevMode } from '@/lib/devMode';
import { hueFill, initial, timeAgo } from '@/lib/format';
import type { FeedbackByApp, FeedbackEntry, ListingInsights, OwnedApp } from '@/lib/loop';
import { SAMPLE_INBOX } from '@/lib/sampleInbox';
import { publicAvatarUrl, publicMediaUrl } from '@/lib/site';
import { createClient } from '@/lib/supabase/client';

const PERIODS = [
  { label: 'All time', days: 3650 },
  { label: 'Last 7d', days: 7 },
  { label: 'Last 30d', days: 30 },
  { label: 'Last 90d', days: 90 },
] as const;

const MOCK_INSIGHTS = [
  { label: 'Avg scroll depth', value: 64 },
  { label: 'Quick pitch watched', value: 71 },
  { label: 'Fit sentiment Strong', value: 82 },
];

export function Feedback() {
  const me = useMe();
  const { devMode } = useDevMode();
  const router = useRouter();
  const [apps, setApps] = useState<OwnedApp[]>([]);
  const [inbox, setInbox] = useState<FeedbackByApp>({});
  const [active, setActive] = useState<string | null>(me.primaryAppId);
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>(PERIODS[0]);
  const [insights, setInsights] = useState<ListingInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [promo, setPromo] = useState(false);
  const [picker, setPicker] = useState(false);

  useEffect(() => {
    void (async () => {
      const db = createClient();
      const [{ data: owned }, { data: feedback }] = await Promise.all([
        db.from('apps').select('id, name, subtitle, slug, hue, icon_path, is_primary, created_at').eq('owner_id', me.id),
        db.rpc('my_feedback'),
      ]);
      const rows = (owned ?? []) as OwnedApp[];
      setApps(rows);
      setInbox((feedback ?? {}) as FeedbackByApp);
      setActive((current) => current ?? rows.find((row) => row.is_primary)?.id ?? rows[0]?.id ?? null);
      setLoading(false);
    })();
  }, [me.id]);

  const sampleApp: OwnedApp = {
    id: 'sample',
    name: me.primaryAppName ?? 'Your listing',
    subtitle: 'Sample feedback',
    slug: null,
    hue: 128,
    icon_path: null,
    is_primary: true,
    created_at: new Date().toISOString(),
  };
  const list = apps.length ? apps : me.isAdmin && devMode ? [sampleApp] : [];
  const app = useMemo(() => list.find((row) => row.id === active) ?? list[0] ?? null, [list, active]);
  const livePack = app && app.id !== 'sample' ? inbox[app.id] : null;
  const pack =
    livePack?.entries?.length || !me.isAdmin || !devMode ? livePack : SAMPLE_INBOX.sample;
  const entries = pack?.entries ?? [];
  const unlocked = entries.filter((row) => row.unlocked !== false);
  const avg = unlocked.length ? unlocked.reduce((sum, row) => sum + row.stars, 0) / unlocked.length : 0;
  const prices = unlocked.map((row) => row.price).filter(Boolean) as string[];
  const fair = prices.sort((a, b) => prices.filter((x) => x === a).length - prices.filter((x) => x === b).length).at(-1);
  const keepYes = unlocked.filter((row) => row.keep === 'Yes').length;
  const keepMaybe = unlocked.filter((row) => row.keep === 'Maybe').length;
  const keepNo = unlocked.filter((row) => row.keep === 'No').length;
  const keepTotal = keepYes + keepMaybe + keepNo || 1;

  useEffect(() => {
    if (!app || app.id === 'sample') return;
    void (async () => {
      const { data } = await createClient().rpc('my_listing_insights', { p_app_id: app.id, p_days: period.days });
      const row = (data ?? {}) as Record<string, unknown>;
      setInsights({
        views: Number(row.views ?? 0),
        likes: Number(row.likes ?? 0),
        skips: Number(row.skips ?? 0),
        liked_element: String(row.liked_element ?? ''),
        pitch_watches: Number(row.pitch_watches ?? 0),
        pitch_completion: Number(row.pitch_completion ?? 0),
      });
    })();
  }, [app, period]);

  const views = period.label === 'All time' ? pack?.views ?? 0 : insights?.views ?? 0;
  const skips = period.label === 'All time' ? pack?.skips ?? 0 : insights?.skips ?? 0;
  const heys = period.label === 'All time' ? pack?.heys ?? 0 : insights?.likes ?? 0;
  const ratio = views ? Math.round((heys / views) * 100) : 0;

  return (
    <div className="fb-dash">
      <section className="fb-dash-main">
        <div className="fb-dash-head">
          <div>
            <h1>Feedback</h1>
            <p className="muted">Only you can see these numbers</p>
          </div>
          <div className="app-picker">
            <button className="app-picker-btn" type="button" onClick={() => setPicker((value) => !value)}>
              {app?.icon_path && publicMediaUrl(app.icon_path) ? (
                <img src={publicMediaUrl(app.icon_path)!} alt="" />
              ) : (
                <span className="row-fallback" style={{ background: hueFill(app?.hue ?? 140) }}>
                  {initial(app?.name ?? 'A')}
                </span>
              )}
              {app?.name ?? 'Pick an app'}
            </button>
            {picker ? (
              <div className="app-picker-menu">
                {list.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => {
                      setActive(row.id);
                      setPicker(false);
                    }}
                  >
                    {row.icon_path && publicMediaUrl(row.icon_path) ? (
                      <img src={publicMediaUrl(row.icon_path)!} alt="" width={24} height={24} style={{ borderRadius: 7 }} />
                    ) : (
                      <span className="row-fallback" style={{ width: 24, height: 24, borderRadius: 7, background: hueFill(row.hue ?? 140) }}>
                        {initial(row.name)}
                      </span>
                    )}
                    {row.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {loading ? <p className="empty">Loading…</p> : null}
        {!loading && !app ? <p className="empty">Add a listing on iOS to collect feedback here.</p> : null}

        {app ? (
          <>
            <div className="pane-tabs">
              {PERIODS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className={period.label === item.label ? 'is-on' : undefined}
                  onClick={() => setPeriod(item)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <div className="stat-card">
                <b>{views}</b>
                <span>Views</span>
              </div>
              <div className="stat-card">
                <b>{skips}</b>
                <span>Skips</span>
              </div>
              <div className="stat-card">
                <b>{heys}</b>
                <span>Heys</span>
              </div>
              <div className="stat-card">
                <b>{ratio}%</b>
                <span>Hey ratio</span>
              </div>
            </div>
            <div className="stat-grid">
              <div className="stat-card">
                <b>{unlocked.length}</b>
                <span>Responses</span>
              </div>
              <div className="stat-card">
                <b>{unlocked.length ? avg.toFixed(1) : '—'}</b>
                <span>Avg impression</span>
              </div>
              <div className="stat-card">
                <b>{fair ?? '—'}</b>
                <span>Fair price</span>
              </div>
            </div>
            <div className="feedback-card">
              <span className="eyebrow">Would keep using it</span>
              <div className="keep-bar">
                <span style={{ width: `${(keepYes / keepTotal) * 100}%` }} />
                <span style={{ width: `${(keepMaybe / keepTotal) * 100}%` }} />
                <span style={{ width: `${(keepNo / keepTotal) * 100}%` }} />
              </div>
              <p className="muted">
                {Math.round((keepYes / keepTotal) * 100)}% yes · {Math.round((keepMaybe / keepTotal) * 100)}% maybe ·{' '}
                {Math.round((keepNo / keepTotal) * 100)}% no
              </p>
            </div>
            {me.plan === 'pro' && insights ? (
              <div className="feedback-card">
                <span className="eyebrow">Pro insights</span>
                <p>People hey {insights.liked_element || 'the listing'} most.</p>
                {insights.pitch_watches ? <p className="muted">Pitch watches {insights.pitch_watches}</p> : null}
              </div>
            ) : (
              <button className="feedback-card insights-promo" type="button" onClick={() => setPromo(true)}>
                <div className="insights-promo-lock">
                  {MOCK_INSIGHTS.map((item) => (
                    <div key={item.label} className="insight-bar">
                      <span>{item.label}</span>
                      <b>{item.value}%</b>
                      <i>
                        <span style={{ width: `${item.value}%` }} />
                      </i>
                    </div>
                  ))}
                </div>
                <div className="insights-cta">
                  <span className="eyebrow">Premium insights · Builder Pro</span>
                  <strong>Unlock who likes this, where they stop, and an AI coach.</strong>
                  <span>See what Pro unlocks →</span>
                </div>
              </button>
            )}
          </>
        ) : null}
      </section>

      <aside className="pane-rail" style={{ width: 340, display: 'flex' }}>
        <span className="eyebrow">User feedback</span>
        {!entries.length ? (
          <p className="empty">Reviews land here after a trade.</p>
        ) : null}
        {entries.map((entry) => (
          <ReviewCard key={entry.id} entry={entry} onOpen={() => entry.match_id && router.push(`/chat?match=${entry.match_id}`)} />
        ))}
      </aside>

      {promo ? (
        <div className="modal-scrim" onClick={() => setPromo(false)} role="presentation">
          <div className="modal-card insights-modal" onClick={(event) => event.stopPropagation()}>
            <h2>See how people actually read your listing</h2>
            <p>
              Builder Pro unlocks scroll depth, pitch watch time, and fit sentiment — the same insights iOS builders
              use to rewrite listings that get more heys.
            </p>
            <div className="insight-bars">
              {MOCK_INSIGHTS.map((item) => (
                <div key={item.label} className="insight-bar">
                  <span>{item.label}</span>
                  <b>{item.value}%</b>
                  <i>
                    <span style={{ width: `${item.value}%` }} />
                  </i>
                </div>
              ))}
            </div>
            <p className="muted">Mock data from listings like yours. Your numbers unlock with Pro.</p>
            <div className="modal-actions">
              <button className="btn-line" type="button" onClick={() => setPromo(false)}>
                Not now
              </button>
              <Link className="btn-accent" href="/pro">
                Get Builder Pro
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ReviewCard({ entry, onOpen }: { entry: FeedbackEntry; onOpen: () => void }) {
  const name = entry.from?.real_name || (entry.from?.username ? `@${entry.from.username}` : 'A builder');
  const photo = publicAvatarUrl(entry.from?.photo_url);
  const locked = entry.unlocked === false;
  const shots = [
    ...(entry.bug_shots ?? []),
    ...(entry.bug_shot ? [entry.bug_shot] : []),
  ].filter(Boolean);
  return (
    <button type="button" className={`feedback-card${locked ? ' is-locked' : ''}`} onClick={onOpen} style={{ textAlign: 'left', width: '100%' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {photo ? (
          <img src={photo} alt="" style={{ width: 32, height: 32, borderRadius: 16, objectFit: 'cover' }} />
        ) : (
          <span className="row-fallback" style={{ width: 32, height: 32, borderRadius: 16, background: hueFill(140) }}>
            {initial(name)}
          </span>
        )}
        <div>
          <strong>{name}</strong>
          <span className="muted">{timeAgo(entry.created_at)}</span>
        </div>
        <span className="stars" style={{ marginLeft: 'auto' }}>
          {'★'.repeat(entry.stars)}
          {'☆'.repeat(Math.max(0, 5 - entry.stars))}
        </span>
      </div>
      <div style={locked ? { filter: 'blur(6px)' } : undefined}>
        <p>&ldquo;{entry.summary}&rdquo;</p>
        <div className="review-meta">
          <span className="muted">Confusion</span>
          <span>{entry.confusion || '—'}</span>
          <span className="muted">Keep using</span>
          <span>{entry.keep || '—'}</span>
        </div>
        {shots.length || entry.video_path ? (
          <div className="review-media">
            {shots.map((src) => (
              <img key={src} src={publicMediaUrl(src) ?? src} alt="" />
            ))}
            {entry.video_path ? (
              <video src={publicMediaUrl(entry.video_path) ?? entry.video_path} muted playsInline preload="metadata" />
            ) : null}
          </div>
        ) : null}
      </div>
      {locked ? <p className="muted">Give feedback on theirs to unlock this note.</p> : (
        <p className="muted">Reply in chat →</p>
      )}
    </button>
  );
}
