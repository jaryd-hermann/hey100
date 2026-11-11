'use client';

import { useEffect, useMemo, useState } from 'react';

import { useMe } from '@/components/app/MeContext';
import { hueFill, initial, timeAgo } from '@/lib/format';
import { createClient } from '@/lib/supabase/client';

const CATS = ['Development', 'Backend', 'Messaging', 'AI', 'Design', 'Monetization', 'Growth', 'Productivity', 'Finance'];

const FALLBACK: Tool[] = [
  { id: 'seed-xcode', name: 'Xcode', subtitle: "Apple's IDE for building iOS apps.", url: 'https://developer.apple.com/xcode/', logo_url: 'https://www.google.com/s2/favicons?sz=128&domain=developer.apple.com', category: 'Development' },
  { id: 'seed-expo', name: 'Expo', subtitle: 'Framework for cross-platform React Native apps.', url: 'https://expo.dev', logo_url: 'https://www.google.com/s2/favicons?sz=128&domain=expo.dev', category: 'Development' },
  { id: 'seed-supabase', name: 'Supabase', subtitle: 'Open-source Postgres backend with auth & storage.', url: 'https://supabase.com/', logo_url: 'https://www.google.com/s2/favicons?sz=128&domain=supabase.com', category: 'Backend' },
  { id: 'seed-github', name: 'GitHub', subtitle: 'Code hosting, version control, and collaboration.', url: 'https://github.com', logo_url: 'https://www.google.com/s2/favicons?sz=128&domain=github.com', category: 'Backend' },
  { id: 'seed-cursor', name: 'Cursor', subtitle: 'The AI-native code editor.', url: 'https://www.cursor.com', logo_url: 'https://www.google.com/s2/favicons?sz=128&domain=cursor.com', category: 'AI' },
  { id: 'seed-claude', name: 'Claude', subtitle: "Anthropic's AI assistant.", url: 'https://www.claude.com', logo_url: 'https://www.google.com/s2/favicons?sz=128&domain=claude.com', category: 'AI' },
  { id: 'seed-figma', name: 'Figma', subtitle: 'Collaborative design and prototyping.', url: 'https://www.figma.com', logo_url: 'https://www.google.com/s2/favicons?sz=128&domain=figma.com', category: 'Design' },
  { id: 'seed-revenuecat', name: 'RevenueCat', subtitle: 'In-app subscription infrastructure.', url: 'https://www.revenuecat.com', logo_url: 'https://www.google.com/s2/favicons?sz=128&domain=revenuecat.com', category: 'Monetization' },
  { id: 'seed-posthog', name: 'PostHog', subtitle: 'Product analytics, replays, and flags.', url: 'https://posthog.com', logo_url: 'https://www.google.com/s2/favicons?sz=128&domain=posthog.com', category: 'Growth' },
];

type Tool = {
  id: string;
  name: string;
  subtitle: string;
  url: string;
  logo_url?: string | null;
  category: string;
};

type ChatMsg = { id: string; author: string; body: string; created_at: string; mine?: boolean };

const SAMPLE_CHAT: Record<string, ChatMsg[]> = {
  default: [
    {
      id: 't1',
      author: 'Nina Park',
      body: 'Anyone using this in production yet? Curious about the gotchas.',
      created_at: new Date(Date.now() - 6 * 3600_000).toISOString(),
    },
    {
      id: 't2',
      author: 'Omar Reyes',
      body: 'Shipped it last week. Setup was 20 minutes. Pricing is the part to watch.',
      created_at: new Date(Date.now() - 4 * 3600_000).toISOString(),
    },
  ],
};

export function Tools() {
  const me = useMe();
  const [tools, setTools] = useState<Tool[]>([]);
  const [cat, setCat] = useState<string | null>(null);
  const [votes, setVotes] = useState<Record<string, { up: number; down: number; mine?: -1 | 1 | 0 }>>({});
  const [open, setOpen] = useState<Tool | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    void (async () => {
      const db = createClient();
      const { data } = await db.from('sponsored_tools').select('id, name, subtitle, url, logo_url, category').order('name');
      setTools(data?.length ? (data as Tool[]) : FALLBACK);
      const { data: tallies } = await db.rpc('sponsored_tool_vote_tallies');
      const map: Record<string, { up: number; down: number }> = {};
      for (const row of (tallies ?? []) as { tool_id: string; up: number; down: number }[]) {
        map[row.tool_id] = { up: row.up, down: row.down };
      }
      setVotes(map);
    })();
  }, []);

  const visible = useMemo(() => {
    const list = cat ? tools.filter((row) => row.category === cat) : tools;
    return [...list].sort((a, b) => (votes[b.id]?.up ?? 0) - (votes[b.id]?.down ?? 0) - ((votes[a.id]?.up ?? 0) - (votes[a.id]?.down ?? 0)));
  }, [cat, tools, votes]);

  const vote = async (id: string, dir: 1 | -1) => {
    if (!id.startsWith('seed-')) {
      await createClient().rpc('vote_sponsored_tool', { p_tool_id: id, p_vote: dir });
    }
    setVotes((prev) => {
      const cur = prev[id] ?? { up: 0, down: 0 };
      return {
        ...prev,
        [id]: {
          up: cur.up + (dir === 1 ? 1 : 0),
          down: cur.down + (dir === -1 ? 1 : 0),
          mine: dir,
        },
      };
    });
  };

  const openTool = async (tool: Tool) => {
    setOpen(tool);
    setMessages(SAMPLE_CHAT.default);
    setGroupId(null);
    if (tool.id.startsWith('seed-')) return;
    const { data, error } = await createClient().rpc('ensure_tool_discussion', { p_tool_id: tool.id });
    if (error || !data) return;
    const id = typeof data === 'string' ? data : String(data);
    setGroupId(id);
    const { data: rows } = await createClient()
      .from('community_threads')
      .select('id, author_id, body, created_at')
      .eq('group_id', id)
      .order('created_at')
      .limit(40);
    if (rows?.length) {
      setMessages(
        rows.map((row) => ({
          id: row.id,
          author: row.author_id === me.id ? me.realName ?? 'You' : 'Builder',
          body: row.body,
          created_at: row.created_at,
          mine: row.author_id === me.id,
        })),
      );
    }
  };

  const post = async () => {
    if (!open || !draft.trim()) return;
    const body = draft.trim();
    setDraft('');
    const local: ChatMsg = {
      id: `local-${Date.now()}`,
      author: me.realName ?? 'You',
      body,
      created_at: new Date().toISOString(),
      mine: true,
    };
    setMessages((prev) => [...prev, local]);
    if (groupId) {
      await createClient().from('community_threads').insert({
        group_id: groupId,
        author_id: me.id,
        body,
      });
    }
  };

  if (open) {
    return (
      <div className="pane-shell chat-shell">
        <section className="pane-main chat-main">
          <div className="chat-head">
            <button className="icon-btn" type="button" onClick={() => setOpen(null)} aria-label="Back">
              ←
            </button>
            {open.logo_url ? <img src={open.logo_url} alt="" className="ph-logo" /> : <span className="ph-logo" />}
            <div className="chat-who" style={{ cursor: 'default' }}>
              <strong>{open.name}</strong>
              <span className="muted">{open.subtitle}</span>
            </div>
            <a className="text-btn" href={open.url} target="_blank" rel="noreferrer">
              Open ↗
            </a>
          </div>
          <div className="bubble-list">
            {messages.map((msg) => (
              <article key={msg.id} className="tool-msg">
                <span className="row-fallback" style={{ background: hueFill(msg.mine ? 128 : 250) }}>
                  {initial(msg.author)}
                </span>
                <div>
                  <strong>
                    {msg.author} <em>{timeAgo(msg.created_at)}</em>
                  </strong>
                  <p>{msg.body}</p>
                </div>
              </article>
            ))}
          </div>
          <form
            className="composer"
            onSubmit={(event) => {
              event.preventDefault();
              void post();
            }}
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={`Talk about ${open.name}…`}
            />
            <button type="submit" disabled={!draft.trim()}>
              Post
            </button>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="page-main">
      <h1>Builder Tools</h1>
      <p className="muted">Product Hunt-style list. Tap a tool to join the conversation.</p>
      <div className="pane-tabs">
        <button type="button" className={!cat ? 'is-on' : undefined} onClick={() => setCat(null)}>
          All
        </button>
        {CATS.map((item) => (
          <button key={item} type="button" className={cat === item ? 'is-on' : undefined} onClick={() => setCat(item)}>
            {item}
          </button>
        ))}
      </div>
      <div className="ph-list">
        {visible.map((tool, index) => {
          const score = (votes[tool.id]?.up ?? 0) - (votes[tool.id]?.down ?? 0);
          return (
            <article key={tool.id} className="ph-row">
              <div className="ph-vote">
                <button
                  type="button"
                  className={votes[tool.id]?.mine === 1 ? 'is-on' : undefined}
                  onClick={() => void vote(tool.id, 1)}
                >
                  ▲
                </button>
                <b>{score}</b>
                <button type="button" onClick={() => void vote(tool.id, -1)}>
                  ▼
                </button>
              </div>
              <button type="button" className="ph-copy" onClick={() => void openTool(tool)}>
                {tool.logo_url ? (
                  <img className="ph-logo" src={tool.logo_url} alt="" />
                ) : (
                  <span className="ph-logo" style={{ display: 'grid', placeItems: 'center', background: hueFill(index * 40) }}>
                    {tool.name.slice(0, 1)}
                  </span>
                )}
                <span>
                  <strong>
                    {index + 1}. {tool.name}
                  </strong>
                  <span className="muted" style={{ display: 'block' }}>
                    {tool.subtitle}
                  </span>
                </span>
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
