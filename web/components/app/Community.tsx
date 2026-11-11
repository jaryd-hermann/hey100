'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { useMe } from '@/components/app/MeContext';
import { useDevMode } from '@/lib/devMode';
import { Identicon } from '@/lib/identicon';
import {
  JOINED_SEED,
  SEED_GROUPS,
  SEED_THREADS,
  REACTION_SET,
  isSeedId,
  type SeedGroup,
} from '@/lib/communitySeed';
import { hueFill, initial, timeAgo } from '@/lib/format';
import { publicAvatarUrl, publicMediaUrl } from '@/lib/site';
import { createClient } from '@/lib/supabase/client';

type Group = SeedGroup & { created_by?: string };
type Membership = { group_id: string; user_id: string; status?: string; role?: string };
type Thread = {
  id: string;
  group_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author?: string;
  hue?: number;
  reactions?: { emoji: string; count: number; mine?: boolean }[];
  replies?: number;
};
type Person = { id: string; real_name: string | null; username: string | null; photo_url: string | null };
type MemberFace = {
  name: string;
  photo?: string | null;
  hue?: number;
  role?: string;
  bio?: string;
  app?: string;
  appHue?: number;
  appIcon?: string | null;
  listings?: { name: string; hue: number; icon?: string | null }[];
  karma?: number;
  apps?: number;
  commits?: number | null;
  revenue?: string;
};

function coverSrc(path?: string | null) {
  if (!path || path.startsWith('identicon:')) return null;
  return publicMediaUrl(path);
}

function MemberStack({ people, total }: { people: MemberFace[]; total: number }) {
  const shown = people.slice(0, 4);
  const extra = Math.max(0, total - shown.length);
  if (!shown.length) return null;
  return (
    <span className="member-stack">
      {shown.map((person) =>
        person.photo ? (
          <img key={person.name} src={person.photo} alt="" />
        ) : (
          <span key={person.name} style={{ background: hueFill(person.hue ?? 140) }}>
            {initial(person.name)}
          </span>
        ),
      )}
      {extra > 0 ? <span>+{extra}</span> : null}
    </span>
  );
}

function ThreadPost({
  thread,
  name,
  photo,
  replies,
  onOpen,
  onReact,
}: {
  thread: Thread;
  name: string;
  photo: string | null;
  replies: { id: string; author: string }[];
  onOpen: () => void;
  onReact: (emoji: string) => void;
}) {
  return (
    <article className="thread-post" onClick={onOpen}>
      <div className="thread-post-head">
        {photo ? (
          <img src={photo} alt="" />
        ) : (
          <span className="row-fallback" style={{ background: hueFill(thread.hue ?? 140) }}>
            {initial(name)}
          </span>
        )}
        <strong>{name}</strong>
        <em>{timeAgo(thread.created_at)}</em>
      </div>
      <div className="thread-bubble">
        <div className="thread-reacts" onClick={(event) => event.stopPropagation()}>
          {(thread.reactions ?? []).map((item) => (
            <button
              key={item.emoji}
              type="button"
              className={item.mine ? 'is-on' : undefined}
              onClick={() => onReact(item.emoji)}
            >
              {item.emoji}
              {item.count > 1 ? ` ${item.count}` : ''}
            </button>
          ))}
          <details>
            <summary>+</summary>
            <div>
              {REACTION_SET.map((emoji) => (
                <button key={emoji} type="button" onClick={() => onReact(emoji)}>
                  {emoji}
                </button>
              ))}
            </div>
          </details>
        </div>
        {thread.body}
      </div>
      <div className="thread-reply-meta">
        {replies.length ? <MemberStack people={replies.map((row) => ({ name: row.author }))} total={replies.length} /> : null}
        {thread.replies ? `${thread.replies} ${thread.replies === 1 ? 'reply' : 'replies'}` : 'Reply'}
      </div>
    </article>
  );
}

export function Community() {
  const me = useMe();
  const { devMode, setDevMode } = useDevMode();
  const sample = me.isAdmin && devMode;
  const [groups, setGroups] = useState<Group[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [stacks, setStacks] = useState<Record<string, MemberFace[]>>({});
  const [joinedSeed, setJoinedSeed] = useState<Set<string>>(new Set(JOINED_SEED));
  const [active, setActive] = useState<string | null>(null);
  const [mode, setMode] = useState<'preview' | 'group' | 'thread'>('preview');
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [replyRows, setReplyRows] = useState<Record<string, { id: string; author: string; body: string; created_at: string }[]>>(
    {},
  );
  const [draft, setDraft] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [membersOpen, setMembersOpen] = useState(true);
  const [tick, setTick] = useState(0);
  const [myRating, setMyRating] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    const { data, error } = await createClient().rpc('community_home_payload');
    if (error) {
      setToast(error.message);
      setGroups(sample ? SEED_GROUPS : []);
      setLoading(false);
      return;
    }
    const packed = (data ?? {}) as {
      groups?: Group[];
      memberships?: Membership[];
      member_stacks?: { group_id: string; name: string; photo?: string | null }[];
    };
    let next = packed.groups ?? [];
    if (sample) {
      const liveIds = new Set(next.map((row) => row.id));
      next = [...SEED_GROUPS.filter((row) => !liveIds.has(row.id)), ...next];
    }
    setGroups(next);
    setMemberships(packed.memberships ?? []);
    const map: Record<string, MemberFace[]> = {};
    for (const row of packed.member_stacks ?? []) {
      (map[row.group_id] ??= []).push({ name: row.name, photo: publicAvatarUrl(row.photo) });
    }
    for (const seed of SEED_GROUPS) if (seed.members) map[seed.id] ??= seed.members;
    setStacks(map);
    setLoading(false);
  }, [sample]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!membersOpen || !active || isSeedId(active)) return;
    void (async () => {
      const { data } = await createClient().rpc('community_member_directory', { p_group_id: active });
      const rows = (data ?? []) as Record<string, unknown>[];
      if (!rows.length) return;
      setStacks((prev) => ({
        ...prev,
        [active]: rows.map((row) => {
          const listings = Array.isArray(row.listings)
            ? (row.listings as Record<string, unknown>[]).map((item) => ({
                name: String(item.name ?? 'App'),
                hue: Number(item.hue ?? 140),
                icon: item.icon ? publicMediaUrl(String(item.icon)) : null,
              }))
            : [];
          return {
            name: String(row.name ?? 'A builder'),
            photo: publicAvatarUrl((row.photo as string | null) ?? null),
            role: String(row.role ?? 'member'),
            bio: (row.bio as string | null) ?? undefined,
            karma: typeof row.karma === 'number' ? row.karma : undefined,
            apps: Number(row.apps ?? listings.length),
            commits: typeof row.commits === 'number' ? row.commits : null,
            revenue: String(row.revenue ?? '—'),
            listings,
            app: listings[0]?.name,
            appHue: listings[0]?.hue,
            appIcon: listings[0]?.icon,
          };
        }),
      }));
    })();
  }, [membersOpen, active]);

  const isMember = useCallback(
    (id: string) => {
      if (isSeedId(id)) return joinedSeed.has(id);
      return memberships.some((row) => row.group_id === id && row.user_id === me.id && row.status === 'active');
    },
    [joinedSeed, me.id, memberships],
  );

  const mine = groups.filter((row) => isMember(row.id));
  const discover = groups.filter((row) => !isMember(row.id));
  const group = groups.find((row) => row.id === active) ?? null;
  const faces = (active && stacks[active]) || group?.members || [];
  const openThread = threads.find((row) => row.id === threadId) ?? null;

  const openGroup = (id: string, asPreview?: boolean) => {
    setActive(id);
    setThreadId(null);
    setMenu(false);
    setMode(asPreview || !isMember(id) ? 'preview' : 'group');
  };

  useEffect(() => {
    if (!active || mode === 'preview') {
      if (mode === 'preview') setThreads([]);
      return;
    }
    if (isSeedId(active)) {
      const rows = SEED_THREADS.filter((row) => row.group_id === active);
      setThreads(rows);
      const map: Record<string, { id: string; author: string; body: string; created_at: string }[]> = {};
      for (const row of rows) if (row.replyRows) map[row.id] = row.replyRows;
      setReplyRows(map);
      return;
    }
    let cancelled = false;
    void (async () => {
      const db = createClient();
      const { data } = await db
        .from('community_threads')
        .select('id, group_id, author_id, body, created_at')
        .eq('group_id', active)
        .order('created_at', { ascending: true })
        .limit(80);
      if (cancelled) return;
      const rows = (data ?? []) as Thread[];
      const ids = [...new Set(rows.map((row) => row.author_id))];
      const threadIds = rows.map((row) => row.id);
      const [{ data: profiles }, { data: reacts }, { data: replies }] = await Promise.all([
        ids.length
          ? db.from('profiles').select('id, real_name, username, photo_url').in('id', ids)
          : Promise.resolve({ data: [] }),
        threadIds.length
          ? db.from('community_reactions').select('thread_id, emoji, user_id').in('thread_id', threadIds)
          : Promise.resolve({ data: [] }),
        threadIds.length
          ? db.from('community_replies').select('id, thread_id, author_id, body, created_at').in('thread_id', threadIds)
          : Promise.resolve({ data: [] }),
      ]);
      const map: Record<string, Person> = {};
      for (const row of (profiles ?? []) as Person[]) map[row.id] = row;
      setPeople(map);
      const folded = new Map<string, Record<string, { count: number; mine: boolean }>>();
      for (const row of (reacts ?? []) as { thread_id: string; emoji: string; user_id: string }[]) {
        const bucket = folded.get(row.thread_id) ?? {};
        const cur = bucket[row.emoji] ?? { count: 0, mine: false };
        cur.count += 1;
        if (row.user_id === me.id) cur.mine = true;
        bucket[row.emoji] = cur;
        folded.set(row.thread_id, bucket);
      }
      const grouped: Record<string, { id: string; author: string; body: string; created_at: string }[]> = {};
      for (const row of (replies ?? []) as {
        id: string;
        thread_id: string;
        author_id: string;
        body: string;
        created_at: string;
      }[]) {
        const who = map[row.author_id];
        (grouped[row.thread_id] ??= []).push({
          id: row.id,
          author: who?.real_name || (who?.username ? `@${who.username}` : 'Builder'),
          body: row.body,
          created_at: row.created_at,
        });
      }
      setReplyRows(grouped);
      setThreads(
        rows.map((row) => ({
          ...row,
          reactions: Object.entries(folded.get(row.id) ?? {}).map(([emoji, value]) => ({ emoji, ...value })),
          replies: grouped[row.id]?.length ?? 0,
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [active, me.id, mode, tick]);

  const react = async (id: string, emoji: string) => {
    if (isSeedId(id)) {
      setThreads((prev) =>
        prev.map((row) => {
          if (row.id !== id) return row;
          const has = row.reactions?.some((item) => item.emoji === emoji && item.mine);
          const next = (row.reactions ?? []).map((item) =>
            item.emoji === emoji ? { ...item, count: item.count + (has ? -1 : 1), mine: !has } : item,
          );
          if (!has && !next.some((item) => item.emoji === emoji)) next.push({ emoji, count: 1, mine: true });
          return { ...row, reactions: next.filter((item) => item.count > 0) };
        }),
      );
      return;
    }
    const db = createClient();
    const existing = await db
      .from('community_reactions')
      .select('emoji')
      .eq('thread_id', id)
      .eq('user_id', me.id)
      .eq('emoji', emoji)
      .maybeSingle();
    if (existing.data) {
      await db.from('community_reactions').delete().eq('thread_id', id).eq('user_id', me.id).eq('emoji', emoji);
    } else {
      await db.from('community_reactions').insert({ thread_id: id, user_id: me.id, emoji });
    }
    setTick((value) => value + 1);
  };

  const post = async () => {
    if (!group || !draft.trim() || busy) return;
    const body = draft.trim();
    setDraft('');
    if (isSeedId(group.id)) {
      setThreads((prev) => [
        ...prev,
        {
          id: `seed-${Date.now()}`,
          group_id: group.id,
          author_id: me.id,
          body,
          created_at: new Date().toISOString(),
          author: me.realName ?? 'You',
          reactions: [],
          replies: 0,
        },
      ]);
      return;
    }
    setBusy(true);
    const { error } = await createClient().from('community_threads').insert({
      group_id: group.id,
      author_id: me.id,
      body,
    });
    setBusy(false);
    if (error) {
      setDraft(body);
      setToast(error.message);
      return;
    }
    setTick((value) => value + 1);
  };

  const sendReply = async () => {
    if (!threadId || !reply.trim()) return;
    const body = reply.trim();
    setReply('');
    if (isSeedId(threadId)) {
      setReplyRows((prev) => ({
        ...prev,
        [threadId]: [
          ...(prev[threadId] ?? []),
          { id: `seed-r-${Date.now()}`, author: me.realName ?? 'You', body, created_at: new Date().toISOString() },
        ],
      }));
      setThreads((prev) =>
        prev.map((row) => (row.id === threadId ? { ...row, replies: (row.replies ?? 0) + 1 } : row)),
      );
      return;
    }
    const { error } = await createClient().from('community_replies').insert({
      thread_id: threadId,
      author_id: me.id,
      body,
    });
    if (error) setToast(error.message);
    setTick((value) => value + 1);
  };

  const join = async () => {
    if (!group) return;
    if (isSeedId(group.id)) {
      setJoinedSeed((prev) => new Set(prev).add(group.id));
      setMode('group');
      return;
    }
    setBusy(true);
    const status = group.join_mode === 'request' ? 'pending' : 'active';
    const { error } = await createClient().from('community_group_members').upsert({
      group_id: group.id,
      user_id: me.id,
      role: 'member',
      status,
    });
    setBusy(false);
    if (error) setToast(error.message);
    else {
      await load();
      if (status === 'active') setMode('group');
    }
  };

  const authorOf = (thread: Thread) => {
    const person = people[thread.author_id];
    return {
      name: thread.author || person?.real_name || (person?.username ? `@${person.username}` : 'Builder'),
      photo: publicAvatarUrl(person?.photo_url),
    };
  };

  return (
    <div className="pane-shell chat-shell">
      <aside className="pane-list">
        <div className="pane-list-head">
          <h1>Community</h1>
          <div className="pane-tabs">
            <Link href="/chat">DMs</Link>
            <span className="is-on">Community</span>
          </div>
          {me.isAdmin ? (
            <button className="btn-line" type="button" onClick={() => setDevMode(!devMode)}>
              {sample ? 'Hide sample content' : 'Preview sample content'}
            </button>
          ) : null}
        </div>
        <div className="pane-scroll">
          {loading ? <p className="empty">Loading groups…</p> : null}
          <p className="eyebrow" style={{ padding: '10px 14px 4px' }}>
            Your groups
          </p>
          {mine.map((row) => (
            <GroupRow
              key={row.id}
              row={row}
              joined
              active={active === row.id && mode !== 'preview'}
              onClick={() => openGroup(row.id, false)}
            />
          ))}
          {!mine.length ? <p className="empty">Join a group to see it here.</p> : null}
          <p className="eyebrow" style={{ padding: '16px 14px 4px' }}>
            Find new groups
          </p>
          {discover.map((row) => (
            <GroupRow
              key={row.id}
              row={row}
              active={active === row.id && mode === 'preview'}
              onClick={() => openGroup(row.id, true)}
            />
          ))}
        </div>
      </aside>

      <section className="pane-main chat-main">
        {group && mode === 'preview' ? (
          <div className="group-preview">
            {coverSrc(group.cover_path) ? (
              <img src={coverSrc(group.cover_path)!} alt="" style={{ width: 64, height: 64, borderRadius: 16 }} />
            ) : (
              <Identicon seed={group.id || group.name} size={64} />
            )}
            <div>
              <h1 style={{ margin: 0 }}>{group.name}</h1>
              <p className="muted">
                {(group.member_count ?? 0).toLocaleString()} members
                {group.weekly_active ? ` · ${group.weekly_active} this week` : ''}
                {group.rating_avg ? ` · ${group.rating_avg}★` : ''}
              </p>
            </div>
            <MemberStack people={faces} total={group.member_count ?? faces.length} />
            <p>{group.bio}</p>
            {group.audience ? (
              <p className="muted">For {group.audience}</p>
            ) : null}
            {group.power ? (
              <div>
                <span className="eyebrow">Group power</span>
                <div className="group-power">
                  <div>
                    <b>{group.power.revenue}</b>
                    <span>Combined revenue</span>
                  </div>
                  <div>
                    <b>{group.power.customers}</b>
                    <span>Combined customers</span>
                  </div>
                  <div>
                    <b>{group.power.commits}</b>
                    <span>Combined commits</span>
                  </div>
                </div>
              </div>
            ) : null}
            <button className="btn-accent" type="button" disabled={busy} onClick={() => void join()}>
              {group.join_mode === 'request' ? 'Request to join' : 'Join group'}
            </button>
          </div>
        ) : group ? (
          <>
            <div className="chat-head">
              {mode === 'thread' ? (
                <button className="icon-btn" type="button" onClick={() => { setMode('group'); setThreadId(null); }} aria-label="Back">
                  ←
                </button>
              ) : null}
              {coverSrc(group.cover_path) ? (
                <img src={coverSrc(group.cover_path)!} alt="" className="group-cover" />
              ) : (
                <Identicon seed={group.id || group.name} size={36} />
              )}
              <div>
                <strong>{group.name}</strong>
                <span className="muted">
                  {(group.member_count ?? 0).toLocaleString()} members
                  {group.rating_avg ? ` · ${group.rating_avg}★ (${group.rating_count ?? 0})` : ''}
                </span>
              </div>
              <MemberStack people={faces} total={group.member_count ?? faces.length} />
              <button className="more-btn" type="button" onClick={() => setMenu((value) => !value)} aria-label="Group menu">
                ···
              </button>
              {menu ? (
                <div className="more-menu">
                  <button type="button" onClick={() => setMode('preview')}>
                    Group info
                  </button>
                  <button type="button" onClick={() => setMembersOpen((value) => !value)}>
                    {membersOpen ? 'Hide members' : 'Show members'}
                  </button>
                  <div className="stars-row">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={(myRating[group.id] ?? 0) >= value ? 'is-on' : undefined}
                        onClick={() => setMyRating((prev) => ({ ...prev, [group.id]: value }))}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  {group.power ? (
                    <p className="muted">
                      Power {group.power.revenue} · {group.power.customers} · {group.power.commits}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            {mode === 'thread' && openThread ? (
              <>
                <div className="bubble-list">
                  <ThreadPost
                    thread={openThread}
                    name={authorOf(openThread).name}
                    photo={authorOf(openThread).photo}
                    replies={replyRows[openThread.id] ?? []}
                    onOpen={() => undefined}
                    onReact={(emoji) => void react(openThread.id, emoji)}
                  />
                  {(replyRows[openThread.id] ?? []).map((item) => (
                    <div key={item.id} className="bubble">
                      <strong>{item.author}</strong>
                      <div>{item.body}</div>
                      <time>{timeAgo(item.created_at)}</time>
                    </div>
                  ))}
                </div>
                <form
                  className="composer"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void sendReply();
                  }}
                >
                  <input value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write a reply" />
                  <button type="submit">Reply</button>
                </form>
              </>
            ) : (
              <>
                <div className="bubble-list community-feed">
                  {threads.map((thread) => {
                    const who = authorOf(thread);
                    return (
                      <ThreadPost
                        key={thread.id}
                        thread={thread}
                        name={who.name}
                        photo={who.photo}
                        replies={replyRows[thread.id] ?? []}
                        onOpen={() => {
                          setThreadId(thread.id);
                          setMode('thread');
                        }}
                        onReact={(emoji) => void react(thread.id, emoji)}
                      />
                    );
                  })}
                  {!threads.length ? (
                    <p className="empty">Start the first thread.</p>
                  ) : null}
                </div>
                {isMember(group.id) ? (
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
                      placeholder="Start a new thread…"
                    />
                    <button type="submit" disabled={busy || !draft.trim()}>
                      Post
                    </button>
                  </form>
                ) : (
                  <div className="composer">
                    <button type="button" onClick={() => void join()}>
                      Join to post
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <p className="empty">Pick a group, or preview one from Find new groups.</p>
        )}
      </section>

      {group && mode !== 'preview' && membersOpen ? (
        <aside className="members-rail">
          <button className="text-btn" type="button" onClick={() => setMembersOpen(false)}>
            Hide
          </button>
          <h2>Members</h2>
          {faces.map((person) => (
            <div key={person.name} className="member-row" style={{ alignItems: 'flex-start' }}>
              {person.photo ? (
                <img src={person.photo} alt="" />
              ) : (
                <span className="row-fallback" style={{ background: hueFill(person.hue ?? 140) }}>
                  {initial(person.name)}
                </span>
              )}
              <div>
                <strong>
                  {person.name}
                  {person.role === 'owner' ? <em className="muted" style={{ fontStyle: 'normal', marginLeft: 6 }}>Owner</em> : null}
                </strong>
                {person.bio ? <span className="muted">{person.bio}</span> : null}
                {person.apps != null || person.revenue ? (
                  <span className="muted">
                    {person.apps ?? 0} app{(person.apps ?? 0) === 1 ? '' : 's'}
                    {person.commits != null ? ` · ${person.commits.toLocaleString()} commits` : ''}
                    {person.revenue ? ` · ${person.revenue}` : ''}
                  </span>
                ) : null}
                {(person.listings?.length || person.app) ? (
                  <div className="member-apps">
                    {(person.listings?.length
                      ? person.listings
                      : [{ name: person.app!, hue: person.appHue ?? 140, icon: person.appIcon }]
                    ).slice(0, 6).map((app) =>
                      app.icon ? (
                        <img key={app.name} src={app.icon} alt="" title={app.name} />
                      ) : (
                        <span
                          key={app.name}
                          title={app.name}
                          style={{ background: hueFill(app.hue), display: 'grid', placeItems: 'center', fontSize: 11 }}
                        >
                          {app.name.slice(0, 1)}
                        </span>
                      ),
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          {group.power ? (
            <>
              <span className="eyebrow">Group power</span>
              <div className="group-power" style={{ gridTemplateColumns: '1fr' }}>
                <div>
                  <b>{group.power.revenue}</b>
                  <span>Combined revenue</span>
                </div>
                <div>
                  <b>{group.power.customers}</b>
                  <span>Combined customers</span>
                </div>
                <div>
                  <b>{group.power.commits}</b>
                  <span>Combined commits</span>
                </div>
              </div>
            </>
          ) : null}
        </aside>
      ) : group && mode !== 'preview' ? (
        <button className="text-btn" type="button" style={{ position: 'absolute', right: 12, top: 18 }} onClick={() => setMembersOpen(true)}>
          Members
        </button>
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}

function lastLine(row: Group) {
  if (row.last_preview) {
    const who = row.last_author?.split(' ')[0];
    return `${who ? `${who}: ` : ''}${row.last_preview.replace(/\s+/g, ' ')}`;
  }
  const thread = SEED_THREADS.filter((item) => item.group_id === row.id).at(-1);
  if (thread) {
    const who = thread.author.split(' ')[0];
    return `${who}: ${thread.body.replace(/\s+/g, ' ')}`;
  }
  return row.bio || 'Open to read threads';
}

function GroupRow({
  row,
  active,
  joined,
  onClick,
}: {
  row: Group;
  active: boolean;
  joined?: boolean;
  onClick: () => void;
}) {
  const src = coverSrc(row.cover_path);
  return (
    <button type="button" className={`row-card${active ? ' is-on' : ''}`} onClick={onClick}>
      {src ? <img src={src} alt="" /> : <Identicon seed={row.cover_path?.replace('identicon:', '') || row.id || row.name} size={44} />}
      <div className="row-copy">
        <strong>{row.name}</strong>
        <span>
          {joined
            ? lastLine(row)
            : `${(row.member_count ?? 0).toLocaleString()} members${row.rating_avg ? ` · ${row.rating_avg}★` : ''}`}
        </span>
      </div>
    </button>
  );
}
