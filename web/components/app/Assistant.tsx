'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

import { useIos } from '@/components/app/IosModal';
import { useMe } from '@/components/app/MeContext';
import { firstName, hueFill, initial } from '@/lib/format';
import type { OwnedApp } from '@/lib/loop';
import { publicMediaUrl } from '@/lib/site';
import { createClient } from '@/lib/supabase/client';

type Msg = { role: 'user' | 'assistant'; content: string };
type Chip = { mark: string; title: string; body: string; prompt: string };

export function Assistant() {
  const me = useMe();
  const { openIos } = useIos();
  const [apps, setApps] = useState<OwnedApp[]>([]);
  const [listingId, setListingId] = useState<string | null>(me.primaryAppId);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [needPro, setNeedPro] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const first = firstName(me.realName, me.username ?? 'there');

  useEffect(() => {
    void (async () => {
      const { data } = await createClient()
        .from('apps')
        .select('id, name, subtitle, slug, hue, icon_path, is_primary, created_at, pitch_path, problem_for')
        .eq('owner_id', me.id)
        .order('created_at');
      const rows = (data ?? []) as OwnedApp[];
      setApps(rows);
      setListingId((current) => current ?? rows.find((row) => row.is_primary)?.id ?? rows[0]?.id ?? null);
    })();
  }, [me.id]);

  const listing = useMemo(() => apps.find((row) => row.id === listingId) ?? null, [apps, listingId]);
  const audience = listing?.problem_for?.split(/[,.]/)[0]?.trim() || 'your users';

  const chips: Chip[] = useMemo(() => {
    const hasPitch = Boolean(listing && 'pitch_path' in listing && listing.pitch_path);
    return [
      hasPitch
        ? {
            mark: '▶',
            title: 'How to improve my pitch',
            body: 'Tighten the first 8 seconds so people stay.',
            prompt: 'How to improve my pitch. Tighten the first 8 seconds so people stay.',
          }
        : {
            mark: '▶',
            title: 'Help me make a video pitch',
            body: 'Script a 30-second hello from your listing.',
            prompt:
              'Help me make a video pitch. Review my listing, ask me questions to close any gaps, then suggest a 30-second script and why it works.',
          },
      {
        mark: '7',
        title: 'Help me action feedback',
        body: 'Turn tester notes into the next ship.',
        prompt: 'Help me action feedback',
      },
      {
        mark: '◎',
        title: `Brainstorm ways to reach ${audience}`,
        body: 'Channels, hooks, and a first experiment.',
        prompt: `Brainstorm ways to reach ${audience}`,
      },
      {
        mark: '7/9',
        title: 'How to improve my listing',
        body: 'Make my product clearer to get more heys',
        prompt: 'How to improve my listing. Make my product clearer to get more heys.',
      },
      {
        mark: '“',
        title: 'Review my prompt answers',
        body: 'Make them specific, useful, and easy to hey.',
        prompt: 'Review my prompt answers. Make them specific, useful, and easy to hey.',
      },
      {
        mark: '?',
        title: 'How to ask for feedback',
        body: 'How to get useful notes from testers.',
        prompt:
          'How to ask for feedback. How do I get good, useful feedback from testers and people who try my product?',
      },
    ];
  }, [audience, listing]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const applyAssistant = (next: Msg[], content: string) => {
    setMessages([...next, { role: 'assistant', content }]);
  };

  const send = useCallback(
    async (preset?: string) => {
      const content = (preset ?? draft).trim();
      if (!listingId || !content || busy) return;
      const next: Msg[] = [...messages, { role: 'user', content }];
      setMessages([...next, { role: 'assistant', content: '' }]);
      setDraft('');
      setBusy(true);

      try {
        const {
          data: { session },
        } = await createClient().auth.getSession();
        if (!session?.access_token) {
          applyAssistant(next, 'Sign in again to talk to the assistant.');
          return;
        }

        const post = (stream: boolean) =>
          fetch('/api/listing-coach', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ listingId, messages: next, stream }),
          });

        let res = await post(true);
        if (res.status === 402) {
          setNeedPro(true);
          applyAssistant(next, 'The listing assistant is a Pro feature. Start Pro on iOS for now.');
          return;
        }

        let acc = '';
        if (res.ok && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
              if (!line.startsWith('data:')) continue;
              try {
                const payload = JSON.parse(line.slice(5).trim()) as { text?: string; error?: string };
                if (payload.text) {
                  acc += payload.text;
                  applyAssistant(next, acc);
                }
                if (payload.error && !acc) acc = '';
              } catch {
                /* skip */
              }
            }
          }
        }

        if (!acc.trim()) {
          res = await post(false);
          if (res.status === 402) {
            setNeedPro(true);
            applyAssistant(next, 'The listing assistant is a Pro feature. Start Pro on iOS for now.');
            return;
          }
          if (res.ok) {
            const json = (await res.json()) as { reply?: string; error?: string };
            acc = json.reply ?? '';
          }
        }

        applyAssistant(
          next,
          acc.trim() || 'The assistant could not reply just now. Try again in a moment.',
        );
      } catch {
        applyAssistant(next, 'The assistant could not reply just now.');
      } finally {
        setBusy(false);
      }
    },
    [busy, draft, listingId, messages],
  );

  const empty = messages.length === 0 && !busy;

  return (
    <div className="pane-shell chat-shell">
      <aside className="pane-list">
        <div className="pane-list-head">
          <h1>Assistant</h1>
        </div>
        <div className="coach-apps">
          {apps.map((row) => {
            const icon = publicMediaUrl(row.icon_path);
            return (
              <button
                key={row.id}
                type="button"
                className={listingId === row.id ? 'is-on' : undefined}
                onClick={() => {
                  setListingId(row.id);
                  setMessages([]);
                }}
              >
                {icon ? (
                  <img src={icon} alt="" />
                ) : (
                  <span className="row-fallback" style={{ background: hueFill(row.hue ?? 140) }}>
                    {initial(row.name)}
                  </span>
                )}
                {row.name}
              </button>
            );
          })}
        </div>
        <div className="pane-scroll">
          <button
            type="button"
            className="row-card"
            onClick={() => {
              setMessages([]);
            }}
          >
            <span className="row-fallback">+</span>
            <div className="row-copy">
              <strong>New chat</strong>
            </div>
          </button>
        </div>
      </aside>

      <section className="pane-main chat-main">
        {needPro ? (
          <div className="paywall">
            <h1>Assistant is Pro</h1>
            <p className="muted">Start Pro on iOS. Web billing comes later.</p>
            <Link className="btn-accent" href="/pro">
              See Pro
            </Link>
          </div>
        ) : listing ? (
          <>
            {empty ? (
              <div className="coach-home">
                <div>
                  <h1>Hey {first}. What are we working on?</h1>
                  <p className="muted">
                    I&apos;ve read {listing.name}&apos;s listing. Pick a starting point or ask anything.
                  </p>
                </div>
                <div className="coach-chips">
                  {chips.map((chip) => (
                    <button key={chip.title} type="button" className="coach-chip" onClick={() => void send(chip.prompt)}>
                      <span className="coach-mark">{chip.mark}</span>
                      <span>
                        <strong>{chip.title}</strong>
                        <span>{chip.body}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bubble-list">
                {messages.map((msg, i) => (
                  <div key={`${msg.role}-${i}`} className={`bubble${msg.role === 'user' ? ' is-mine' : ''}`}>
                    {msg.content || (busy && i === messages.length - 1 ? 'Thinking…' : '')}
                  </div>
                ))}
                <div ref={bottom} />
              </div>
            )}
            <form
              className="composer"
              onSubmit={(event) => {
                event.preventDefault();
                void send();
              }}
            >
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask me anything..."
                disabled={busy}
              />
              <button type="submit" disabled={busy || !draft.trim()}>
                ↑
              </button>
            </form>
          </>
        ) : (
          <div className="paywall">
            <h1>Hi {first}</h1>
            <p className="muted">Add a listing on iOS and the assistant can work on it here.</p>
            <button className="btn-accent" type="button" onClick={openIos}>
              Get the iOS app
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
