'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { ListingEditor } from '@/components/app/ListingEditor';
import { useIos } from '@/components/app/IosModal';
import { useMe } from '@/components/app/MeContext';
import { useDevMode } from '@/lib/devMode';
import { hueFill, initial } from '@/lib/format';
import type { FeedbackByApp, ListingInsights, OwnedApp } from '@/lib/loop';
import { INTEGRATIONS, MILESTONES, listingStrength } from '@/lib/prompts';
import { SITE, publicMediaUrl } from '@/lib/site';
import { createClient } from '@/lib/supabase/client';

function milestoneIcon(id: string): string {
  if (id === 'first-trade') return '/icons/milestone-handshake.png';
  if (id === 'target-opened') return '/icons/milestone-heart-eyes.png';
  if (id === 'monthly') return '/icons/milestone-chart.png';
  return '/icons/milestone-h1.png';
}

export function Apps() {
  const me = useMe();
  const { openIos } = useIos();
  const { devMode } = useDevMode();
  const router = useRouter();
  const [apps, setApps] = useState<OwnedApp[]>([]);
  const [insights, setInsights] = useState<Record<string, ListingInsights>>({});
  const [inbox, setInbox] = useState<FeedbackByApp>({});
  const [mediaCounts, setMediaCounts] = useState<Record<string, number>>({});
  const [promptCounts, setPromptCounts] = useState<Record<string, number>>({});
  const [verified, setVerified] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [badgeApp, setBadgeApp] = useState<OwnedApp | null>(null);

  const reload = useCallback(async () => {
    const db = createClient();
    const { data } = await db.from('apps').select('*').eq('owner_id', me.id).order('created_at');
    const rows = (data ?? []) as OwnedApp[];
    setApps(rows);
    const [{ data: feedback }, counts, prompts, conns] = await Promise.all([
      db.rpc('my_feedback'),
      Promise.all(
        rows.map(async (row) => {
          const { count } = await db.from('app_media').select('*', { count: 'exact', head: true }).eq('app_id', row.id);
          return [row.id, count ?? 0] as const;
        }),
      ),
      Promise.all(
        rows.map(async (row) => {
          const { count } = await db.from('app_prompts').select('*', { count: 'exact', head: true }).eq('app_id', row.id);
          return [row.id, count ?? 0] as const;
        }),
      ),
      Promise.all(
        rows.map(async (row) => {
          const { data: links } = await db.from('app_connections').select('provider').eq('app_id', row.id);
          const providers = new Set((links ?? []).map((item) => item.provider));
          return [row.id, providers.has('github') && (providers.has('stripe') || providers.has('revenuecat'))] as const;
        }),
      ),
    ]);
    setInbox((feedback ?? {}) as FeedbackByApp);
    setMediaCounts(Object.fromEntries(counts));
    setPromptCounts(Object.fromEntries(prompts));
    setVerified(Object.fromEntries(conns));
    const next: Record<string, ListingInsights> = {};
    await Promise.all(
      rows.map(async (row) => {
        const { data: insight } = await db.rpc('my_listing_insights', { p_app_id: row.id, p_days: 3650 });
        const packed = (insight ?? {}) as Record<string, unknown>;
        next[row.id] = {
          views: Number(packed.views ?? 0),
          likes: Number(packed.likes ?? 0),
          skips: Number(packed.skips ?? 0),
          liked_element: String(packed.liked_element ?? ''),
        };
      }),
    );
    setInsights(next);
  }, [me.id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const share = async (app: OwnedApp) => {
    if (!app.slug) return;
    await navigator.clipboard.writeText(`${SITE}/${app.slug}`);
    setCopied(app.id);
    window.setTimeout(() => setCopied(null), 1600);
  };

  const sampleMilestones = me.isAdmin && devMode;

  return (
    <div className="page-main">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <div>
          <h1>My apps</h1>
          <p className="muted">Each listing, its numbers, and the same edit surface as iOS.</p>
        </div>
        <button className="btn-accent" type="button" onClick={openIos} style={{ width: 'auto', padding: '0 18px', flex: 'none' }}>
          + Add app
        </button>
      </div>

      {!apps.length ? <p className="empty">No listing yet. Add one on iOS, then it shows up here.</p> : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {apps.map((row) => {
          const icon = publicMediaUrl(row.icon_path);
          const stats = insights[row.id];
          const pack = inbox[row.id];
          const strength = listingStrength(row, mediaCounts[row.id] ?? 0, promptCounts[row.id] ?? 0, !!verified[row.id]);
          return (
            <article key={row.id} className="app-row">
              <button type="button" onClick={() => setEditing(row.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 0, color: 'inherit', cursor: 'pointer', textAlign: 'left', minWidth: 180 }}>
                {icon ? (
                  <img src={icon} alt="" style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover' }} />
                ) : (
                  <span className="app-fallback" style={{ width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center', background: hueFill(row.hue ?? 140) }}>
                    {initial(row.name)}
                  </span>
                )}
                <span>
                  <strong style={{ display: 'block' }}>{row.name}</strong>
                  <span className="muted">{row.is_primary ? 'Primary' : 'Listing'} · {row.stage || 'Live'}</span>
                </span>
              </button>
              <div className="app-row-stats">
                <div>
                  <b>{stats?.views ?? pack?.views ?? 0}</b>
                  <span>Views</span>
                </div>
                <div>
                  <b>{stats?.likes ?? pack?.heys ?? 0}</b>
                  <span>Heys</span>
                </div>
                <div>
                  <b>{stats?.skips ?? pack?.skips ?? 0}</b>
                  <span>Passes</span>
                </div>
                <div>
                  <b>{pack?.entries?.length ?? 0}</b>
                  <span>Feedback</span>
                </div>
              </div>
              <div className="app-row-actions">
                <button type="button" onClick={() => void share(row)} disabled={!row.slug}>
                  {copied === row.id ? 'Copied' : 'Share'}
                </button>
                <button type="button" onClick={() => setBadgeApp(row)}>
                  Badges
                </button>
                <button type="button" onClick={() => router.push(`/discover?preview=${row.id}`)}>
                  View
                </button>
                <button type="button" onClick={() => setEditing(row.id)}>
                  Edit
                </button>
              </div>
              <div style={{ flexBasis: '100%' }}>
                <div className="strength-bar">
                  <span style={{ width: `${Math.round(strength.ratio * 100)}%` }} />
                </div>
                <p className="muted" style={{ margin: '6px 0 0' }}>
                  Listing strength · {strength.done}/{strength.total}
                </p>
              </div>
            </article>
          );
        })}
      </div>

      <Link href="/tools" className="app-row" style={{ marginTop: 8, textDecoration: 'none' }}>
        <div>
          <strong>Explore top products used by builders</strong>
          <p className="muted" style={{ margin: 0 }}>Tools we recommend — and sometimes sponsor</p>
        </div>
      </Link>

      <span className="eyebrow" style={{ marginTop: 18 }}>Milestones</span>
      {sampleMilestones ? (
        MILESTONES.map((item) => (
          <div key={item.id} className="milestone-card">
            <span
              className="milestone-mark"
              style={{
                maskImage: `url(${milestoneIcon(item.id)})`,
                WebkitMaskImage: `url(${milestoneIcon(item.id)})`,
              }}
            />
            <div style={{ flex: 1 }}>
              <strong>{item.title}</strong>
              <p className="muted" style={{ margin: 0 }}>{item.sub}</p>
            </div>
            <button className="text-btn" type="button" onClick={openIos}>
              Share
            </button>
          </div>
        ))
      ) : (
        <p className="muted">Milestones show up as you match, trade, and grow views.</p>
      )}

      {editing ? <ListingEditor appId={editing} onClose={() => { setEditing(null); void reload(); }} /> : null}
      {badgeApp ? <BadgesSheet app={badgeApp} onClose={() => setBadgeApp(null)} /> : null}
    </div>
  );
}

function BadgesSheet({ app, onClose }: { app: OwnedApp; onClose: () => void }) {
  const { openIos } = useIos();
  const slug = app.slug ?? app.name.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const badges = [
    { id: 'find', label: 'Find us on hey100.com', locked: false },
    { id: 'tested', label: 'Tested by builders', locked: false },
    { id: 'revenue', label: 'Verified MRR', locked: true },
    { id: 'customers', label: 'Verified customers', locked: true },
    { id: 'commits', label: 'Verified commits', locked: true },
  ];
  return (
    <div className="modal-scrim" onClick={onClose} role="presentation">
      <div className="edit-sheet" onClick={(event) => event.stopPropagation()}>
        <h2>Badges for {app.name}</h2>
        <p className="muted">Share {SITE.replace('https://', '')}/{slug}. Verified badges connect on iOS.</p>
        {badges.map((badge) => (
          <div key={badge.id} className="feedback-card">
            <strong>{badge.label}</strong>
            <p className="muted">{badge.locked ? 'Unlock by connecting on iOS' : 'Ready to share'}</p>
          </div>
        ))}
        {INTEGRATIONS.map((item) => (
          <p key={item.key} className="muted">{item.name} · {item.desc}</p>
        ))}
        <div className="modal-actions">
          <button className="btn-line" type="button" onClick={onClose}>Close</button>
          <button className="btn-accent" type="button" onClick={openIos}>Connect on iOS</button>
        </div>
      </div>
    </div>
  );
}
