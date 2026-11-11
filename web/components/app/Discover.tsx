'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import { FilterChip, useFilters } from '@/components/app/Filters';
import { PlatformMark } from '@/components/app/Marks';
import { useMe } from '@/components/app/MeContext';
import { captureEvent } from '@/lib/analytics';
import { hueFill, initial, host, mmss } from '@/lib/format';
import { serverDeckSort, type ActionResult, type ListingCard } from '@/lib/loop';
import { publicAvatarUrl, publicMediaUrl } from '@/lib/site';
import { createClient } from '@/lib/supabase/client';

type Target = { type: 'app' | 'prompt' | 'media'; label: string; body?: string };

function matches(listing: ListingCard, cat: string[], plat: string[], stage: string[]) {
  const app = listing.app;
  if (cat.length && !cat.some((value) => (app.category ?? '').toLowerCase().includes(value.toLowerCase()))) {
    return false;
  }
  if (
    plat.length &&
    !plat.some((value) =>
      (app.platform ?? '').toLowerCase().includes(value.toLowerCase().replace('iphone', 'ios')),
    )
  ) {
    return false;
  }
  if (stage.length) {
    const raw = (app.stage ?? '').toLowerCase();
    const ok = stage.some((value) => {
      if (value === 'Has revenue') return raw.includes('revenue');
      if (value === 'Live') return raw === 'live';
      return raw.includes('testflight') || raw.includes('beta');
    });
    if (!ok) return false;
  }
  return true;
}

function splitList(value?: string | null) {
  return (value ?? '')
    .split(/[,·|/]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function Discover() {
  const me = useMe();
  const params = useSearchParams();
  const previewId = params.get('preview');
  const { sort, cat, plat, stage } = useFilters();
  const pitchRef = useRef<HTMLVideoElement>(null);
  const colRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [deck, setDeck] = useState<ListingCard[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [hey, setHey] = useState<Target | null>(null);
  const [note, setNote] = useState('');
  const [left, setLeft] = useState(me.counters?.heys_left ?? null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await createClient().rpc('discover_deck', {
      p_limit: 40,
      p_sort: serverDeckSort(sort),
    });
    if (err) {
      setError(err.message);
      setDeck([]);
      setLoading(false);
      return;
    }
    setDeck(Array.isArray(data) ? (data as ListingCard[]) : []);
    setIndex(0);
    setLoading(false);
  }, [sort]);

  useEffect(() => {
    if (!previewId) {
      void load();
      return;
    }
    void (async () => {
      setLoading(true);
      const db = createClient();
      const { data: app } = await db.from('apps').select('*').eq('id', previewId).maybeSingle();
      if (!app) {
        setDeck([]);
        setLoading(false);
        return;
      }
      const { data: media } = await db
        .from('app_media')
        .select('storage_path, kind, label, position')
        .eq('app_id', previewId)
        .order('position');
      const [{ data: prompts }, { data: owner }] = await Promise.all([
        db
          .from('app_prompts')
          .select('slot, answer, prompt_id, prompts(label)')
          .eq('app_id', previewId)
          .order('slot'),
        db
          .from('profiles')
          .select('id, real_name, username, photo_url, job, workplace')
          .eq('id', app.owner_id)
          .maybeSingle(),
      ]);
      const ownerRow = owner as {
        id: string;
        real_name: string | null;
        username: string | null;
        photo_url: string | null;
        job: string | null;
        workplace: string | null;
      } | null;
      setDeck([
        {
          app: {
            id: app.id,
            name: app.name,
            subtitle: app.subtitle,
            description: app.description,
            slug: app.slug,
            hue: app.hue,
            icon_path: app.icon_path,
            cover_path: app.cover_path,
            category: app.category,
            platform: app.platform,
            stage: app.stage,
            problem_of: app.problem_of,
            problem_for: app.problem_for,
            pitch_path: app.pitch_path,
            pitch_seconds: app.pitch_seconds,
            store_url: app.store_url,
            shot_layout: app.shot_layout,
            feedback_wanted: app.feedback_wanted,
            pricing_model: app.pricing_model,
            price_from: app.price_from,
            onboarding: app.onboarding,
            ideal_users: app.ideal_users,
            layout: app.layout,
            owner_id: app.owner_id,
          },
          media: (media ?? []) as ListingCard['media'],
          prompts: (
            (prompts ?? []) as {
              slot: number;
              answer: string;
              prompt_id?: string;
              prompts?: { label?: string } | { label?: string }[] | null;
            }[]
          ).map((row) => {
            const nested = Array.isArray(row.prompts) ? row.prompts[0] : row.prompts;
            return {
              slot: row.slot,
              label: nested?.label || row.prompt_id || `Prompt ${row.slot + 1}`,
              answer: row.answer,
            };
          }),
          builder: {
            id: ownerRow?.id ?? me.id,
            real_name: ownerRow?.real_name ?? me.realName,
            username: ownerRow?.username ?? me.username,
            photo_url: ownerRow?.photo_url ?? me.photoUrl,
            job: ownerRow?.job ?? me.job,
            workplace: ownerRow?.workplace ?? null,
          },
        },
      ]);
      setIndex(0);
      setLoading(false);
    })();
  }, [load, previewId, me.id, me.job, me.photoUrl, me.realName, me.username]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.get('welcome')) return;
    captureEvent('logged_in', { provider: 'oauth' });
    params.delete('welcome');
    const qs = params.toString();
    window.history.replaceState({}, '', `/discover${qs ? `?${qs}` : ''}`);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(t);
  }, [toast]);

  const visible = useMemo(
    () => deck.filter((row) => matches(row, cat, plat, stage)),
    [deck, cat, plat, stage],
  );
  const card = visible[index] ?? null;

  useEffect(() => {
    setIndex(0);
  }, [cat, plat, stage]);

  const advance = useCallback((appId: string) => {
    setHey(null);
    setNote('');
    setDeck((prev) => prev.filter((row) => row.app.id !== appId));
  }, []);

  const pass = useCallback(async () => {
    if (!card || busy) return;
    setBusy(true);
    const { error: err } = await createClient()
      .from('passes')
      .upsert({ user_id: me.id, app_id: card.app.id, reason: null });
    setBusy(false);
    if (err) {
      setToast(err.message);
      return;
    }
    captureEvent('app_passed', { app_id: card.app.id });
    advance(card.app.id);
  }, [advance, busy, card, me.id]);

  const sendHey = useCallback(
    async (target: Target, extra?: string) => {
      if (!card || busy) return;
      if (!me.primaryAppId) {
        setToast('Add your product on iOS first, then hey from web.');
        return;
      }
      setBusy(true);
      const { data, error: err } = await createClient().rpc('say_hey', {
        p_to_app_id: card.app.id,
        p_from_app_id: me.primaryAppId,
        p_target_type: target.type,
        p_target_label: target.label,
        p_note: extra || null,
      });
      setBusy(false);
      if (err) {
        setToast(err.message);
        return;
      }
      const result = (data ?? {}) as ActionResult;
      if (!result.status || result.status === 'blocked') {
        if (result.reason === 'daily_limit' || result.reason === 'match_limit') {
          window.location.href = '/pro';
          return;
        }
        else setToast(result.reason ?? 'That hey did not send.');
        return;
      }
      captureEvent('hey_sent', {
        app_id: card.app.id,
        target_type: target.type,
        target: target.label,
        has_note: Boolean(extra),
        matched: result.status === 'matched' || Boolean(result.match_id),
      });
      if (typeof left === 'number') setLeft(Math.max(0, left - 1));
      setToast(result.match_id ? `Matched with ${card.app.name}` : `Hey sent to ${card.app.name}`);
      advance(card.app.id);
    },
    [advance, busy, card, left, me.primaryAppId],
  );

  const playPitch = useCallback(() => {
    const video = pitchRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  }, []);

  const openLink = useCallback(() => {
    const url = card?.app.store_url;
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  }, [card]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        void pass();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (card) setHey({ type: 'app', label: card.app.name, body: card.app.subtitle });
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        playPitch();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        openLink();
      } else if (event.key === 'Escape') {
        setHey(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [card, openLink, pass, playPitch]);

  const icon = publicMediaUrl(card?.app.icon_path);
  const pitch = publicMediaUrl(card?.app.pitch_path);
  const shots = [...(card?.media ?? [])]
    .sort((a, b) => a.position - b.position)
    .filter((shot) => shot.storage_path !== card?.app.pitch_path && shot.storage_path !== card?.app.icon_path);
  const vertical = (card?.app.shot_layout ?? 'vertical') === 'vertical';
  const platforms = splitList(card?.app.platform);
  const chips = [
    ...(card?.app.category ? [{ label: card.app.category, kind: 'cat' as const }] : []),
    ...platforms.map((label) => ({ label, kind: 'plat' as const })),
    ...(card?.app.stage ? [{ label: card.app.stage, kind: 'stage' as const }] : []),
  ];
  const builderName =
    card?.builder?.real_name || (card?.builder?.username ? `@${card.builder.username}` : 'Builder');
  const builderPhoto = publicAvatarUrl(card?.builder?.photo_url);
  const prompts = card?.prompts ?? [];
  const heysLeft = left ?? me.counters?.heys_left;

  return (
    <>
      <main className="discover-main">
        <FilterChip />
        {previewId ? (
          <div className="preview-banner">
            Preview · this is what everyone else sees
            <a href={`/apps`}>Edit listing</a>
            <a href="/apps">Exit</a>
          </div>
        ) : null}
        <div
          className="discover-col"
          ref={colRef}
          onScroll={(event) => {
            const el = event.currentTarget;
            const max = el.scrollHeight - el.clientHeight;
            setProgress(max > 0 ? el.scrollTop / max : 0);
          }}
        >
          {loading ? <p className="empty">Loading listings…</p> : null}
          {error ? <p className="empty">{error}</p> : null}
          {!loading && !error && !card ? (
            <p className="empty">You&apos;re through this deck. Change filters or come back later.</p>
          ) : null}

          {card ? (
            <>
              <header className="listing-hero">
                <div className="icon-stack">
                  {icon ? (
                    <img src={icon} alt="" />
                  ) : (
                    <div className="icon-fallback" style={{ background: hueFill(card.app.hue) }}>
                      {initial(card.app.name)}
                    </div>
                  )}
                  {builderPhoto ? (
                    <img className="builder-pip" src={builderPhoto} alt="" />
                  ) : (
                    <span className="builder-pip fallback">{initial(builderName)}</span>
                  )}
                </div>
                <div>
                  <h1>{card.app.name}</h1>
                  <p>{card.app.subtitle}</p>
                  <small>made by {builderName}</small>
                </div>
              </header>

              {chips.length ? (
                <div className="chips">
                  {chips.map((chip) => (
                    <span key={`${chip.kind}-${chip.label}`} className="chip">
                      {chip.kind === 'plat' ? <PlatformMark label={chip.label} /> : null}
                      {chip.label}
                    </span>
                  ))}
                </div>
              ) : null}

              {card.app.description ? <p className="blurb">{card.app.description}</p> : null}

              {card.app.store_url ? (
                <div className="store-row">
                  <button className="store-pill" type="button" onClick={openLink}>
                    {host(card.app.store_url)} ↗ <kbd>↓</kbd>
                  </button>
                  <span>opens in a new tab</span>
                </div>
              ) : null}

              {pitch ? (
                <button className="pitch-card" type="button" onClick={playPitch}>
                  <video
                    ref={pitchRef}
                    className="pitch-thumb"
                    src={pitch}
                    playsInline
                    muted
                    preload="metadata"
                  />
                  <div>
                    <span className="eyebrow">Quick pitch</span>
                    <strong>Watch {builderName.split(' ')[0]}&apos;s quick pitch</strong>
                    <span className="muted">
                      {mmss(card.app.pitch_seconds ?? 0)} · press <kbd>↑</kbd> to play
                    </span>
                  </div>
                </button>
              ) : null}

              {shots.length ? (
                <div className={`shots ${vertical ? 'vertical' : 'horizontal'}`}>
                  {shots.map((shot) => {
                    const src = publicMediaUrl(shot.storage_path);
                    if (!src) return null;
                    const heyShot = () =>
                      setHey({ type: 'media', label: shot.label || 'Screenshot', body: shot.label ?? undefined });
                    return (
                      <button key={`${shot.position}-${shot.storage_path}`} className="shot" type="button" onClick={heyShot}>
                        {shot.kind === 'video' ? (
                          <video src={src} muted playsInline preload="metadata" />
                        ) : (
                          <img src={src} alt={shot.label ?? ''} />
                        )}
                        {shot.label ? <span>{shot.label}</span> : null}
                        <img className="shot-hey" src="/icons/hey.svg" alt="" />
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {prompts.map((item) => (
                <button
                  key={`${item.slot}-${item.label}`}
                  className="prompt-card"
                  type="button"
                  onClick={() => setHey({ type: 'prompt', label: item.label, body: item.answer })}
                >
                  <span className="eyebrow">{item.label}</span>
                  <p>{item.answer}</p>
                  <img className="shot-hey" src="/icons/hey.svg" alt="" />
                </button>
              ))}

              {card.app.problem_of ? (
                <div className="prompt-card">
                  <span className="eyebrow">This solves the problem of</span>
                  <p>{card.app.problem_of}</p>
                  {card.app.problem_for ? <p className="muted">For {card.app.problem_for}</p> : null}
                </div>
              ) : null}

              {card.app.pricing_model ? (
                <div className="prompt-card">
                  <span className="eyebrow">Pricing</span>
                  <p>{card.app.pricing_model}</p>
                  {card.app.price_from && card.app.pricing_model !== 'Free' ? (
                    <p className="muted">From {card.app.price_from}</p>
                  ) : null}
                </div>
              ) : null}

              {card.app.onboarding ? (
                <div className="prompt-card">
                  <span className="eyebrow">How people get started</span>
                  <p>{card.app.onboarding}</p>
                </div>
              ) : null}

              {card.app.ideal_users && (card.app.ideal_users.ages?.length || card.app.ideal_users.interests?.length || card.app.ideal_users.gender) ? (
                <div className="prompt-card">
                  <span className="eyebrow">Ideal users</span>
                  <div className="chips">
                    {(card.app.ideal_users.ages ?? []).map((item) => (
                      <span key={item} className="chip">{item}</span>
                    ))}
                    {card.app.ideal_users.gender ? <span className="chip">{card.app.ideal_users.gender}</span> : null}
                    {(card.app.ideal_users.devices ?? []).map((item) => (
                      <span key={item} className="chip">{item}</span>
                    ))}
                    {(card.app.ideal_users.interests ?? []).map((item) => (
                      <span key={item} className="chip accent">{item}</span>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        {previewId ? null : (
          <div className="heybar">
            <button className="heybar-pass" type="button" disabled={!card || busy} onClick={() => void pass()}>
              <img src="/icons/pass.svg" alt="" />
              <span>
                Pass <kbd>←</kbd>
              </span>
            </button>
            <span className="heybar-left">
              {typeof heysLeft === 'number' ? `${heysLeft} heys left` : 'Unlimited heys'}
            </span>
            <button
              className="heybar-hey"
              type="button"
              disabled={!card || busy}
              onClick={() => card && setHey({ type: 'app', label: card.app.name, body: card.app.subtitle })}
            >
              <img src="/icons/hey.svg" alt="" />
              <span>
                Say hey <kbd>→</kbd>
              </span>
            </button>
          </div>
        )}
        <div className="scroll-progress" aria-hidden>
          <span style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      </main>

      <aside className="builder-rail">
        {card ? (
          <>
            <div className="builder-card">
              <div className="builder-head">
                {builderPhoto ? (
                  <img src={builderPhoto} alt="" />
                ) : (
                  <span className="builder-fallback">{initial(builderName)}</span>
                )}
                <div>
                  <strong>{builderName}</strong>
                  <span>{card.builder?.job ?? 'Builder'}</span>
                </div>
              </div>
              {card.app.problem_for ? <p>{card.app.problem_for}</p> : null}
            </div>
            {pitch ? (
              <button className="pitch-mini" type="button" onClick={playPitch}>
                <video src={pitch} muted playsInline preload="metadata" />
                <div>
                  <span className="eyebrow">Quick pitch</span>
                  <strong>Watch {builderName.split(' ')[0]}&apos;s quick pitch</strong>
                  <span>{mmss(card.app.pitch_seconds ?? 0)}</span>
                </div>
              </button>
            ) : null}
            {card.app.feedback_wanted?.length ? (
              <div className="builder-card">
                <span className="eyebrow">Wants feedback on</span>
                <div className="chips">
                  {card.app.feedback_wanted.map((item) => (
                    <span key={item} className="chip accent">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </aside>

      {hey && card ? (
        <div className="modal-scrim" onClick={() => setHey(null)} role="presentation">
          <form
            className="hey-sheet"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              void sendHey(hey, note.trim());
            }}
          >
            <h2>
              Say hey to {card.app.name.split(':')[0]} about their{' '}
              {hey.type === 'app' ? 'app' : hey.type === 'prompt' ? 'prompt' : 'screenshot'}
            </h2>
            <p className="muted">{hey.body ?? hey.label}</p>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Add a note. Say what caught your eye."
              rows={4}
            />
            <div className="modal-actions">
              <button className="btn-line" type="button" onClick={() => setHey(null)}>
                Cancel
              </button>
              <button className="btn-accent" type="submit" disabled={busy}>
                {busy ? 'Sending…' : 'Send hey'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
    </>
  );
}
