'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { ALL_CATEGORIES, PLATS, STAGES } from '@/components/app/Filters';
import { PlatformMark } from '@/components/app/Marks';
import { useIos } from '@/components/app/IosModal';
import { useMe } from '@/components/app/MeContext';
import { hueFill, initial } from '@/lib/format';
import type { OwnedApp } from '@/lib/loop';
import {
  AGES,
  DEFAULT_LAYOUT,
  DEVICES,
  FEEDBACK_AREAS,
  GENDERS,
  IDEAL_USERS,
  INTEGRATIONS,
  PRICING_MODELS,
  PROMPT_LIBRARY,
  promptLabel,
} from '@/lib/prompts';
import { publicAvatarUrl, publicMediaUrl } from '@/lib/site';
import { createClient } from '@/lib/supabase/client';
import { uploadChatFiles } from '@/lib/uploadMedia';

type PromptRow = { slot: number; prompt_id: string; label: string; answer: string };
type MediaRow = { storage_path: string; kind: string; label?: string | null; position: number };
type Conn = { provider: string; badge: string; detail?: string | null };

const SECTION_NAME: Record<string, string> = {
  pitch: 'Quick pitch',
  shots: 'Screenshots',
  problem: 'Problem',
  builder: 'Builder',
  looking: 'Ideal users',
  stats: 'Stats',
  pricing: 'Pricing',
  onboarding: 'Onboarding',
  verified: 'Verified',
  p0: 'Prompt 1',
  p1: 'Prompt 2',
  p2: 'Prompt 3',
  p3: 'Prompt 4',
  p4: 'Prompt 5',
};

export function ListingEditor({
  appId,
  onClose,
}: {
  appId: string;
  onClose: () => void;
}) {
  const me = useMe();
  const { openIos } = useIos();
  const [app, setApp] = useState<OwnedApp | null>(null);
  const [media, setMedia] = useState<MediaRow[]>([]);
  const [prompts, setPrompts] = useState<PromptRow[]>([]);
  const [connections, setConnections] = useState<Conn[]>([]);
  const [edit, setEdit] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const db = createClient();
    const [{ data: row }, { data: shots }, { data: promptRows }, { data: conns }] = await Promise.all([
      db.from('apps').select('*').eq('id', appId).maybeSingle(),
      db.from('app_media').select('storage_path, kind, label, position').eq('app_id', appId).order('position'),
      db.from('app_prompts').select('slot, answer, prompt_id').eq('app_id', appId).order('slot'),
      db.from('app_connections').select('provider, badge, detail').eq('app_id', appId),
    ]);
    if (row) setApp(row as OwnedApp);
    setMedia((shots ?? []) as MediaRow[]);
    setPrompts(
      ((promptRows ?? []) as { slot: number; answer: string; prompt_id: string }[]).map((item) => ({
        ...item,
        label: promptLabel(item.prompt_id),
      })),
    );
    setConnections((conns ?? []) as Conn[]);
  }, [appId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saveApp = async (patch: Record<string, unknown>) => {
    setBusy(true);
    const { error: err } = await createClient().from('apps').update(patch).eq('id', appId);
    setBusy(false);
    if (err) {
      setError(err.message);
      return false;
    }
    await reload();
    return true;
  };

  const layout = useMemo(() => {
    const stored = app?.layout?.filter(Boolean) ?? [];
    return stored.length ? stored : [...DEFAULT_LAYOUT];
  }, [app?.layout]);

  const move = async (index: number, dir: -1 | 1) => {
    const next = [...layout];
    const swap = index + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    await saveApp({ layout: next });
  };

  if (!app) return <div className="edit-listing"><p className="empty">Loading listing…</p></div>;

  const icon = publicMediaUrl(app.icon_path);
  const pitch = publicMediaUrl(app.pitch_path);
  const shots = media.filter((shot) => shot.storage_path !== app.pitch_path);
  const vertical = (app.shot_layout ?? 'vertical') === 'vertical';
  const platforms = (app.platform ?? '').split(/[,·]/).map((item) => item.trim()).filter(Boolean);
  const chips = [
    ...(app.category ? [app.category] : []),
    ...platforms,
    ...(app.stage ? [app.stage] : []),
  ];

  return (
    <div className="edit-listing">
      <div className="edit-listing-bar">
        <button className="text-btn" type="button" onClick={onClose}>
          Done
        </button>
        <strong style={{ flex: 1 }}>{app.name}</strong>
        <span className="muted">Tap a section to edit · arrows reorder</span>
      </div>
      <div className="edit-listing-body">
        <div className="discover-col" style={{ width: 600, maxWidth: '100%' }}>
          <Chrome label="Listing" onEdit={() => setEdit('listing')}>
            <header className="listing-hero">
              <div className="icon-stack">
                {icon ? (
                  <img src={icon} alt="" />
                ) : (
                  <div className="icon-fallback" style={{ background: hueFill(app.hue ?? 140) }}>
                    {initial(app.name)}
                  </div>
                )}
                {publicAvatarUrl(me.photoUrl) ? (
                  <img className="builder-pip" src={publicAvatarUrl(me.photoUrl)!} alt="" />
                ) : (
                  <span className="builder-pip fallback">{initial(me.realName ?? 'You')}</span>
                )}
              </div>
              <div>
                <h1>{app.name}</h1>
                <p>{app.subtitle}</p>
                <small>made by {me.realName ?? 'You'}</small>
              </div>
            </header>
            {chips.length ? (
              <div className="chips">
                {chips.map((chip) => (
                  <span key={chip} className="chip">
                    <PlatformMark label={chip} />
                    {chip}
                  </span>
                ))}
              </div>
            ) : null}
            {app.description ? <p className="blurb">{app.description}</p> : null}
            {app.store_url ? (
              <div className="store-row">
                <span className="store-pill">{app.store_url.replace(/^https?:\/\//, '').split('/')[0]} ↗</span>
              </div>
            ) : null}
          </Chrome>

          {layout.map((section, index) => (
            <div key={section} className="section-edit-wrap">
              <div className="section-edit">
                <span className="eyebrow">{SECTION_NAME[section] ?? section}</span>
                <button type="button" onClick={() => void move(index, -1)} aria-label="Move up">
                  ↑
                </button>
                <button type="button" onClick={() => void move(index, 1)} aria-label="Move down">
                  ↓
                </button>
              </div>
              {section === 'pitch' ? (
                pitch ? (
                  <Chrome label="Retake pitch" onEdit={() => setEdit('pitch')}>
                    <div className="pitch-card">
                      <video className="pitch-thumb" src={pitch} muted playsInline preload="metadata" />
                      <div>
                        <span className="eyebrow">Quick pitch</span>
                        <strong>Watch {(me.realName ?? 'You').split(' ')[0]}&apos;s quick pitch</strong>
                      </div>
                    </div>
                  </Chrome>
                ) : (
                  <button className="add-tile" type="button" onClick={() => setEdit('pitch')}>
                    + Record a quick pitch
                  </button>
                )
              ) : null}
              {section === 'shots' ? (
                shots.length ? (
                  <Chrome label="Edit screenshots" onEdit={() => setEdit('shots')}>
                    <div className={`shots ${vertical ? 'vertical' : 'horizontal'}`}>
                      {shots.map((shot) => {
                        const src = publicMediaUrl(shot.storage_path);
                        if (!src) return null;
                        return (
                          <div key={`${shot.position}-${shot.storage_path}`} className="shot">
                            {shot.kind === 'video' ? <video src={src} muted playsInline /> : <img src={src} alt="" />}
                            {shot.label ? <span>{shot.label}</span> : null}
                          </div>
                        );
                      })}
                    </div>
                  </Chrome>
                ) : (
                  <button className="add-tile" type="button" onClick={() => setEdit('shots')}>
                    + Add screenshots
                  </button>
                )
              ) : null}
              {section === 'problem' ? (
                app.problem_of || app.problem_for ? (
                  <Chrome label="Edit problem" onEdit={() => setEdit('problem')}>
                    <div className="prompt-card">
                      <span className="eyebrow">This solves the problem of</span>
                      <p>{app.problem_of}</p>
                      {app.problem_for ? <p className="muted">For {app.problem_for}</p> : null}
                    </div>
                  </Chrome>
                ) : (
                  <button className="add-tile" type="button" onClick={() => setEdit('problem')}>
                    + Add the problem
                  </button>
                )
              ) : null}
              {/^p\d+$/.test(section) ? (
                (() => {
                  const prompt = prompts.find((item) => item.slot === Number(section.slice(1)));
                  return prompt ? (
                    <Chrome label="Edit prompt" onEdit={() => setEdit(section)}>
                      <div className="prompt-card">
                        <span className="eyebrow">{prompt.label}</span>
                        <p>{prompt.answer}</p>
                      </div>
                    </Chrome>
                  ) : (
                    <button className="add-tile" type="button" onClick={() => setEdit(section)}>
                      + Add prompt
                    </button>
                  );
                })()
              ) : null}
              {section === 'builder' ? (
                <Chrome label="Edit builder card" onEdit={() => setEdit('builder')}>
                  <div className="builder-card">
                    <div className="builder-head">
                      {publicAvatarUrl(me.photoUrl) ? (
                        <img src={publicAvatarUrl(me.photoUrl)!} alt="" />
                      ) : (
                        <span className="builder-fallback">{initial(me.realName ?? 'You')}</span>
                      )}
                      <div>
                        <strong>{me.realName ?? 'You'}</strong>
                        <span>{me.job ?? 'Builder'}</span>
                      </div>
                    </div>
                  </div>
                </Chrome>
              ) : null}
              {section === 'looking' ? (
                <Chrome label="Edit ideal users" onEdit={() => setEdit('looking')}>
                  <div className="prompt-card">
                    <span className="eyebrow">Ideal users</span>
                    <div className="chips">
                      {(app.ideal_users?.ages ?? []).map((item) => (
                        <span key={item} className="chip">{item}</span>
                      ))}
                      {app.ideal_users?.gender ? <span className="chip">{app.ideal_users.gender}</span> : null}
                      {(app.ideal_users?.devices ?? []).map((item) => (
                        <span key={item} className="chip">{item}</span>
                      ))}
                      {(app.ideal_users?.interests ?? []).map((item) => (
                        <span key={item} className="chip accent">{item}</span>
                      ))}
                      {(app.feedback_wanted ?? []).map((item) => (
                        <span key={item} className="chip">{item}</span>
                      ))}
                    </div>
                  </div>
                </Chrome>
              ) : null}
              {section === 'pricing' ? (
                app.pricing_model ? (
                  <Chrome label="Edit pricing" onEdit={() => setEdit('pricing')}>
                    <div className="prompt-card">
                      <span className="eyebrow">Pricing</span>
                      <p>{app.pricing_model}</p>
                      {app.price_from ? <p className="muted">From {app.price_from}</p> : null}
                    </div>
                  </Chrome>
                ) : (
                  <button className="add-tile" type="button" onClick={() => setEdit('pricing')}>
                    + Add pricing
                  </button>
                )
              ) : null}
              {section === 'onboarding' ? (
                app.onboarding ? (
                  <Chrome label="Edit onboarding" onEdit={() => setEdit('onboarding')}>
                    <div className="prompt-card">
                      <span className="eyebrow">How people get started</span>
                      <p>{app.onboarding}</p>
                    </div>
                  </Chrome>
                ) : (
                  <button className="add-tile" type="button" onClick={() => setEdit('onboarding')}>
                    + Add onboarding
                  </button>
                )
              ) : null}
              {section === 'stats' ? (
                <div className="prompt-card">
                  <span className="eyebrow">Your stats</span>
                  <p className="muted">Views, heys and trades update from live usage. They stay on this listing the way they do on iOS.</p>
                </div>
              ) : null}
              {section === 'verified' ? (
                <Chrome label="Verifications" onEdit={() => setEdit('verified')}>
                  <div className="prompt-card">
                    <span className="eyebrow">Verified</span>
                    {connections.length ? (
                      connections.map((row) => <p key={row.provider}>{row.badge}{row.detail ? ` · ${row.detail}` : ''}</p>)
                    ) : (
                      <p className="muted">{INTEGRATIONS.length} connections live on iOS</p>
                    )}
                    {(app.badges ?? []).map((badge) => (
                      <p key={badge}>{badge}</p>
                    ))}
                  </div>
                </Chrome>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {edit === 'listing' ? (
        <ListingSheet
          app={app}
          busy={busy}
          error={error}
          onClose={() => setEdit(null)}
          onSave={async (patch) => {
            if (await saveApp(patch)) setEdit(null);
          }}
        />
      ) : null}
      {edit === 'pitch' ? (
        <FileSheet
          title="Quick pitch"
          accept="video/*"
          busy={busy}
          onClose={() => setEdit(null)}
          onPick={async (files) => {
            if (!me.id || !files[0]) return;
            setBusy(true);
            const uploaded = await uploadChatFiles(me.id, files.slice(0, 1), 'pitch');
            const path = uploaded[0]?.storage_path;
            setBusy(false);
            if (path && (await saveApp({ pitch_path: path }))) setEdit(null);
          }}
        />
      ) : null}
      {edit === 'shots' ? (
        <FileSheet
          title="Screenshots"
          accept="image/*,video/*"
          multiple
          busy={busy}
          onClose={() => setEdit(null)}
          onPick={async (files) => {
            if (!me.id) return;
            setBusy(true);
            const uploaded = await uploadChatFiles(me.id, files.slice(0, 6), 'shot');
            const db = createClient();
            const start = media.length;
            await Promise.all(
              uploaded.map((item, index) =>
                db.from('app_media').upsert({
                  app_id: appId,
                  position: start + index,
                  kind: item.kind,
                  storage_path: item.storage_path,
                  label: item.label?.slice(0, 40) ?? null,
                }),
              ),
            );
            setBusy(false);
            await reload();
            setEdit(null);
          }}
        />
      ) : null}
      {edit === 'problem' ? (
        <TextSheet
          title="Problem"
          fields={[
            { key: 'problem_of', label: 'This solves the problem of', value: app.problem_of ?? '' },
            { key: 'problem_for', label: 'For', value: app.problem_for ?? '' },
          ]}
          busy={busy}
          onClose={() => setEdit(null)}
          onSave={async (values) => {
            if (await saveApp(values)) setEdit(null);
          }}
        />
      ) : null}
      {edit && /^p\d+$/.test(edit) ? (
        <PromptSheet
          slot={Number(edit.slice(1))}
          current={prompts.find((item) => item.slot === Number(edit.slice(1)))}
          used={prompts.map((item) => item.prompt_id)}
          busy={busy}
          onClose={() => setEdit(null)}
          onSave={async (promptId, answer) => {
            setBusy(true);
            const { error: err } = await createClient().from('app_prompts').upsert({
              app_id: appId,
              slot: Number(edit.slice(1)),
              prompt_id: promptId,
              answer,
            });
            setBusy(false);
            if (err) {
              setError(err.message);
              return;
            }
            await reload();
            setEdit(null);
          }}
        />
      ) : null}
      {edit === 'looking' ? (
        <LookingSheet
          app={app}
          busy={busy}
          onClose={() => setEdit(null)}
          onSave={async (patch) => {
            if (await saveApp(patch)) setEdit(null);
          }}
        />
      ) : null}
      {edit === 'pricing' ? (
        <PricingSheet
          app={app}
          busy={busy}
          onClose={() => setEdit(null)}
          onSave={async (patch) => {
            if (await saveApp(patch)) setEdit(null);
          }}
        />
      ) : null}
      {edit === 'onboarding' ? (
        <TextSheet
          title="Onboarding"
          fields={[{ key: 'onboarding', label: 'How people get started', value: app.onboarding ?? '' }]}
          busy={busy}
          onClose={() => setEdit(null)}
          onSave={async (values) => {
            if (await saveApp(values)) setEdit(null);
          }}
        />
      ) : null}
      {edit === 'verified' || edit === 'builder' ? (
        <div className="modal-scrim" onClick={() => setEdit(null)} role="presentation">
          <div className="edit-sheet" onClick={(event) => event.stopPropagation()}>
            <h2>{edit === 'verified' ? 'Verifications' : 'Builder profile'}</h2>
            <p className="muted">
              {edit === 'verified'
                ? 'GitHub, Stripe and RevenueCat connect on iOS so badges stay verified.'
                : 'Name, photo and job edit in Profile. The listing uses the same card.'}
            </p>
            {edit === 'verified'
              ? INTEGRATIONS.map((item) => {
                  const connected = connections.find((row) => row.provider === item.key);
                  return (
                    <div key={item.key} className="feedback-card">
                      <strong>{item.name}</strong>
                      <p className="muted">{connected?.badge ?? item.desc}</p>
                    </div>
                  );
                })
              : null}
            <div className="modal-actions">
              <button className="btn-line" type="button" onClick={() => setEdit(null)}>
                Close
              </button>
              <button className="btn-accent" type="button" onClick={openIos}>
                Continue on iOS
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Chrome({ label, onEdit, children }: { label: string; onEdit: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onEdit} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 0, color: 'inherit', cursor: 'pointer', padding: 0 }} aria-label={label}>
      {children}
    </button>
  );
}

function ListingSheet({
  app,
  busy,
  error,
  onClose,
  onSave,
}: {
  app: OwnedApp;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (patch: Record<string, unknown>) => void;
}) {
  const [name, setName] = useState(app.name);
  const [subtitle, setSubtitle] = useState(app.subtitle ?? '');
  const [description, setDescription] = useState(app.description ?? '');
  const [category, setCategory] = useState(app.category ?? ALL_CATEGORIES[0]);
  const [platform, setPlatform] = useState(app.platform ?? 'iPhone');
  const [stage, setStage] = useState(app.stage ?? STAGES[0]);
  const [store, setStore] = useState(app.store_url ?? '');
  return (
    <div className="modal-scrim" onClick={onClose} role="presentation">
      <form
        className="edit-sheet"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          onSave({ name, subtitle, description, category, platform, stage, store_url: store || null });
        }}
      >
        <h2>Listing</h2>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" />
        <input value={subtitle} onChange={(event) => setSubtitle(event.target.value)} placeholder="One-line subtitle" />
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder="Description" />
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          {ALL_CATEGORIES.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <select value={platform} onChange={(event) => setPlatform(event.target.value)}>
          {PLATS.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <select value={stage} onChange={(event) => setStage(event.target.value)}>
          {STAGES.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <input value={store} onChange={(event) => setStore(event.target.value)} placeholder="Store or site URL" />
        {error ? <p className="muted">{error}</p> : null}
        <div className="modal-actions">
          <button className="btn-line" type="button" onClick={onClose}>Cancel</button>
          <button className="btn-accent" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}

function TextSheet({
  title,
  fields,
  busy,
  onClose,
  onSave,
}: {
  title: string;
  fields: { key: string; label: string; value: string }[];
  busy: boolean;
  onClose: () => void;
  onSave: (values: Record<string, string>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((field) => [field.key, field.value])),
  );
  return (
    <div className="modal-scrim" onClick={onClose} role="presentation">
      <form
        className="edit-sheet"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          onSave(values);
        }}
      >
        <h2>{title}</h2>
        {fields.map((field) => (
          <label key={field.key}>
            <span className="eyebrow">{field.label}</span>
            <textarea
              value={values[field.key] ?? ''}
              onChange={(event) => setValues((prev) => ({ ...prev, [field.key]: event.target.value }))}
              rows={3}
            />
          </label>
        ))}
        <div className="modal-actions">
          <button className="btn-line" type="button" onClick={onClose}>Cancel</button>
          <button className="btn-accent" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}

function FileSheet({
  title,
  accept,
  multiple,
  busy,
  onClose,
  onPick,
}: {
  title: string;
  accept: string;
  multiple?: boolean;
  busy: boolean;
  onClose: () => void;
  onPick: (files: File[]) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="modal-scrim" onClick={onClose} role="presentation">
      <div className="edit-sheet" onClick={(event) => event.stopPropagation()}>
        <h2>{title}</h2>
        <p className="muted">This is the same media that shows in Discover.</p>
        <button className="btn-accent" type="button" disabled={busy} onClick={() => ref.current?.click()}>
          {busy ? 'Uploading…' : 'Choose files'}
        </button>
        <input
          ref={ref}
          type="file"
          accept={accept}
          multiple={multiple}
          hidden
          onChange={(event) => onPick(Array.from(event.target.files ?? []))}
        />
        <button className="btn-line" type="button" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

function PromptSheet({
  slot,
  current,
  used,
  busy,
  onClose,
  onSave,
}: {
  slot: number;
  current?: PromptRow;
  used: string[];
  busy: boolean;
  onClose: () => void;
  onSave: (promptId: string, answer: string) => void;
}) {
  const [promptId, setPromptId] = useState(current?.prompt_id ?? '');
  const [answer, setAnswer] = useState(current?.answer ?? '');
  const options = PROMPT_LIBRARY.filter((item) => item.id === promptId || !used.includes(item.id));
  return (
    <div className="modal-scrim" onClick={onClose} role="presentation">
      <form
        className="edit-sheet"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          if (promptId && answer.trim()) onSave(promptId, answer.trim());
        }}
      >
        <h2>Prompt {slot + 1}</h2>
        <div className="chip-select">
          {options.map((item) => (
            <button key={item.id} type="button" className={promptId === item.id ? 'is-on' : undefined} onClick={() => setPromptId(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} rows={4} placeholder="Your answer" maxLength={225} />
        <div className="modal-actions">
          <button className="btn-line" type="button" onClick={onClose}>Cancel</button>
          <button className="btn-accent" type="submit" disabled={busy || !promptId || !answer.trim()}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}

function LookingSheet({
  app,
  busy,
  onClose,
  onSave,
}: {
  app: OwnedApp;
  busy: boolean;
  onClose: () => void;
  onSave: (patch: Record<string, unknown>) => void;
}) {
  const [ages, setAges] = useState<string[]>(app.ideal_users?.ages ?? []);
  const [gender, setGender] = useState(app.ideal_users?.gender ?? 'Anyone');
  const [devices, setDevices] = useState<string[]>(app.ideal_users?.devices ?? []);
  const [interests, setInterests] = useState<string[]>(app.ideal_users?.interests ?? []);
  const [wanted, setWanted] = useState<string[]>(app.feedback_wanted ?? []);
  const toggle = (list: string[], value: string, set: (next: string[]) => void) =>
    set(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  return (
    <div className="modal-scrim" onClick={onClose} role="presentation">
      <form
        className="edit-sheet"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          onSave({
            ideal_users: { ages, gender, devices, interests },
            feedback_wanted: wanted,
          });
        }}
      >
        <h2>Ideal users</h2>
        <span className="eyebrow">Age</span>
        <div className="chip-select">
          {AGES.map((item) => (
            <button key={item} type="button" className={ages.includes(item) ? 'is-on' : undefined} onClick={() => toggle(ages, item, setAges)}>{item}</button>
          ))}
        </div>
        <span className="eyebrow">Gender</span>
        <div className="chip-select">
          {GENDERS.map((item) => (
            <button key={item} type="button" className={gender === item ? 'is-on' : undefined} onClick={() => setGender(item)}>{item}</button>
          ))}
        </div>
        <span className="eyebrow">On</span>
        <div className="chip-select">
          {DEVICES.map((item) => (
            <button key={item} type="button" className={devices.includes(item) ? 'is-on' : undefined} onClick={() => toggle(devices, item, setDevices)}>{item}</button>
          ))}
        </div>
        <span className="eyebrow">Into</span>
        <div className="chip-select">
          {IDEAL_USERS.map((item) => (
            <button key={item} type="button" className={interests.includes(item) ? 'is-on' : undefined} onClick={() => toggle(interests, item, setInterests)}>{item}</button>
          ))}
        </div>
        <span className="eyebrow">Wants feedback on</span>
        <div className="chip-select">
          {FEEDBACK_AREAS.map((item) => (
            <button key={item} type="button" className={wanted.includes(item) ? 'is-on' : undefined} onClick={() => toggle(wanted, item, setWanted)}>{item}</button>
          ))}
        </div>
        <div className="modal-actions">
          <button className="btn-line" type="button" onClick={onClose}>Cancel</button>
          <button className="btn-accent" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}

function PricingSheet({
  app,
  busy,
  onClose,
  onSave,
}: {
  app: OwnedApp;
  busy: boolean;
  onClose: () => void;
  onSave: (patch: Record<string, unknown>) => void;
}) {
  const [model, setModel] = useState(app.pricing_model ?? 'Free');
  const [from, setFrom] = useState(app.price_from ?? '');
  return (
    <div className="modal-scrim" onClick={onClose} role="presentation">
      <form
        className="edit-sheet"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          onSave({ pricing_model: model, price_from: model === 'Free' ? null : from || null });
        }}
      >
        <h2>Pricing</h2>
        <div className="chip-select">
          {PRICING_MODELS.map((item) => (
            <button key={item} type="button" className={model === item ? 'is-on' : undefined} onClick={() => setModel(item)}>{item}</button>
          ))}
        </div>
        {model !== 'Free' ? <input value={from} onChange={(event) => setFrom(event.target.value)} placeholder="From $4.99/mo" /> : null}
        <div className="modal-actions">
          <button className="btn-line" type="button" onClick={onClose}>Cancel</button>
          <button className="btn-accent" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}
