# htg.chat — Implementation Plan

The source of truth for the Hey100 → htg.chat pivot. Read this before working on any htg.chat task, and update the **Progress log** (bottom) when a task lands.

- Product + design spec: [`design/htg/htg-chat-v3-spec.md`](../design/htg/htg-chat-v3-spec.md)
- Design file (37 screens, open in a browser): [`design/htg/htg-chat-v3.html`](../design/htg/htg-chat-v3.html)
- Screen IDs used below (`[G1]`, `[R5]`, …) match the `data-screen-label` on each phone frame and the headings in the spec.

Where this plan and the spec disagree, **this plan wins** (see §1 Decisions). Where both are silent, take the default marked **(default)** and note any change in §1.

---

## Contents

1. Decisions log
2. Product summary
3. Architecture
4. Data model
5. Access rules (SQL)
6. Daily question engine + AI question agent
7. Peek, eavesdrop, credits
8. TLDR pipeline + Ask
9. Notifications
10. Billing (App Store + RevenueCat)
11. Apple App Review compliance
12. App routes + screens
13. Teardown list
14. Phases + tasks
15. Testing + verification
16. Risks + open questions
17. Progress log

---

## 1. Decisions log

| # | Decision | Notes |
|---|---|---|
| D1 | **Question source:** AI adds 2–3 candidates per group per day into the same queue as member submissions. Top-voted wins at cutoff. No votes → best AI candidate. | Replaces spec §2.10 "member top question only". |
| D2 | **AI review:** auto-publish. Admin screen to preview, edit, pin or veto tomorrow's question per group. | |
| D3 | **Repo:** same repo, rebrand to htg.chat, delete all Hey100-only features. | §13 |
| D4 | **Web (Next.js):** marketing + invite landing + share pages + AI/cron API routes. No web app for chat. | Delete `web/app/(app)`. |
| D5 | **Scope:** everything in the spec and design ships. | Phased in §14. |
| D6 | **Invites:** 3 peek credits per friend who joins, any band, no cap, never expire. | Fix `[C5]` copy: drop "3 of 5 invites left" and "you both get a week of Peek". |
| D7 | **Question day:** one timezone per group. Everyone in a group rolls over together at 12am group time. | Replaces spec §2.4 per-user local day. |
| D8 | **Groups at launch:** strict revenue bands, all categories together (`$5–10k · All`). At ≥30 members a band splits by category; categories too small for their own group stay in `$5–10k · Mixed`. | §6.6 |
| D9 | **App Store:** reuse the Hey100 App Store record + bundle ID `com.hey100.app`, display name → htg.chat. | |
| D10 | **Products:** none exist yet; create per §10. | |
| D11 | **AI tab name:** "TLDR" everywhere (design says "Summary" in places; replace). | |
| D12 | **Domain:** keep `hey100.com` for now (auth redirects, universal links). One config constant so it swaps to `htg.chat` later. | §3.4 |
| D13 | **Migrations:** no real users. Reset the database to a new baseline schema; no data migration. | Remote reset needs explicit go-ahead at execution time. |
| D14 | **Voice:** on-device live transcription (iOS Speech framework via `expo-speech-recognition`). Audio never leaves the device and is never stored. | (default) keeps voice out of third-party AI. |
| D15 | **LLM:** Anthropic Claude (already used in `web/lib/coach.ts`). Embeddings: OpenAI `text-embedding-3-small` (key already present) into pgvector. | (default) |
| D16 | **Free chat after answering:** once you answer a day, the composer becomes normal group chat. Non-answer messages on a day follow the same unlock rule as that day's answers. | (default) |
| D17 | **DMs after moving band:** existing DM threads survive a band move; *new* DMs still require a shared group. | Spec §8 "keep DMs". |
| D18 | **Combined group MRR:** sum of exact verified MRR when the group has ≥5 members; below that, sum of band midpoints so no single member's MRR can be reverse-engineered. | (default) |
| D19 | **Usage counters are derived, not stored:** peeks/week, asks/month and category changes/month are counted from their event tables. No counter columns on `profiles`. | Avoids drift and reset jobs. |

---

## 2. Product summary

Founders verify revenue (Stripe restricted key, RevenueCat v2 secret key, or GitHub commits for pre-revenue), set up a personal profile and a product, and get placed in a group for their revenue band. Each group gets **one question a day**. You must answer that day's question to read that day's answers (text or live voice-to-text, plus images). After answering, the room is a continuous group chat with threads, reactions, quotes, bookmarks and DMs to fellow members.

Groups in higher bands are visible but locked. **Pro** can **Peek** (read-only, today only, up to 2 bands above, 3/week + invite credits). **Ultimate** can peek anywhere above with full history and **Eavesdrop** (follow a higher group with alerts; its insights flow into TLDR). **TLDR** is an AI tab: a ranked insight feed across groups plus "Ask anything" over only the content you can access.

Bands: `Pre-revenue · $0–1k · $1–5k · $5–10k · $10–25k · $25–50k · $50k+` (monthly).
Categories: `SaaS · Mobile app · AI · Dev tools · E-com` (extendable table).
Plans: Member $5 · Pro $18 (default selection) · Ultimate $39. Hard paywall after placement.

---

## 3. Architecture

### 3.1 Components

| Layer | What runs there |
|---|---|
| **iOS app** (Expo 54, expo-router, React Query, Supabase JS) | All UX. Talks to Supabase directly (RLS + RPCs) and to the web API for AI. |
| **Supabase Postgres** | Schema, RLS, `security definer` RPCs for every gated action, pg_cron for DB-only jobs, Realtime for chat, Storage for avatars / product icons / message media, pgvector for embeddings. |
| **Supabase Edge Functions (Deno)** | `revenue-verify` (Stripe/RevenueCat/GitHub; refactor of `listing-connect`), `revenue-recheck` (monthly), `revenuecat-webhook`, `sync-plan`, `register-push`, `send-push`. |
| **Next.js on Vercel (`web/`)** | Marketing + `/i/[code]` invite landing + `/a/[shareId]` share pages + legal pages. API: `/api/tldr/ask`, `/api/cron/question-agent`, `/api/cron/tldr-nightly`, `/api/cron/tldr-week`, `/api/admin/*`. |
| **Third parties** | Anthropic (questions, tagging, summaries, Ask), OpenAI (embeddings, optional text moderation), RevenueCat (billing), OneSignal (push), PostHog (analytics), Stripe / RevenueCat / GitHub APIs (verification, read-only). |

### 3.2 Why AI lives in `web/` and not edge functions
Claude streaming, prompt code and the Anthropic key are already in `web/lib/coach.ts`; Vercel Cron gives scheduled AI jobs with longer timeouts. Web routes authenticate the caller with the Supabase JWT (`Authorization: Bearer`) and use a service-role client server-side. Cron routes require `CRON_SECRET`.

### 3.3 Job schedule

| Job | Where | Schedule | Does |
|---|---|---|---|
| `app.rollover_questions()` | pg_cron | every 5 min | For each group whose local date advanced, publishes today's `daily_questions` row from the queue winner (§6.3). |
| `question-agent` | Vercel Cron → `/api/cron/question-agent` | hourly | For each group whose local time is ~6pm and has <3 AI candidates for tomorrow, generates candidates (§6.4). |
| `app.enqueue_question_pushes()` | pg_cron | every 15 min | Queues the 8am "question drop" push per user (§9). |
| `tldr-nightly` | Vercel Cron | 01:00 UTC | Tag, embed, rank, summarise, hot themes (§8.2). |
| `tldr-week` | Vercel Cron | every 3 h | Refresh "Week" rank scores + new-answer embeddings. |
| `app.split_groups()` | pg_cron | daily 09:00 UTC | Band/category splitting (§6.6). Runs as a proposal; admin confirms (default). |
| `app.recompute_group_tz()` | pg_cron | weekly | Group timezone = mode of member timezones; takes effect at the next rollover. |
| `revenue-recheck` | pg_cron → edge fn | daily, each user re-checked every 30 days | Band moves, disconnect grace (§8 of spec). |
| `app.flush_push_outbox()` | existing | existing | Already in repo; reuse. |

### 3.4 Config constants
- `src/lib/config.ts`: `APP_NAME = 'htg.chat'`, `PUBLIC_DOMAIN = 'hey100.com'` (D12), `OFFICIAL_USER_ID` (Jaryd), plan prices for display only (real prices come from RevenueCat offerings).
- `app.config.ts`: name `htg.chat`, keep `slug`, `scheme`, `BUNDLE_ID`, `DOMAIN` as is for now. Add `NSMicrophoneUsageDescription`, `NSSpeechRecognitionUsageDescription`, keep photo library strings.
- Thresholds live in a single `app.settings` table (key/value) so they can be tuned without a deploy: `split_min_members=30`, `category_min_members=8`, `cohort_max_members=80`, `pro_peeks_per_week=3`, `pro_peek_band_range=2`, `member_asks_per_month=5`, `invite_peek_credits=3`, `answer_edit_minutes=15`, `category_changes_per_month=2`, `disconnect_grace_days=7`, `ai_candidates_per_day=3`.

---

## 4. Data model

New baseline migration `supabase/migrations/<ts>_htg_baseline.sql`. Old migrations move to `supabase/migrations_hey100_archive/` (kept for reference, not applied). All tables RLS-enabled; writes go through RPCs unless trivially owner-scoped.

### 4.1 Reference
```
bands(id text pk, label, min_cents int, max_cents int null, midpoint_cents int, sort int)
  -- pre_revenue(0,0) · b0_1k · b1_5k · b5_10k · b10_25k · b25_50k · b50k_plus(max null, midpoint 7_500_000)
categories(slug text pk, label, sort int, active bool)
app.settings(key text pk, value jsonb)
```

### 4.2 People
```
profiles(
  id uuid pk -> auth.users, name, avatar_path, bio (<=160), socials jsonb {instagram,x,tiktok,substack,linkedin},
  show_exact_mrr bool default false, timezone text, primary_category -> categories,
  plan text check in ('none','member','pro','ultimate') default 'none', plan_expires_at,
  is_official bool, is_admin bool,
  terms_accepted_at, ai_consent_at, onboarding_step text, onboarded_at,
  banned_at, created_at)
products(id, user_id unique -> profiles, name, icon_path, one_liner, url, category -> categories)
category_changes(id, user_id, from_category, to_category, created_at)           -- 2/month rule
notification_prefs(user_id pk, daily_question bool, replies bool, eavesdrop bool, dms bool)
```
Exact MRR is never in `profiles`. Public profile reads go through a view `public_profiles` that exposes `band_id` and `exact_mrr_cents` only when `show_exact_mrr`.

### 4.3 Revenue
```
revenue_connections(user_id pk, provider in ('stripe','revenuecat','github'), status in ('pending','verified','failed','disconnected'),
  band_id, mrr_cents, subscriptions int, commits_90d int, github_login, rc_project_id,
  verified_at, last_checked_at, below_band_since date, grace_until timestamptz, error text)
revenue_secrets(user_id pk, provider, secret_ciphertext)  -- service role only; reuse app_connection_secrets pattern
revenue_checks(id, user_id, provider, mrr_cents, band_id, checked_at)          -- history for band moves
```
RLS: owner can select their own `revenue_connections` (that's the only place exact MRR is client-visible, for `[O5]`); nobody can select `revenue_secrets`.

### 4.4 Groups
```
groups(id, band_id, category null (null = all/mixed), kind in ('band_all','category','mixed'), cohort int default 1,
  parent_group_id null, timezone text default 'America/New_York', status in ('active','archived'),
  created_at, split_at)
memberships(user_id, group_id, is_primary bool, joined_at, left_at null, muted bool, last_read_at, pk(user_id, group_id))
group_stats  -- view: member_count, combined_mrr_cents (D18), avg_mrr_cents, growth_pct_month, answers_today, peeks_today
group_split_proposals(id, band_id, source_group_id, plan jsonb, status in ('proposed','applied','dismissed'), created_at)
```
`unique(user_id) where is_primary and left_at is null` — exactly one primary group.

### 4.5 Questions
```
daily_questions(id, group_id, question_date date, text, theme, source in ('member','ai','admin','bank'),
  candidate_id null, asked_by_user_id null, published_at, unique(group_id, question_date))
question_candidates(id, group_id, for_date date, text, theme, source in ('member','ai','admin'),
  author_user_id null, ai_rationale text, ai_run_id null, status in ('open','picked','vetoed','expired'),
  pinned bool, hidden_at, created_at)
  -- unique(group_id, for_date, author_user_id) where source='member'   -- one member submission per day
question_votes(candidate_id, user_id, created_at, pk(candidate_id, user_id))
question_bank(id, text, theme, min_band, max_band, categories text[], used_count)   -- cold start + fallback
ai_runs(id, kind in ('question_agent','tldr_tag','tldr_summary','tldr_ask'), group_id null, model, input_tokens,
  output_tokens, status, error, created_at)                                           -- cost + debugging
```

### 4.6 Messages
```
messages(id, group_id, author_id, day_question_id -> daily_questions,   -- the day bucket the message belongs to
  kind in ('answer','chat','thread_reply','system'),
  parent_id null (thread), also_in_group bool, quoted_message_id null,
  body text, answered_late bool, created_at, edited_at, deleted_at, hidden_at, hidden_by)
  -- unique(author_id, day_question_id) where kind='answer'  -- one answer per user per day
message_media(id, message_id, path, width, height, sort)
reactions(message_id, user_id, emoji, created_at, pk(message_id, user_id, emoji))
bookmarks(id, user_id, message_id, snapshot jsonb, created_at, unique(user_id, message_id))
  -- snapshot = {question_text, question_date, group_label, band_id, author_name, author_product, body, parent_body?}
answer_shares(id, message_id, user_id, show_identity bool, created_at)        -- backs /a/[id] share pages
```
A late answer is inserted with the past `day_question_id` and `answered_late = true`; the client sorts by day bucket then `created_at`, so it sits in that day's section.

### 4.7 DMs
```
dm_threads(id, user_a, user_b, is_official bool, status in ('request','active'), created_by, created_at, unique(least, greatest))
dm_participants(thread_id, user_id, last_read_at, muted bool, hidden bool, accepted_at)
dm_messages(id, thread_id, sender_id, body, quoted_message_id null, quote_snapshot jsonb, created_at, deleted_at, hidden_at)
dm_media(id, dm_message_id, path, width, height)
dm_reactions(dm_message_id, user_id, emoji)
```
First DM from someone you haven't messaged lands in **Requests** until you reply or accept (Chats filter chip). The Jaryd thread is created at sign-up with `is_official`, pinned, can't be hidden, can be muted. Reuse the admin inbox (`AdminInbox.tsx`, `admin_dms` pattern) for Jaryd's replies.

### 4.8 Peek / eavesdrop / invites
```
peeks(id, user_id, group_id, question_date, source in ('weekly','credit','ultimate'), created_at, unique(user_id, group_id, question_date))
peek_credit_ledger(id, user_id, delta int, reason in ('invite','spend','admin'), invite_redemption_id null, peek_id null, created_at)
eavesdrops(user_id, group_id, alerts bool, created_at, pk(user_id, group_id))
invite_codes(code pk, user_id unique, created_at)                 -- HTG-XXXX-XX
invite_redemptions(id, code, inviter_id, invitee_id unique, joined_at, credits_granted int)
```
`joined_at` = invitee completed placement **and** has an active plan; credits are granted then (prevents farming with throwaway sign-ups).

### 4.9 Safety + moderation
```
user_blocks(blocker_id, blocked_id, created_at, pk)               -- keep existing shape
reports(id, reporter_id, target_type in ('user','message','dm_message','group','question'), target_id,
  subject_user_id, reason in ('spam','fake_revenue','harassment','sharing_outside','other'), note,
  status in ('open','actioned','dismissed'), action text, resolved_by, resolved_at, created_at)
moderation_actions(id, admin_id, action in ('hide_message','hide_question','remove_from_group','ban','unban','reverify_revenue'),
  target_type, target_id, report_id null, note, created_at)
```

### 4.10 TLDR
```
themes(slug pk, label, color, sort)                                -- Pricing, Hiring, Channels, Retention, Fundraising, Tooling, Product, Ops, Burnout…
message_themes(message_id, theme, subtopic, confidence, pk(message_id, theme))
message_embeddings(message_id pk, embedding vector(1536), model, created_at)   -- answers + thread replies
tldr_items(id, kind in ('top_question','top_answer','group_insight','theme_insight'), period in ('week','all'),
  group_id null, theme null, daily_question_id null, message_id null, text, rank_score numeric,
  participant_mrr_cents bigint, source_message_ids uuid[], period_start, period_end, created_at)
theme_stats(theme, period_start, period_end, answer_count, group_count, hot bool)
tldr_conversations(id, user_id, created_at)
tldr_asks(id, conversation_id, user_id, question, answer, citations jsonb, created_at)   -- asks/month counted here
```

---

## 5. Access rules (SQL)

All in `app.` schema as `stable security definer` functions, used by RLS policies and RPCs. Never re-implemented on the client; the client calls `my_group_state(group_id)` / `my_entitlements()` to render.

```
app.group_today(g)                       -> date in g.timezone
app.is_member(u, g)                      -> active membership, not banned
app.has_answered(u, dq)                  -> answer exists (deleted answers still count; deleting doesn't re-lock)
app.has_answered_any_today(u)            -> answered today's question in any of u's groups
app.band_rank(band_id)                   -> sort int
app.bands_above(u, g)                    -> band_rank(g.band) - band_rank(u primary band); >0 means above
app.peeks_used_this_week(u)              -> count(peeks where source='weekly' and created_at >= Monday 00:00 in u.timezone)
app.peek_credits(u)                      -> sum(peek_credit_ledger.delta)
app.can_read_day(u, g, dq) =
    is_member(u,g) ? has_answered(u,dq)
  : bands_above(u,g) > 0 and has_answered_any_today(u) and (
        plan(u)='ultimate'
     or (dq.question_date = group_today(g) and bands_above(u,g) <= 2 and exists(peeks for u,g,today)))
app.can_read_message(u, m)               -> can_read_day(u, m.group, m.day_question) and not hidden and not deleted
app.can_post(u, g)                       -> is_member and plan<>'none' and not banned
app.can_dm(u, v)                         -> v.is_official or shares_active_group(u,v) or existing_thread(u,v); and no block either way
app.can_eavesdrop(u, g)                  -> plan='ultimate' and bands_above(u,g) > 0
```

- Peek allowance is **consumed** only in `start_peek(g)` (RPC): idempotent per (user, group, group_today). Order: Ultimate → free; Pro weekly allowance → `weekly`; else credits → `credit` + ledger `-1`; else error `no_peeks`. Member plan with credits is allowed (Pro range rules).
- Eavesdropping implies full-history read (Ultimate), so `can_read_day` is enough; eavesdrops only drive alerts + TLDR.
- Plan `none` (lapsed / not yet paid): only the Jaryd DM, Settings, profile and paywall are reachable. RLS enforces it for group content too.
- Blocks: `messages` select policy also excludes nothing (blocked users' messages are still returned so the client can collapse them as "Blocked user · show"); DMs and new threads between blocked pairs are rejected in RPCs.
- Peek counters: `group_stats.peeks_today` counts distinct peekers for that group's today. Peekers are never exposed.

RPCs (write paths): `complete_onboarding_step`, `place_me()`, `change_primary_category`, `join_category_group`, `leave_group`, `rejoin_group`, `post_answer(dq, body, media)`, `post_message(g, body, media, parent_id, also_in_group, quoted_id)`, `edit_message` (15-min window for answers), `delete_message`, `react`, `bookmark`, `submit_question`, `vote_question`, `start_peek`, `set_eavesdrop`, `open_dm`, `send_dm`, `accept_dm`, `mute_group`, `mute_dm`, `mark_read`, `block_user`, `unblock_user`, `report`, `redeem_invite`, `delete_my_account`, plus admin RPCs (§11.4).

Every text-accepting RPC runs `app.blocked_phrase(text)` (port of `src/lib/contentFilter.ts`, extended) and rejects on match.

---

## 6. Daily question engine + AI question agent

### 6.1 Lifecycle for one group
1. **Day D, all day:** members submit (1/day) and vote on `question_candidates` with `for_date = D+1`. Voting requires membership; you can't vote your own.
2. **Day D, ~18:00 group time:** question agent adds AI candidates for D+1 (§6.4). They appear in `[R7]` tagged "Suggested" (no author).
3. **Day D, until 23:59:** admin can preview the leader, edit text, pin a candidate (forces win) or veto (`status='vetoed'`).
4. **D+1 00:00 group time:** `app.rollover_questions()` publishes `daily_questions(D+1)`.
5. **D+1 08:00 user-local:** question-drop push (§9).

### 6.2 Queue UI rules `[R7]`
Sorted by votes desc, then created_at. Your own submission tagged. "Asked by …" credit on the published question for member wins. Ties: member submission beats AI; earlier wins.

### 6.3 Winner selection (`rollover_questions`)
`pinned` candidate → highest-voted open candidate with ≥1 vote → top-ranked AI candidate (agent's own ordering) → `question_bank` pick matching band/category not used by this group in 90 days → generic fallback. Every path writes `source` so we can measure AI vs member wins. Losers → `expired`. Idempotent (unique `(group_id, question_date)`).

### 6.4 AI question agent (`/api/cron/question-agent`)
**Goal:** questions that fit each group's band, category and size, keep variance, and drive answers.

**Inputs assembled per group (SQL function `app.agent_context(g)`):**
- Band label, category (or "mixed: SaaS 12, Mobile 9…"), member count, active answerers last 7 days.
- Members' product one-liners (aggregate, no names), up to 40.
- Last 60 days of this group's questions with: theme, answer rate (answers / members), replies, reactions, avg answer length.
- Theme coverage for this group over 14 days (from `message_themes`).
- Top-performing questions from **other** groups in neighbouring bands over 30 days (cross-pollination), with their answer rates.
- Open member submissions for tomorrow (so the agent doesn't duplicate them).

**Prompt contract (Claude, JSON output validated with zod):**
```
{ candidates: [{ text, theme, rationale, expected_answer_rate: 'low'|'med'|'high', novelty_note }] }  // exactly N (setting)
```
Rules in the system prompt: one sentence, ≤140 chars, answerable in 1–3 sentences from personal experience, specific to the band's stage, no yes/no, no questions asking others to reveal exact revenue, no repeat of a theme used in the last 3 days, at most one candidate per theme, small groups (<15) get more personal/easy questions, large groups more specific/tactical.

**Post-filters (server):** content filter; embedding cosine similarity vs. this group's last 90 days of questions and vs. open candidates must be < 0.88 (else drop and regenerate once); insert as `source='ai'` with `ai_rationale`. Log to `ai_runs`.

**Cold start:** groups with no history get candidates from `question_bank` re-ranked by the agent for the band. Seed `question_bank` with ~150 curated questions tagged by theme and band range (Phase 4 task).

**Admin (`/admin/questions`, in-app, `is_admin`):** per group, tomorrow's leader + all candidates with votes and rationale; actions Edit, Pin, Veto, Add admin candidate. Also "today" view to fix a published question (edit text only, before 08:00 push).

### 6.5 Answering `[G1]` `[G2]`
- Composer in locked state is the answer field. Voice: tap mic → on-device streaming transcription into the editable text; "● TRANSCRIBING · 0:14"; stop to finish; text stays editable; audio discarded.
- Media: `[G4b]` drawer (camera, photos, file, link), up to 4 images; upload to `message-media/{group}/{user}/…` then `post_answer`.
- On success the room unblurs with the reveal animation; realtime subscription starts delivering the day's messages.
- Past day: question divider shows **Answer to unlock** → opens the same panel bound to that `day_question_id`; posts with "answered late · 26 Nov"; no notifications.
- Edit answer for 15 min; delete anytime (`deleted_at`, shown as "Answer removed by author"; bookmarks keep snapshot but render the removed state per spec §7.7).

### 6.6 Group placement + splitting
- **Placement (`place_me`)**: after verification: band from `revenue_connections.band_id`; find active group for (band, user's category) → else (band, mixed) → else (band, all) with < `cohort_max_members`; else create next cohort. Creates primary membership.
- **Split proposal (`app.split_groups`)**: for a `band_all` group with ≥ `split_min_members`: each category with ≥ `category_min_members` primary members gets a new `category` group; everyone else stays in the original, which becomes `kind='mixed'`. Written to `group_split_proposals`; admin applies from `/admin/groups` (default: manual confirm for the first splits, flip a setting to auto-apply later).
- **Applying a split:** move memberships; new groups inherit the parent's timezone and today's question (copy the `daily_questions` row so nobody loses an in-progress day); `parent_group_id` set so members can still open "Earlier in $5–10k · All" history (read rules use the parent group + their answers there).
- **Cohorts:** when any group exceeds `cohort_max_members`, the same mechanism creates `Cohort 2` for new placements; existing members stay.
- **Other-category memberships:** "Join another category" lists same-band `category`/`mixed` groups. Before any split exists, the list is empty with copy "Categories open up as your band grows."
- **Primary category change:** max 2/month from `category_changes`; moves primary membership to the matching group in the band (or mixed/all); confirmation sheet shows "1 of 2 changes left this month".
- **Band changes (`revenue-recheck`)**: up → move primary + celebration screen; down → set `below_band_since`, move after 2 consecutive monthly checks below. Other-category memberships move with the band. Disconnected → `grace_until = now()+7d`, then group access paused (`can_post`/`can_read_day` false, banner in app).

---

## 7. Peek, eavesdrop, credits

- `[R3]` ladder rows come from `my_ladder()`: groups above the user's band, own category first, then others; each row includes today's question, answers today, and the user's state: `peekable | peeked_today | needs_answer | needs_plan | out_of_peeks | beyond_plan(ULTIMATE) | eavesdropping`.
- `[P1]` CTA states map 1:1 to those states (Answer in your group first / Peek / Get unlimited peeks › / Paywall).
- `[P2]` peeking: same group chat component in `readOnly` mode: no composer, long-press limited to Copy + Bookmark, header chip 👁 PEEKING, bottom bar with Eavesdrop button. Pro: today only. Ultimate: full history.
- `[P3]`/`[R11]` eavesdrop: `set_eavesdrop(g, on, alerts)`; pink accents; appears in Chats with pink badge/unread dot; Stop from group info.
- Settings + `[P1]` copy: "2 of 3 this week + 6 invite credits" from `my_entitlements()`.
- Invites `[C5]`: code per user; share link `https://hey100.com/i/{code}`; landing page deep-links to the app (existing universal links + `app/invite/[code].tsx`); code stored at sign-up, redeemed by `redeem_invite`; credits granted when invitee places + subscribes.

---

## 8. TLDR pipeline + Ask

### 8.1 Corpus permissions (enforced in SQL, not prompts)
`app.tldr_scope(u)` returns readable (group_id, day_question_id) pairs: own groups' answered days; peeked groups today; Ultimate: all groups above; eavesdropped groups flagged for pink styling. Higher groups the user can't read contribute **only** `tldr_items` of kind `top_question`, `theme_insight` and answer excerpts ≤140 chars (teasers that route to the peek check). Never DMs, other users' bookmarks, or groups below.

### 8.2 Nightly job (`/api/cron/tldr-nightly`)
1. **Collect** answers + thread replies created since last run (non-hidden, non-deleted).
2. **Tag**: Claude classifies each into 1–3 themes from `themes` + free-form subtopic → `message_themes` (batched, 50 per call).
3. **Embed**: OpenAI embeddings → `message_embeddings`.
4. **Rank** (SQL): per question/answer, `Σ distinct participants' MRR` (exact if `show_exact_mrr`, else band midpoint) × recency decay (Week: 7-day half-life; All time: none) + small reaction/bookmark bonus → `tldr_items.rank_score`, `participant_mrr_cents`.
5. **Summarise**: per group per theme with ≥3 answers in period, Claude writes a 1–2 sentence insight citing message IDs (validated: every cited ID must be in the input set) → `tldr_items(kind='group_insight' | 'theme_insight')`.
6. **Hot**: theme is HOT when week-over-week answer count grows >50% across ≥2 groups → `theme_stats.hot`.

### 8.3 Feed `[R9]` `[R9c]` `[R9b]`
`tldr_feed(tab, theme?, cursor)` RPC applies scope; mixes Top question (higher group → Peek), Top answer, Your group insight, eavesdropped insights (pink); guarantees an "above you" card in the first three. Tabs: All time, Week, Theme (carousel + list → theme feed), Top Q, Top A, Saved (bookmarks). Search covers feed + Saved (Postgres full-text on `tldr_items.text` and bookmark snapshots).

### 8.4 Ask `[R10]` (`/api/tldr/ask`, streaming)
1. Auth JWT → user. Check quota: Member `count(tldr_asks this calendar month) < member_asks_per_month`, else 402 → paywall. Follow-ups count.
2. Embed question → `app.tldr_search(u, embedding, k=24)` (security definer; filters by `tldr_scope`) + top `tldr_items` for aggregate context.
3. Claude answers with a strict format: prose + `citations: [{message_id}]`; server drops citations not in the retrieved set and attaches group band + member name chips.
4. Suggested actions computed server-side: "Ask my group this" (pre-fills `[R7]`), "Peek $10–25k" (if a cited aggregate came from a locked group).
5. Persist `tldr_asks`; history per user only.

---

## 9. Notifications

OneSignal via existing `register-push` / `send-push` / `app.push_outbox`. Permission asked at `[N]`; app works fully without it.

| Push | Trigger | Pref | Respect |
|---|---|---|---|
| Question drop | 08:00 user-local, for each group whose current question the user hasn't answered (one push, lists primary group) | daily_question | group mute |
| Reply / reaction to your answer | insert | replies | thread/group mute, blocks |
| DM / DM request | insert | dms | DM mute, blocks |
| Your question was picked | rollover | replies | — |
| Eavesdropped group answered | first 5 answers/day, batched | eavesdrop | eavesdrop alerts toggle |
| Weekly: "Your group was peeked N times" / TLDR digest | Monday 09:00 local | daily_question | — |

Muting: group (from `[G8]`), DM thread (from DM `···`), Jaryd DM (mute only), eavesdrop alerts, plus per-type toggles in Settings. Muted conversations still show unread counts but never push.

---

## 10. Billing (App Store + RevenueCat)

### 10.1 Create in App Store Connect (record `com.hey100.app`)
- Subscription group **htg.chat** with three auto-renewable monthly products (levels, highest first so upgrades are immediate and downgrades apply at renewal):
  1. `htg_ultimate_monthly` — $39 (nearest Apple price point if $39.00 unavailable: $38.99)
  2. `htg_pro_monthly` — $18 ($17.99)
  3. `htg_member_monthly` — $5 ($4.99)
- Localised display names + descriptions matching the paywall benefits; review screenshot of `[PW]` for each.
- Remove `hey100_pro_monthly` from sale (keep record; don't delete).
- No free trial at launch (default). Introductory offers can be added later without code changes.

### 10.2 RevenueCat
- Entitlements: `member`, `pro`, `ultimate`. Attach: Ultimate product → all three; Pro → `member` + `pro`; Member → `member`.
- Offering `default` with packages `member`, `pro`, `ultimate` (custom identifiers). Paywall reads prices from the offering.
- Webhook → `revenuecat-webhook` (existing; rewrite `hasPro` into `planFrom(entitlements)` → highest of ultimate/pro/member/none). `sync-plan` same mapping. Delete the any-entitlement-means-Pro hack from the uncommitted Hey100 work.
- Client `src/lib/purchases.ts`: `planFrom(customerInfo)`, `purchase(packageId)`, restore, manage. Server is the source of truth for gating (`profiles.plan`); client value only drives optimistic UI.

### 10.3 Paywall `[PW]` behaviour
Plan rows (Pro preselected; "Get unlimited peeks" preselects Ultimate), benefits update per plan, Continue → StoreKit → `sync-plan` → land in group (locked). Terms · Privacy · Restore links visible. Also a small **"Not now"** menu (top-right `···`) with Log out and Delete account (§11.2).

---

## 11. Apple App Review compliance

These are **release blockers**. Each has an owner phase in §14 and a check in §15.

### 11.1 User-generated content — Guideline 1.2
Applies to answers, chat, thread replies, DMs, question submissions, profile and product text, and images.
- **Terms acceptance (EULA):** sign-in drawer `[O1b]` requires agreeing to Terms that state zero tolerance for objectionable content and abusive users. Store `terms_accepted_at`; block onboarding until set.
- **Filtering:** `app.blocked_phrase()` on every text RPC (port + extend current list). Optional (default on): OpenAI moderation on answers/messages/DMs/question submissions and on uploaded images before they're visible; flagged items are held (`hidden_at`) and land in the admin report queue.
- **Report:** long-press any message `[G5]` (own group, peeked group, thread, DM) → `[C9]`; Report user from profile `[R8]` and DM `···`; Report group from `[G8]`; Report question from `[R7]` (long-press). Reasons per spec. Reporter sees confirmation; reported content stays visible to others until actioned, hidden for the reporter immediately (default).
- **Block:** from `[C9]` toggle, profile `···`, DM `···`. Effects: blocked user's group messages collapse to "Blocked user · show" for the blocker, no DMs either way, existing thread hidden for the blocker, no pushes from them, they aren't told. Unblock in Settings → Blocked users. Each block also creates a low-priority admin signal (Apple expects the developer to learn about abuse).
- **Act within 24 hours:** new reports push + email Jaryd (admin) via `send-push` and the existing waitlist mailer pattern; `/admin/reports` queue with actions: hide message/question, remove from group, ban (sets `banned_at`, revokes posting and DMs, hides profile), dismiss. Every action logged in `moderation_actions`.
- **Contact:** Support → Message Jaryd + support email on the legal pages and App Store listing.
- **Mute** (asked to keep): group, DM, Jaryd DM, eavesdrop alerts (§9).

### 11.2 Account deletion — Guideline 5.1.1(v)
- Settings → Delete account (red, confirm sheet) **and** reachable from the paywall `···` menu and from onboarding (sign-in completed but not subscribed), so deletion never sits behind a purchase.
- `delete-account` edge function (SQL cannot delete storage objects): calls `admin_scrub_user_content(uid)`, which empties the body of every group and DM message the user wrote, sets `deleted_at`, deletes their `message_media`/`dm_media` rows and `revenue_secrets`, and returns the media paths; the function removes those objects plus `avatars/{uid}/` and `product-icons/{uid}/`, then deletes the `auth.users` row (profile, product, memberships, peeks, etc. cascade; `messages.author_id` goes null). Rows are emptied rather than deleted so other people's thread replies and quotes keep their parent; the UI renders them as "Deleted account · message removed". Bookmarks of their messages keep the snapshot and render "Answer removed by author".
- The confirm sheet says subscriptions are managed by Apple and links to Manage Subscriptions (Apple requires telling users the subscription isn't cancelled automatically).

### 11.3 Payments — Guidelines 3.1.1 / 3.1.2
In-app purchase only for plans; no links to external purchase. Paywall shows price, period, what each plan includes, auto-renew note, Terms + Privacy links, Restore. Hard paywall is acceptable because the paywall explains the value and the reviewer can buy in sandbox.

### 11.4 Reviewer access (App Review notes)
Reviewers cannot verify real revenue. Ship a **review account**: pre-created email/password user, `revenue_connections` verified at $5–10k (provider `stripe`, flagged `review_fixture`), placed in a seeded demo group with demo founders, history and questions; plus a seeded higher group for Peek and an eavesdroppable group. Credentials + steps go in App Review notes. Do not ship any in-app "skip verification" path.

### 11.5 Privacy — Guidelines 5.1.1 / 5.1.2
- **Third-party AI disclosure + consent (5.1.2(i)):** before content leaves the device for AI processing, the user gives explicit consent. Add a clear disclosure on `[O2]` How it works (or a short consent card right before the paywall): "Your answers are processed by AI (Anthropic, OpenAI) to pick questions and build TLDR." Store `ai_consent_at`. Because the daily question + TLDR depend on it, consent is required to join a group (default); Settings shows the disclosure again.
- Permission strings: microphone + speech recognition ("Turn your voice into an answer. Audio stays on your phone."), photos, camera, notifications.
- Revenue keys: read-only keys stored in `revenue_secrets`, a table with RLS on and no client grants (service role only; Supabase encrypts the database at rest, there is no column-level encryption), deleted on Disconnect and on account deletion.
- Update App Privacy labels: contact info, user content, financial info (revenue range), identifiers, usage data; tracking: none.
- Update `hey100.com/terms` and `/privacy` (web) for htg.chat: revenue data, AI processors, OneSignal, RevenueCat, PostHog, Stripe/RevenueCat/GitHub read-only access, retention + deletion.

### 11.6 Other
Sign in with Apple stays alongside Google and email (4.8). App works without notifications. "Revenue looks fake" reports route to an admin `reverify_revenue` action.

---

## 12. App routes + screens

```
app/_layout.tsx                    providers, auth gate, plan gate
app/index.tsx                      route by onboarding_step / plan
app/onboarding/
  index.tsx              [O1][O1b] splash + sign-in drawer (terms checkbox)
  how.tsx                [O2]      three rules (+ AI disclosure, D/§11.5)
  you.tsx                [O6]      avatar, name, bio, socials
  product.tsx            [R1]      icon, name, one-liner, link, category
  revenue.tsx            [O3]      Stripe / RevenueCat / GitHub + explainer sheets
  key.tsx                [O4]      paste key (Stripe, RevenueCat + project) / GitHub OAuth
  verified.tsx           [O5]      ticket + show-exact-MRR toggle
  notifications.tsx      [N]
  placed.tsx             [R2]      group, combined MRR, ladder, today's question, blurred replies
app/paywall.tsx          [PW]
app/(tabs)/_layout.tsx             Chats · TLDR
app/(tabs)/chats.tsx     [R3]      filters All/Groups/Private/Requests, Jaryd pinned, groups, DMs, ladder, other categories
app/(tabs)/tldr.tsx      [R9][R9c][R9b]
app/group/[id]/index.tsx [G1][G2][R5][G4b][R6][G5][P1][P2][R11]  one screen, modes: member | peek-locked | peeking | eavesdropping
app/group/[id]/thread/[messageId].tsx  [G6]
app/group/[id]/ask.tsx   [R7]
app/group/[id]/info.tsx  [G8][P3]  (sheet-presented route)
app/group/[id]/members.tsx
app/dm/[id].tsx          [C8][J1]
app/u/[id].tsx           [R8]
app/me/index.tsx         [ME]
app/me/edit/*.tsx                  product, about, socials, category change, revenue reconnect
app/me/groups.tsx                  your groups + join another category
app/settings/index.tsx   [SET]
app/settings/blocked.tsx
app/settings/notifications.tsx
app/invite/index.tsx     [C5]
app/invite/[code].tsx              deep-link redemption (exists)
app/tldr/ask.tsx         [R10]
app/tldr/theme/[slug].tsx
app/admin/index.tsx                inbox (Jaryd DMs), reports, questions, groups
app/admin/reports.tsx | questions.tsx | groups.tsx | inbox.tsx
Sheets (components): ReportSheet [C9], ShareAnswerSheet [C4], MediaDrawer [G4b], MessageMenu [G5], EavesdropSheet [P3], ConfirmSheet
```

**Feature folders (new):** `src/features/{onboarding,revenue,groups,answers,chat,questions,peek,dms,tldr,profile,invites,share,safety,billing,push,admin}`. Shared UI stays in `src/components/ui` (Btn, Chip, Field, OptionRow, Sheet, Toast, Segmented, Glass, AppIcon, Avatar). New UI: `Wordmark` (HTG + .CHAT chip with tail), `GroupBubbleCluster`, `QuestionCard`, `DayDivider`, `NewDivider`, `JumpPill`, `LadderCard`, `LockedRoom` (blur), `AnswerPanel` (voice + media), `PlanRow`, `BandBadge`, `ShareCard`.

**Theme:** extend `src/theme/tokens.ts` with the htg functional colours (yellow = yours/today, black+white stroke = above, pink `#FF1C6F` = eavesdrop, `#00FF00`/`#0020A1` = verified/selected; dark chrome `#0E100F/#171A18/#232825/#E8ECE7/#8E968F`; own bubble white/black text, others `#232825`). Fonts: JetBrains Mono 500, Inter, HackerNoon (wordmark). Pixel glyphs from the design assets → `assets/glyphs/`.

**Realtime:** one channel per open group (`messages` + `reactions` filtered by `group_id`), one per open DM, and a user channel for unread counts. Postgres changes still pass RLS, so locked days never stream.

---

## 13. Teardown list

Delete (Phase 1). Check imports with `npm run typecheck` after each batch.

- **Routes:** `app/(tabs)/{apps,discover,feedback,heys,chat}.tsx`, `app/{add-app,browser,feedback-form,match,share,tools,profile,settings}.tsx`, `app/{hey,listing,l,my-app,tool,web,setup,profile,chat,group}/` (group + chat are rebuilt from scratch under new routes; mine old code for reuse first), `app/admin/[userId].tsx` (replaced).
- **Features:** `src/features/{app-page,apps,discover,feedback,heys,loop,marketing,nav,dev,community}`; keep and move `apps/connect/*` → `features/revenue/` and `chat/{Composer,MessageBubble,MessageActions,EmojiTray,useMediaPicker,uploadAttachments,useKeyboardOpen,reactions}` → reuse in `features/chat`. Old onboarding steps → replaced.
- **Data:** `src/data/{mock,prompts}.ts`, old `src/data/repo/*` not used by new features, `src/types/supabase.ts` (regenerate).
- **Edge functions:** `app-metadata`, `engagement-cron`, `waitlist-welcome` (keep its mailer helper if used for report emails); `listing-connect` → refactor into `revenue-verify`.
- **Web:** `web/app/(app)/**`, `web/app/api/{export,listing-coach}`, `web/app/badge`, `web/app/oauth/posthog`, Hey100 marketing pages → replaced with htg.chat marketing. Keep `auth/callback`, `login`, `apple-app-site-association`, `i/` (invites), legal.
- **Scripts:** `verify-loop.py`, `verify-qa.py`, `seed-demo.mjs` → replaced (§15).
- **Assets:** Hey100-only onboarding portraits and alternate icons unless reused (keep icon set; spec reuses it).
- **Hey100 billing changes** (any-entitlement-means-Pro): committed on `main`; replaced on `v2-htg-chat` by §10.

---

## 14. Phases + tasks

Each phase ends with typecheck green, the phase's checks in §15 passing, and a Progress log entry. Phases 1–3 are strictly ordered; 4–7 can overlap once 3 lands.

### Phase 0 — Prep (½ day)
- [x] Commit outstanding Hey100 work on `main` (3f6689a); all htg work happens on branch `v2-htg-chat`.
- [ ] Create App Store products + RevenueCat entitlements/offering (§10) — Jaryd.
- [ ] Env: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` on Vercel; RevenueCat keys; OneSignal unchanged.
- [ ] Enable `vector` and confirm `pg_cron`, `pg_net` on the Supabase project.

### Phase 1 — Teardown, schema, shell (2–3 days)
- [x] Delete per §13; move reusable chat + connect code.
- [x] Archive old migrations; write the baseline (§4) + access functions (§5) + RLS + seed reference data (bands, categories, themes, settings, Jaryd official profile). Split into seven `20261125150*_htg_*.sql` files; validated by `npm run db:check`.
- [ ] Reset database (**needs explicit go-ahead**), `npm run db:types`.
- [x] App shell: rebrand name, tokens, fonts, Wordmark, Chats/TLDR tabs, auth + plan gates, empty states.
- **Done when:** app boots to splash, signs in with Apple/Google/email, lands on an empty Chats tab behind the gates.

### Phase 2 — Onboarding, verification, placement, paywall (3–4 days)
- [ ] `[O1]`/`[O1b]` with Terms acceptance; `[O2]` with AI disclosure + consent.
- [ ] `[O6]` profile, `[R1]` product (avatar + product icon upload, socials chips).
- [ ] `revenue-verify` edge fn: Stripe restricted key MRR (30d), RevenueCat v2 key + project select, GitHub OAuth commits; band mapping; `revenue_secrets`.
- [ ] `[O3]` `[O4]` `[O5]` with inline errors, explainer sheets, show-exact-MRR toggle.
- [ ] `[N]` notifications (OneSignal register).
- [ ] `place_me()` + `[R2]` placement screen (combined MRR, ladder strip, today's question, blurred teaser).
- [ ] `[PW]` three-tier paywall + RevenueCat purchase/restore + webhook/sync-plan plan mapping + `···` menu with Log out / Delete account.
- [ ] Jaryd DM thread + welcome messages created on sign-up.
- **Done when:** a fresh account can go splash → paid → lands in its group (locked) in sandbox, and can delete itself from the paywall.

### Phase 3 — Group chat core (5–7 days)
- [ ] Group screen member mode: yellow header, pinned question card, day dividers, NEW divider + "N new ↓", continuous scroll-back, blurred locked days with **Answer to unlock**.
- [ ] Answer panel: text, on-device live transcription (`expo-speech-recognition`, dev build), media drawer `[G4b]`, Post, reveal animation, late answers, 15-min edit, delete.
- [ ] Post-answer chat composer, threads `[G6]` (with "Also send to group"), quotes, reactions, bookmarks, long-press menu `[G5]`.
- [ ] Realtime + read cursors + unread counts.
- [ ] Group info `[G8]` (stats, member preview, all members, invite, mute, leave/rejoin, report group).
- [ ] Member profile `[R8]` (answers/questions tabs, message, block/report), own profile `[ME]` + edit flows, primary category change with 2/month limit, Your groups.
- [ ] DMs `[C8]`: open from profile/message menu with quoted answer, Requests, mute, block, report, media, reactions; Chats list `[R3]` filters + Jaryd pinned + group bubble cluster.
- [ ] Safety end-to-end: `[C9]` report (message, DM message, user, group), block/unblock, Settings → Blocked users, content filter on all writes.
- [ ] Settings `[SET]`: plan + peeks, notifications toggles, privacy (exact MRR, connected revenue reconnect/disconnect, blocked), support (Message Jaryd, legal, restore), log out, delete account.
- **Done when:** two test accounts in one group can answer, unlock, chat, thread, react, DM, mute, block, report, and delete accounts, with RLS proven (§15.2).

### Phase 4 — Question queue + AI agent + admin (3–4 days)
- [ ] `[R7]` queue: submit (1/day), vote, own tag, report question; "Ask the group tomorrow" entry points.
- [ ] `rollover_questions` cron + group timezone recompute.
- [ ] `question_bank` seed (~150 questions, themed, band ranges).
- [ ] `/api/cron/question-agent`: context SQL, prompt, zod validation, similarity dedupe, `ai_runs` logging.
- [ ] Admin: `/admin/questions` (preview, edit, pin, veto, add), `/admin/reports` (queue + actions + 24h alert push/email), `/admin/groups` (split proposals, apply), `/admin/inbox` (Jaryd DMs).
- [ ] Question-drop push at 08:00 local; "your question was picked" push.
- **Done when:** a group rolls over at its midnight with a voted member question; with no votes an AI candidate wins; admin can veto before rollover.

### Phase 5 — Peek, ladder, eavesdrop (2–3 days)
- [ ] `my_ladder()`, `my_entitlements()`, `start_peek()`, `set_eavesdrop()`.
- [ ] Chats ladder section + Other categories + "See all".
- [ ] Group screen peek-locked `[P1]` / peeking `[P2]` / eavesdropping `[R11]` modes; eavesdrop sheet `[P3]`; in-chat ladder carousel in `[R5]`; 👁 peeks-today chip.
- [ ] Eavesdrop alerts push; paywall preselect Ultimate from "Get unlimited peeks".
- **Done when:** plan matrix test (§15.2) passes for none/member/pro/ultimate × answered/not × bands above 1/2/3.

### Phase 6 — TLDR (4–5 days)
- [ ] pgvector tables, `tldr_scope`, `tldr_search`, `tldr_feed`.
- [ ] Nightly + week cron routes (tag, embed, rank, summarise, hot).
- [ ] `[R9]` feed, `[R9c]` themes + theme detail, `[R9b]` saved, search.
- [ ] `[R10]` Ask: streaming route, quota, citations → deep links, suggested actions.
- **Done when:** with seeded data the feed shows ranked cards; Ask never cites a message the asker can't open (§15.2 leak test).

### Phase 7 — Share, invites, growth + edge cases (2–3 days)
- [ ] `[C4]` share card (react-native-view-shot, 1080×1080 / 1080×1920), identity toggle, X / LinkedIn / IG Story / copy link; `/a/[id]` web page.
- [ ] `[C5]` invites: code, share, contacts list (optional; default off — share sheet only), credits on join, `/i/[code]` landing.
- [ ] Group splitting + cohorts applied end-to-end.
- [ ] `revenue-recheck` monthly, band up celebration, band down after 2 months, disconnect grace + paused state.
- [ ] Lapsed subscription → paywall, Jaryd DM still available.
- [ ] Offline / sending / failed-retry states; empty group "Be the first to answer".

### Phase 8 — Launch readiness (2 days)
- [ ] Review account + seeded review groups (§11.4).
- [ ] Legal pages, App Privacy labels, permission strings, App Store metadata + screenshots (htg.chat).
- [ ] PostHog events for the funnel: onboarding steps, verification result, paywall view/purchase, answer posted (voice/text/media), unlock, peek, eavesdrop, ask, invite.
- [ ] Full §15 checklist on a TestFlight build.

---

## 15. Testing + verification

### 15.1 Tooling
- `npm run typecheck` on every change.
- `scripts/seed-htg.mjs`: creates bands × groups, ~60 fake founders (fake emails), 14 days of questions/answers/threads/reactions, a review account, peek/eavesdrop targets. Idempotent.
- `scripts/verify-access.mjs`: signs in as fixture users and asserts the access matrix through the real API (RLS), not by calling SQL helpers directly.
- `scripts/verify-realtime.mjs`: keep and update (locked days must not stream).

### 15.2 Must-pass checks
- **Unlock:** unanswered today → 0 rows of today's messages via REST and Realtime; answered → rows; late answer unlocks only that day.
- **Peek matrix:** plan × answered-today × bands above × credits, including idempotent re-peek same day and Monday reset in user timezone.
- **TLDR leak test:** Ask and feed for a Member never return message IDs outside `tldr_scope`.
- **DM rules:** can't open a DM with a non-shared-group user (except Jaryd or an existing thread); blocked pairs can't message.
- **Exact MRR:** never present in any response for another user unless they opted in.
- **Apple:** report every content type; block hides content + stops DMs + stops pushes; delete account from Settings, paywall and onboarding removes auth user + storage; Terms acceptance required; AI consent stored before any AI job reads the user's content (jobs skip users without `ai_consent_at`).
- **Billing:** sandbox purchase of each tier, upgrade, downgrade, restore, expiry → paywall.

---

## 16. Risks + open questions

- **Live transcription quality** on-device varies; fallback is server Whisper (`web/lib/coach.ts` already has it) but that is third-party AI processing of voice → covered by AI consent; not live. Decide after a device test in Phase 3.
- **Group timezone (D7)** means members far from the group's timezone get the question at odd local hours; push still lands at 08:00 local. Revisit if groups become very international.
- **Cold start:** strict bands + small user base means tiny groups; question bank + "Be the first to answer" state carry it. Seed data is for testing only and must not ship to production users other than the review fixtures.
- **AI cost:** nightly tagging + summaries + agent per group; `ai_runs` tracks tokens. Batch tagging and use a smaller Claude model for tagging if costs climb.
- **Stripe restricted key UX:** users must create a key with Subscriptions + Invoices read; inline errors must name the missing permission.
- **Apple review of the hard paywall** with revenue verification: mitigated by the review account; budget one rejection round.
- **Open:** whether "Requests" also applies to DMs from fellow group members (default yes for first contact) — confirm when building Phase 3.

---

## 17. Progress log

Add one line per landed task: date · phase · what landed · follow-ups.

- 2026-11-25 · Plan · Plan written; spec + design copied to `design/htg/`. Decisions D1–D19 recorded.
- 2026-11-25 · Phase 1 · Hey100 work committed on `main` (3f6689a); branch `v2-htg-chat` created. Teardown of Hey100 routes, features, edge functions and web app. Seven baseline migrations (old ones in `supabase/migrations_hey100_archive/`); `npm run db:check` applies them to PGlite and runs 22 access checks; `npm run db:types:local` generates `src/types/supabase.ts` from the same local schema until the remote is pushed. `delete-account` edge function. App shell: htg.chat name + permission strings, dark-only theme with functional colour tokens (`htg`, `shift`), HackerNoon wordmark, splash [O1] + sign-in drawer [O1b] (Apple, Google, email), `me()`-driven gates (welcome → onboarding → paywall → tabs), Chats/TLDR tabs with empty states, `···` account menu (Log out / Delete account) on gate screens and Chats. Follow-ups: remote reset + `db push` + `db:types` (needs go-ahead); "I have an invite code" link lands with redemption in Phase 2; push permission prompt moved to the [N] step; splash image and app icon still Hey100 (Phase 8). To reach Chats before Phase 2, set `onboarded_at` and `plan` on the profile by SQL.
