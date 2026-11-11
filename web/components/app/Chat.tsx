'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { FeedbackForm } from '@/components/app/FeedbackForm';
import { AppPeek, BuilderCard, Slideout } from '@/components/app/Slideout';
import { useMe } from '@/components/app/MeContext';
import { OverlapAvatars } from '@/components/app/Overlap';
import { captureEvent } from '@/lib/analytics';
import { EMOJI_TRAY } from '@/lib/emoji';
import { hueFill, initial, timeAgo } from '@/lib/format';
import type { ActionResult, ChatMessage, ThreadRow } from '@/lib/loop';
import { publicAvatarUrl, publicMediaUrl } from '@/lib/site';
import { createClient } from '@/lib/supabase/client';
import { sampleMessages, sampleThread } from '@/lib/sampleInbox';
import { uploadChatFiles } from '@/lib/uploadMedia';

const REPORT_REASONS = [
  'Spam or self-promotion',
  'Harassment or hate',
  'Sexual or explicit content',
  'Scam or fraud',
  'Impersonation',
  'Something else',
];

export function Chat() {
  const me = useMe();
  const params = useSearchParams();
  const matchParam = params.get('match');
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [active, setActive] = useState<string | null>(matchParam);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [sheet, setSheet] = useState<'builder' | 'app' | null>(null);
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState(false);
  const [feedback, setFeedback] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareCode, setShareCode] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottom = useRef<HTMLDivElement>(null);

  const loadThreads = useCallback(async () => {
    const { data, error } = await createClient().rpc('my_threads');
    if (error) {
      setToast(error.message);
      setThreads([]);
      setLoading(false);
      return;
    }
    const rows = Array.isArray(data) ? (data as ThreadRow[]) : [];
    const seeded = matchParam?.startsWith('sample-match-') ? sampleThread(matchParam) : null;
    setThreads(seeded && !rows.some((row) => row.match_id === seeded.match_id) ? [seeded, ...rows] : rows);
    setLoading(false);
    setActive((current) => matchParam ?? current ?? rows[0]?.match_id ?? seeded?.match_id ?? null);
  }, [matchParam]);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  const thread = useMemo(() => threads.find((row) => row.match_id === active) ?? null, [threads, active]);

  const loadMessages = useCallback(async (matchId: string) => {
    if (matchId.startsWith('sample-match-')) {
      setMessages(sampleMessages(matchId));
      return;
    }
    const { data, error } = await createClient().rpc('match_messages', { p_match_id: matchId });
    if (error) {
      setToast(error.message);
      return;
    }
    const rows = Array.isArray(data) ? (data as ChatMessage[]) : [];
    setMessages(rows);
    await createClient().rpc('mark_thread_read', { p_match_id: matchId });
  }, []);

  useEffect(() => {
    if (!active) {
      setMessages([]);
      return;
    }
    void loadMessages(active);
  }, [active, loadMessages]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    setShareUrl(thread?.share_mine_url ?? '');
    setShareCode(thread?.share_mine_code ?? '');
  }, [thread?.match_id, thread?.share_mine_code, thread?.share_mine_url]);

  const send = useCallback(async () => {
    if (!active || busy) return;
    const body = draft.trim();
    if (!body && !files.length) return;
    setDraft('');
    setBusy(true);
    const pending = files;
    setFiles([]);
    const attachments = me.id && !active.startsWith('sample-match-') ? await uploadChatFiles(me.id, pending) : [];
    if (active.startsWith('sample-match-')) {
      setBusy(false);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          body: body || null,
          mine: true,
          created_at: new Date().toISOString(),
          media: pending.map((file) => ({ storage_path: URL.createObjectURL(file), kind: file.type.startsWith('video/') ? 'video' : 'image' })),
        },
      ]);
      return;
    }
    const payload = {
      p_match_id: active,
      p_body: body || null,
      p_media: attachments,
      p_reply_to: null as string | null,
    };
    let { data, error } = await createClient().rpc('send_message', payload);
    if (error && /could not find the function|ambiguous/i.test(error.message)) {
      ({ data, error } = await createClient().rpc('send_message', {
        p_match_id: active,
        p_body: body || null,
        p_media: attachments,
      }));
    }
    setBusy(false);
    if (error) {
      setDraft(body);
      setFiles(pending);
      setToast(error.message);
      return;
    }
    const result = (typeof data === 'string' ? JSON.parse(data) : (data ?? {})) as ActionResult;
    if (result.status && result.status !== 'sent' && result.status !== 'ok') {
      setDraft(body);
      setFiles(pending);
      setToast(result.reason === 'empty' ? 'Write a message or attach a file.' : result.reason ?? 'That did not send.');
      return;
    }
    captureEvent('message_sent', { match_id: active, has_media: attachments.length > 0 });
    setMessages((prev) => [
      ...prev,
      {
        id: result.message_id ?? crypto.randomUUID(),
        body: body || null,
        mine: true,
        created_at: new Date().toISOString(),
        media: attachments,
      },
    ]);
    void loadThreads();
  }, [active, busy, draft, files, loadThreads, me.id]);

  const them = thread?.builder?.real_name || (thread?.builder?.username ? `@${thread.builder.username}` : 'Match');
  const photo = thread?.builder?.photo_url
    ? publicAvatarUrl(thread.builder.photo_url) ?? publicMediaUrl(thread.builder.photo_url)
    : null;
  const appIcon = publicMediaUrl(thread?.their_app?.app.icon_path);
  const appName = thread?.their_app?.app.name ?? 'their app';

  const more = async (kind: 'block' | 'unmatch' | 'hide' | 'report', reason?: string) => {
    if (!thread) return;
    setMenu(false);
    const db = createClient();
    if (kind === 'block' && thread.builder?.id) {
      const { error } = await db.rpc('block_user', { p_user_id: thread.builder.id });
      setToast(error?.message ?? `Blocked ${them}`);
    } else if (kind === 'unmatch') {
      const { error } = await db.rpc('unmatch_user', { p_match_id: thread.match_id });
      setToast(error?.message ?? 'Unmatched');
    } else if (kind === 'hide') {
      const { error } = await db.rpc('hide_thread', { p_match_id: thread.match_id });
      setToast(error?.message ?? 'Chat deleted');
    } else if (kind === 'report' && thread.builder?.id) {
      const { error } = await db.rpc('report_content', {
        p_subject_type: 'user',
        p_subject_id: thread.builder.id,
        p_subject_user_id: thread.builder.id,
        p_reason: reason ?? 'Something else',
      });
      setToast(error?.message ?? 'Reported');
    }
    await loadThreads();
  };

  const saveShare = async () => {
    if (!thread) return;
    const { error } = await createClient().rpc('set_match_share', {
      p_match_id: thread.match_id,
      p_url: shareUrl || null,
      p_code: shareCode || null,
    });
    setToast(error?.message ?? 'Saved links');
    await loadThreads();
  };

  return (
    <div className="pane-shell chat-shell">
      <aside className="pane-list">
        <div className="pane-list-head">
          <h1>Chat</h1>
          <div className="pane-tabs">
            <span className="is-on">DMs</span>
            <Link href="/community">Community</Link>
          </div>
        </div>
        <div className="pane-scroll">
          {loading ? <p className="empty">Loading chats…</p> : null}
          {!loading && !threads.length ? <p className="empty">Matches land here after a hey back.</p> : null}
          {threads.map((row) => {
            const name = row.builder?.real_name || row.builder?.username || row.their_app?.app.name || 'Match';
            return (
              <button
                key={row.match_id}
                type="button"
                className={`row-card${active === row.match_id ? ' is-on' : ''}`}
                onClick={() => setActive(row.match_id)}
              >
                <OverlapAvatars
                  person={name}
                  personSrc={publicAvatarUrl(row.builder?.photo_url)}
                  app={row.their_app?.app.name ?? 'App'}
                  appSrc={publicMediaUrl(row.their_app?.app.icon_path)}
                  appHue={row.their_app?.app.hue}
                  size={48}
                />
                <div className="row-copy">
                  <strong>{name}</strong>
                  <span>{row.last_message?.body || row.their_app?.app.name || 'Say hey'}</span>
                </div>
                {row.unread ? <span className="unread-dot" /> : <em>{timeAgo(row.last_message_at ?? row.created_at)}</em>}
              </button>
            );
          })}
        </div>
      </aside>

      <section className="pane-main chat-main">
        {thread ? (
          <>
            <div className="chat-head">
              <div className="chat-who">
                <OverlapAvatars
                  person={them}
                  personSrc={photo}
                  app={appName}
                  appSrc={appIcon}
                  appHue={thread.their_app?.app.hue}
                  size={40}
                />
                <div>
                  <button type="button" className="text-link" onClick={() => setSheet('builder')}>
                    <strong>{them}</strong>
                  </button>
                  <span className="muted">
                    <button type="button" className="text-link" onClick={() => setSheet('app')}>
                      {appName}
                    </button>
                    {me.primaryAppName ? ` · matched via ${me.primaryAppName}` : ''}
                  </span>
                </div>
              </div>
              <button className="btn-ink chat-fb" type="button" onClick={() => setFeedback(true)}>
                Give feedback
              </button>
              <div className="more-wrap">
                <button className="more-btn" type="button" onClick={() => setMenu((value) => !value)} aria-label="More">
                  ···
                </button>
                {menu ? (
                  <div className="more-menu">
                    <button type="button" onClick={() => { setMenu(false); setSheet('app'); }}>
                      View {appName}
                    </button>
                    <button type="button" onClick={() => { setMenu(false); setSheet('builder'); }}>
                      {them.split(' ')[0]}&apos;s profile
                    </button>
                    {thread.their_app?.app.store_url ? (
                      <a href={thread.their_app.app.store_url} target="_blank" rel="noreferrer">
                        Open {appName}&apos;s link
                      </a>
                    ) : null}
                    <button type="button" onClick={() => { setMenu(false); setFeedback(true); }}>
                      {thread.my_feedback_id ? 'Edit feedback' : 'Send feedback'}
                    </button>
                    <button type="button" className="danger" onClick={() => void more('hide')}>
                      Delete chat
                    </button>
                    <button type="button" className="danger" onClick={() => { setMenu(false); setReport(true); }}>
                      Report {them.split(' ')[0]}
                    </button>
                    <button type="button" className="danger" onClick={() => void more('block')}>
                      Block {them.split(' ')[0]}
                    </button>
                    <button type="button" className="danger" onClick={() => void more('unmatch')}>
                      Unmatch
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="bubble-list">
              {messages.map((msg) => (
                <div key={msg.id} className={`bubble${msg.mine ? ' is-mine' : ''}`}>
                  {msg.media?.length ? (
                    <div className="bubble-media">
                      {msg.media.map((item) => {
                        const src = publicMediaUrl(item.storage_path);
                        if (!src) return null;
                        return item.kind === 'video' ? (
                          <video key={item.storage_path} src={src} controls playsInline />
                        ) : (
                          <img key={item.storage_path} src={src} alt={item.label ?? ''} />
                        );
                      })}
                    </div>
                  ) : null}
                  {msg.body}
                  <time>{timeAgo(msg.created_at)}</time>
                </div>
              ))}
              <div ref={bottom} />
            </div>
            <form
              className="composer"
              onSubmit={(event) => {
                event.preventDefault();
                void send();
              }}
            >
              {files.length ? (
                <div className="attach-chips">
                  {files.map((file, index) => (
                    <span key={`${file.name}-${index}`} className="attach-chip">
                      {file.type.startsWith('video/') ? 'Video' : 'Photo'} · {file.name}
                      <button
                        type="button"
                        onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
              {emojiOpen ? (
                <div className="emoji-tray">
                  {EMOJI_TRAY.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setDraft((value) => value + emoji);
                        setEmojiOpen(false);
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              ) : null}
              <button className="composer-icon" type="button" onClick={() => setEmojiOpen((value) => !value)} aria-label="Emoji">
                ☺
              </button>
              <button
                className="composer-icon"
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label="Attach"
              >
                ＋
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,video/*"
                multiple
                hidden
                onChange={(event) => {
                  const next = Array.from(event.target.files ?? []);
                  if (next.length) setFiles((prev) => [...prev, ...next].slice(0, 6));
                  event.target.value = '';
                }}
              />
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={`Message ${them.split(' ')[0]}`}
              />
              <button type="submit" disabled={busy || (!draft.trim() && !files.length)}>
                Send
              </button>
            </form>
          </>
        ) : (
          <p className="empty">Pick a match to open the thread.</p>
        )}
      </section>

      <aside className="pane-rail">
        {thread?.their_app ? (
          <>
            <span className="eyebrow">Their app</span>
            <button type="button" className="rail-app" onClick={() => setSheet('app')}>
              {appIcon ? (
                <img src={appIcon} alt="" />
              ) : (
                <span className="row-fallback" style={{ background: hueFill(thread.their_app.app.hue) }}>
                  {initial(appName)}
                </span>
              )}
              <div>
                <strong>{appName}</strong>
                <span className="muted">
                  {thread.their_app.app.platform} · {thread.their_app.app.stage}
                </span>
              </div>
            </button>
            {thread.their_app.app.feedback_wanted?.length ? (
              <p className="rail-note">
                Wants feedback on <b>{thread.their_app.app.feedback_wanted.join(', ')}</b>
                {thread.share_theirs_code ? (
                  <>
                    . Code <code>{thread.share_theirs_code}</code>
                  </>
                ) : null}
              </p>
            ) : null}
            {thread.share_theirs_url || thread.share_theirs_code ? (
              <div className="rail-note">
                {thread.share_theirs_url ? (
                  <div>
                    Their link{' '}
                    <a href={thread.share_theirs_url} target="_blank" rel="noreferrer">
                      {thread.share_theirs_url}
                    </a>
                  </div>
                ) : null}
                {thread.share_theirs_code ? <div>Their code {thread.share_theirs_code}</div> : null}
              </div>
            ) : null}
            <button className="btn-ink" type="button" onClick={() => setFeedback(true)}>
              Leave feedback
            </button>
            {thread.their_app.app.store_url ? (
              <a className="btn-line" href={thread.their_app.app.store_url} target="_blank" rel="noreferrer">
                Open listing
              </a>
            ) : null}
            <span className="eyebrow">Give links / codes</span>
            <input value={shareUrl} onChange={(event) => setShareUrl(event.target.value)} placeholder="TestFlight or URL" />
            <input value={shareCode} onChange={(event) => setShareCode(event.target.value)} placeholder="Code" />
            <button className="btn-line" type="button" onClick={() => void saveShare()}>
              Save
            </button>
          </>
        ) : (
          <p className="muted">Match details show here.</p>
        )}
      </aside>

      <Slideout open={sheet === 'builder'} onClose={() => setSheet(null)} title={them}>
        <BuilderCard name={them} photo={photo} job={thread?.builder?.job} app={thread?.their_app} />
      </Slideout>
      <Slideout open={sheet === 'app'} onClose={() => setSheet(null)} title={appName}>
        {thread?.their_app ? <AppPeek card={thread.their_app} /> : null}
      </Slideout>
      {feedback && thread ? (
        <FeedbackForm
          matchId={thread.match_id}
          appName={appName}
          onClose={() => setFeedback(false)}
          onSaved={() => {
            setFeedback(false);
            setToast('Feedback sent');
            void loadThreads();
          }}
        />
      ) : null}
      {report && thread ? (
        <div className="modal-scrim" onClick={() => setReport(false)} role="presentation">
          <div className="modal-card filter-modal" onClick={(event) => event.stopPropagation()}>
            <h2>Report {them}</h2>
            {REPORT_REASONS.map((reason) => (
              <button
                key={reason}
                className="btn-line"
                type="button"
                onClick={() => {
                  setReport(false);
                  void more('report', reason);
                }}
              >
                {reason}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}
