'use client';

import { useMemo, useRef, useState } from 'react';

import { useMe } from '@/components/app/MeContext';
import { createClient } from '@/lib/supabase/client';
import { uploadChatFiles } from '@/lib/uploadMedia';

const KEEP = ['Yes', 'Maybe', 'No'] as const;
const PEACH = '#C45C2A';

function Karma({ earned, points = 2 }: { earned?: boolean; points?: number }) {
  return (
    <span className="karma-chip" style={{ color: earned ? PEACH : 'var(--mu)' }}>
      <KarmaMark />
      +{points}
    </span>
  );
}

function KarmaMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#F4C9B0" />
      <path d="M8 13.2c1.4 2.2 3.2 3.3 4.2 3.3 1.6 0 2.8-1.7 3.6-3.3.6-1.2.2-2.4-.8-2.4-.8 0-1.3.6-2.8.6s-2-.6-2.8-.6c-1 0-1.4 1.2-.6 2.4z" fill="#C45C2A" />
    </svg>
  );
}

export function FeedbackForm({
  matchId,
  appName,
  onClose,
  onSaved,
}: {
  matchId: string;
  appName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const me = useMe();
  const [stars, setStars] = useState(0);
  const [summary, setSummary] = useState('');
  const [keep, setKeep] = useState<(typeof KEEP)[number] | ''>('');
  const [keepWhy, setKeepWhy] = useState('');
  const [confusion, setConfusion] = useState('');
  const [bestMoment, setBestMoment] = useState('');
  const [bug, setBug] = useState('');
  const [shots, setShots] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [earned, setEarned] = useState(0);
  const shotRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const karma = useMemo(() => {
    const filled = [
      stars > 0 && !!summary.trim(),
      !!keep,
      !!keepWhy.trim(),
      !!confusion.trim(),
      !!bestMoment.trim(),
      !!bug.trim() || shots.length > 0 || !!video,
      !!price.trim(),
    ].filter(Boolean).length;
    return filled * 2;
  }, [bestMoment, bug, confusion, keep, keepWhy, price, shots.length, stars, summary, video]);

  const ready = stars > 0 && !!summary.trim() && !!keep;
  const short = appName.split(':')[0];

  if (earned) {
    return (
      <div className="modal-scrim" onClick={onClose} role="presentation">
        <div className="modal-card insights-modal" onClick={(event) => event.stopPropagation()} style={{ textAlign: 'center' }}>
          <KarmaMark size={44} />
          <h2 style={{ color: 'var(--at)' }}>+{earned} Block Points</h2>
          <p>You just shared your insight with {short}</p>
          <p className="muted">Thanks for helping and making the community stronger.</p>
          <button className="btn-accent" type="button" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-scrim" onClick={onClose} role="presentation">
      <form
        className="fb-sheet"
        onClick={(event) => event.stopPropagation()}
        onSubmit={async (event) => {
          event.preventDefault();
          if (!ready) {
            setError('Add a first impression and whether you’d keep using it');
            return;
          }
          setBusy(true);
          setError(null);
          const shotPaths = me.id ? await uploadChatFiles(me.id, shots, 'bug') : [];
          const videoPath =
            me.id && video ? (await uploadChatFiles(me.id, [video], 'feedback'))[0]?.storage_path : undefined;
          const { data, error: err } = await createClient().rpc('leave_feedback', {
            p_match_id: matchId,
            p_stars: stars,
            p_summary: summary.trim(),
            p_keep: keep,
            p_keep_why: keepWhy.trim() || null,
            p_confusion: confusion.trim() || null,
            p_best_moment: bestMoment.trim() || null,
            p_bug: bug.trim() || null,
            p_bug_shots: shotPaths.map((item) => item.storage_path),
            p_video_path: videoPath ?? null,
            p_price: price.trim() ? `$${price.trim()}/mo` : null,
          });
          setBusy(false);
          if (err) {
            setError(err.message);
            return;
          }
          const packed = data as { status?: string; reason?: string } | null;
          if (packed?.status === 'blocked') {
            setError(packed.reason ?? 'Could not save feedback.');
            return;
          }
          setEarned(karma);
          onSaved();
        }}
      >
        <div className="fb-sheet-top">
          <button className="text-btn" type="button" onClick={onClose}>
            Cancel
          </button>
          <span className="muted">~3 min</span>
        </div>
        <div className="fb-sheet-body">
          <h2>Feedback for {short}</h2>
          <p className="muted">They asked for feedback on anything.</p>

          <section className="fb-card">
            <div className="fb-label">
              First impression
              <Karma earned={stars > 0 && !!summary.trim()} />
            </div>
            <div className="impress-row">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={stars === value ? 'is-on' : undefined}
                  onClick={() => setStars(value)}
                >
                  {value}
                </button>
              ))}
            </div>
            <textarea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="And one sentence on why"
              rows={2}
            />
          </section>

          <section className="fb-card">
            <div className="fb-label">
              Would you keep using it?
              <Karma earned={!!keep} />
            </div>
            <div className="keep-pills">
              {KEEP.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={keep === option ? 'is-on' : undefined}
                  onClick={() => setKeep(option)}
                >
                  {option}
                </button>
              ))}
            </div>
            <textarea
              value={keepWhy}
              onChange={(event) => setKeepWhy(event.target.value)}
              placeholder="Help them with why"
              rows={2}
            />
          </section>

          <section className="fb-card">
            <div className="fb-label">
              Biggest confusion
              <Karma earned={!!confusion.trim()} />
            </div>
            <textarea
              value={confusion}
              onChange={(event) => setConfusion(event.target.value)}
              placeholder="Where did you stall?"
              rows={2}
            />
          </section>

          <section className="fb-card">
            <div className="fb-label">
              Best moment
              <Karma earned={!!bestMoment.trim()} />
            </div>
            <textarea
              value={bestMoment}
              onChange={(event) => setBestMoment(event.target.value)}
              placeholder="When did it click?"
              rows={2}
            />
          </section>

          <section className="fb-card">
            <div className="fb-label">
              Found a bug?
              <Karma earned={!!bug.trim() || shots.length > 0 || !!video} />
            </div>
            <textarea
              value={bug}
              onChange={(event) => setBug(event.target.value)}
              placeholder="What broke, and where"
              rows={2}
            />
            {shots.length ? (
              <div className="attach-chips">
                {shots.map((file, index) => (
                  <span key={`${file.name}-${index}`} className="attach-chip">
                    {file.name}
                    <button type="button" onClick={() => setShots((prev) => prev.filter((_, i) => i !== index))}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            <div className="fb-attach-row">
              <button className="pill-attach" type="button" onClick={() => shotRef.current?.click()}>
                {shots.length ? 'Add another screenshot' : '+ Add screenshots'}
              </button>
              <button className="pill-attach" type="button" onClick={() => videoRef.current?.click()}>
                {video ? 'Video note attached' : 'Video note reply'}
              </button>
            </div>
            <input
              ref={shotRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(event) => setShots((prev) => [...prev, ...Array.from(event.target.files ?? [])].slice(0, 6))}
            />
            <input
              ref={videoRef}
              type="file"
              accept="video/*"
              hidden
              onChange={(event) => setVideo(event.target.files?.[0] ?? null)}
            />
          </section>

          <section className="fb-card">
            <div className="fb-label">
              What would you pay?
              <Karma earned={!!price.trim()} />
            </div>
            <div className="price-row">
              <span>$</span>
              <input
                value={price}
                onChange={(event) => setPrice(event.target.value.replace(/[^0-9.]/g, ''))}
                placeholder="0"
                inputMode="decimal"
              />
              <span className="muted">/ month</span>
            </div>
          </section>
          {error ? <p className="muted">{error}</p> : null}
        </div>
        <div className="fb-sheet-foot">
          <button className="btn-accent" type="submit" disabled={busy || !ready}>
            {busy ? 'Sending…' : 'Send feedback'}
          </button>
          <p className="karma-earn">
            <KarmaMark size={22} />
            Earn +{karma} Block Points
          </p>
        </div>
      </form>
    </div>
  );
}
