'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { ListingView } from '@/components/app/ListingView';
import { useMe } from '@/components/app/MeContext';
import { captureEvent } from '@/lib/analytics';
import { hueFill, initial, timeAgo } from '@/lib/format';
import type { ActionResult, HeyRow } from '@/lib/loop';
import { publicMediaUrl } from '@/lib/site';
import { createClient } from '@/lib/supabase/client';

type Tab = 'received' | 'sent';

export function Heys() {
  const me = useMe();
  const [tab, setTab] = useState<Tab>('received');
  const [received, setReceived] = useState<HeyRow[]>([]);
  const [sent, setSent] = useState<HeyRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await createClient().rpc('my_heys');
    setLoading(false);
    if (error) {
      setToast(error.message);
      return;
    }
    const packed = (data ?? {}) as { received?: HeyRow[]; sent?: HeyRow[] };
    setReceived(packed.received ?? []);
    setSent(packed.sent ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(t);
  }, [toast]);

  const rows = tab === 'received' ? received : sent;
  const current = useMemo(() => rows.find((row) => row.id === selected) ?? rows[0] ?? null, [rows, selected]);

  const act = useCallback(
    async (kind: 'back' | 'pass') => {
      if (!current || busy) return;
      setBusy(true);
      const rpc = kind === 'back' ? 'hey_back' : 'pass_hey';
      const args =
        kind === 'back'
          ? { p_hey_id: current.id, p_from_app_id: me.primaryAppId }
          : { p_hey_id: current.id };
      const { data, error } = await createClient().rpc(rpc, args);
      setBusy(false);
      if (error) {
        setToast(error.message);
        return;
      }
      const result = (data ?? {}) as ActionResult;
      if (result.hit_paywall || result.reason === 'match_limit' || result.reason === 'daily_limit') {
        setToast('Plan limit reached. Go Pro from the menu.');
        return;
      }
      captureEvent(kind === 'back' ? 'hey_back' : 'app_passed', {
        app_id: current.app_id,
        matched: result.status === 'matched' || Boolean(result.match_id),
      });
      setToast(result.status === 'matched' ? 'Matched' : kind === 'back' ? 'Hey sent back' : 'Passed');
      await load();
    },
    [busy, current, load, me.primaryAppId],
  );

  return (
    <div className="pane-shell">
      <aside className="pane-list">
        <div className="pane-list-head">
          <h1>Heys</h1>
          <div className="pane-tabs">
            <button type="button" className={tab === 'received' ? 'is-on' : undefined} onClick={() => setTab('received')}>
              Received {received.length ? `· ${received.length}` : ''}
            </button>
            <button type="button" className={tab === 'sent' ? 'is-on' : undefined} onClick={() => setTab('sent')}>
              Sent {sent.length ? `· ${sent.length}` : ''}
            </button>
          </div>
        </div>
        <div className="pane-scroll">
          {loading ? <p className="empty">Loading heys…</p> : null}
          {!loading && !rows.length ? <p className="empty">Nothing here yet.</p> : null}
          {rows.map((row) => {
            const name = row.card?.app.name ?? 'A listing';
            const icon = publicMediaUrl(row.card?.app.icon_path);
            return (
              <button
                key={row.id}
                type="button"
                className={`row-card${current?.id === row.id ? ' is-on' : ''}`}
                onClick={() => setSelected(row.id)}
              >
                {icon ? (
                  <img src={icon} alt="" />
                ) : (
                  <span className="row-fallback" style={{ background: hueFill(row.card?.app.hue ?? 120) }}>
                    {initial(name)}
                  </span>
                )}
                <div className="row-copy">
                  <strong>{name}</strong>
                  <span>{row.note || `Hey on their ${row.target_type}`}</span>
                </div>
                <em>{timeAgo(row.created_at)}</em>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="pane-main">
        {current?.card ? (
          <>
            <div className="pane-body">
              <ListingView card={current.card} />
              {current.note ? (
                <div className="prompt-card">
                  <span className="eyebrow">{tab === 'received' ? 'Their note' : 'Your note'}</span>
                  <p>{current.note}</p>
                </div>
              ) : null}
            </div>
            {tab === 'received' && current.status !== 'matched' && current.status !== 'passed' ? (
              <div className="heybar">
                <button className="heybar-pass" type="button" disabled={busy} onClick={() => void act('pass')}>
                  <img src="/icons/pass.svg" alt="" />
                  <span>Pass</span>
                </button>
                <span className="heybar-left">{current.status ?? 'pending'}</span>
                <button className="heybar-hey" type="button" disabled={busy} onClick={() => void act('back')}>
                  <img src="/icons/hey.svg" alt="" />
                  <span>Hey back</span>
                </button>
              </div>
            ) : (
              <div className="heybar">
                <span className="heybar-left">
                  {current.status === 'matched' ? 'Matched' : current.status === 'passed' ? 'Passed' : 'Sent'}
                </span>
              </div>
            )}
          </>
        ) : (
          <p className="empty">Pick a hey to preview the listing.</p>
        )}
      </section>
      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}
