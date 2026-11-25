# htg.chat — v3 Product + Design Spec

Companion to the design file `htg.chat v3.dc.html` (and the bundled export `export/web/htg.chat v3.html`). Every screen referenced here exists in that file; screen IDs in brackets (e.g. `[R5]`) match the `data-screen-label` on each phone frame.

htg.chat is a simplified, community-first spin-off of Hey100. It reuses the Hey100 codebase, design system, fonts and component library, but replaces swipe/match with **revenue-banded group chats built around one daily question**.

> **htg = "how they grow".** See what founders earning more than you are talking about.

---

## 1. Concept in one paragraph

Founders verify their revenue (Stripe or RevenueCat; GitHub for pre-revenue) and are placed into a group chat with founders at the **same revenue band and category** (e.g. "$5–10k · Mobile"). Every day each group gets **one question** (different per group). Members must **post an answer to unlock** everyone else's answers — no lurking. The group chat is a continuous, scroll-back chat with threads, reactions, images and voice-to-text. Groups **above** you are visible but locked; paid plans let you **Peek** (read-only) into higher groups, and the top plan lets you **Eavesdrop** (follow a higher group, get alerts, pull its insights into your TLDR). A built-in AI tab, **TLDR**, summarises community wisdom across groups and lets you ask questions against it.

---

## 2. Core rules (non-negotiable logic)

1. **Placement by verified revenue.** MRR from Stripe/RevenueCat (last 30 days) maps to a band. Pre-revenue requires a verified GitHub account with commits.
2. **Bands:** `Pre-revenue` · `$0–1k` · `$1–5k` · `$5–10k` · `$10–25k` · `$25–50k` · `$50k+` (monthly).
3. **Cohorts = band × category.** Categories: SaaS, Mobile app, AI, Dev tools, E-com (extendable). Large bands split into numbered cohorts ("Cohort 3") to keep groups ~40–80 members.
   - A user has one **primary category** (from onboarding) and can **also join groups of the same revenue band in other categories** (e.g. a $5–10k Mobile founder can join $5–10k SaaS). Each joined group is a full membership: its own daily question, answer-to-unlock, posting and DMs.
   - Primary category can be changed **twice per calendar month** (counter shown in Profile). Changing it moves the user's primary group; other same-band memberships are kept.
4. **One daily question per group**, different for each group. The question day runs **12:00am–11:59pm in the user's local timezone**; the new question unlocks at 12am local and the "question drop" push goes out at 8am local.
5. **Answer to unlock — per day.** Each day's answers are unlocked only by answering **that day's** question. Today is blurred until you answer today. A past day you didn't answer stays blurred, but its question card shows **Answer to unlock** — you can answer any past question late (marked "answered late" with the date) and that day then unlocks. Days you did answer are always readable.
6. **Peeking is read-only and up-only.** You can only peek into bands **above** yours, in **any category**. You can never post, react or DM inside a peeked group.
7. **Peek requires contribution.** A user can peek only if they have answered in their own group today.
8. **Members see bands, not numbers.** Exact MRR is hidden unless the user toggles "Show exact MRR on profile".
9. **DMs only with people who share a group with you** (any of your joined groups), plus Jaryd's official account. People in higher groups can be read but not messaged.
10. **Questions are crowd-sourced.** Members submit questions to a queue; members upvote; the top question becomes tomorrow's daily question.
11. **Only your own answers can be shared externally** (share card). Other members' answers never leave the app.

---

## 3. Plans + entitlements

Hard paywall after placement. No free tier inside the group chat.

| | **Member** $5/mo | **Pro** $18/mo | **Ultimate** $39/mo |
|---|---|---|---|
| Your group chat, daily question, threads, DMs | ✓ | ✓ | ✓ |
| Peek into higher groups | Invite credits only | Groups up to **2 revenue bands above**, any category, **3 peeks / week** (+ invite credits), today's answers only | **Any group above**, any category, unlimited, **full chat history** |
| Eavesdrop | — | — | ✓ |
| TLDR "Ask anything" | 5 asks / month | Unlimited | Unlimited |
| TLDR insights from eavesdropped groups | — | — | ✓ |

- Default selection on paywall: **Pro**.
- Plan rows at the top; benefits list (octagon-check ticks) below updates to the selected plan; white **Continue** CTA; Terms · Privacy · Restore links (App Store compliance).
- A "peek" = opening one higher group for one day. Re-opening the same group the same day doesn't consume another peek.
- Weekly peeks reset Monday 12am local. Unused weekly peeks don't roll over.
- **Invite peek credits:** each invite that results in a new member joining (any band) grants the inviter **3 free peek credits** per friend who joins (the friend can land in any band or category, not just the inviter's group). Credits never expire, are used after the weekly allowance, and work on any plan — including Member — but follow Pro's range (up to 2 bands above, today only). Shown as "2 of 3 this week + 6 invite credits".
- Eavesdropping is **Ultimate only**.
- TLDR asks on Member: **5 per calendar month**, resetting on the 1st.

---

## 4. Design system

Reuse the Hey100 design system in this project (`readme.md`, `styles.css`, `tokens/`, `components/`). Key rules for htg.chat:

- **Fonts:** JetBrains Mono 500 (titles, numbers, labels, question text), Inter (body, buttons), HackerNoon (wordmark only).
- **Wordmark:** `HTG` in HackerNoon white + `.CHAT` in a **#00FF00** sticker chip (2px #111 outline, hard drop) with a small left-pointing tail so it reads as a chat bubble.
- **Colour meaning (important — this is functional):**
  - **Yellow #FFFF00** = *your* group and today's question (group header, question card, unread counts, active tab pill, thread links).
  - **Black #000 with white stroke** = groups **above** you (locked / peek).
  - **Pink #FF1C6F** = **Eavesdropping** (badge, sheet, eavesdropped insights).
  - **#00FF00 / #0020A1** = verified states, selected plan, "Get unlimited peeks", selected category chip.
  - **Your own messages:** white bubble, black text (never yellow — yellow is reserved for the question).
  - **Others' messages:** #232825 bubble, light text.
- **Onboarding** uses the Hey100 "shift" palette: each step a full-bleed colour (yellow, blue, cyan, magenta, violet, dark).
- **App chrome:** dark (#0E100F bg, #171A18 surface, #232825 raised, #E8ECE7 ink, #8E968F muted).
- **Stickers:** white/colour cards, 2px #111 outline, hard 4–6px drop, slight tilt — used on splash and share cards.
- **Pixel glyphs** from `assets/glyphs/` (message, eye, search, sparkles, cog, etc.); pixel heart from `assets/icons/`.

---

## 5. Navigation

- **Bottom tab bar (2 tabs):** **Chats** · **TLDR**. (No Profile tab.)
- **Chats header:** wordmark top-left; **user avatar top-right** → opens own Profile.
- Group chat and DM screens push on top of Chats with a **‹ back** arrow.
- Settings is reached from Profile (cog, top-right).

---

## 6. User stories

**Onboarding**
- As a new founder, I understand in one screen what htg.chat is (answer daily, peek up) before signing in.
- As a founder, I set up my personal profile and product before verifying revenue, so the last step drops me straight into my group.
- As a founder, I verify revenue read-only and see only my band shown publicly unless I opt in.
- As a pre-revenue builder, I can still join via GitHub commits.
- As a user, I'm asked for push permission with clear reasons (question drop, replies, groups above).
- As a user, I see the group I've been placed in, its combined MRR, today's question and a teaser of locked replies, which pushes me to subscribe.

**Group chat**
- As a member, I can't read today's answers until I answer.
- As a member, I can answer by typing or by voice (live transcription) and attach images.
- As a member, I can react to, reply in a thread to, quote, bookmark, share (own only), DM the author of, or report any message.
- As a member, I can scroll back through previous days' questions and answers in one continuous chat, with a **NEW** divider at my last-read point and a "N new ↓" jump button.
- As a member, I can propose a question for tomorrow and upvote others'.
- As a member, I see how many people from lower groups **peeked** into our chat today.
- As a member, I can open group info to see combined MRR, members, invite, mute, leave or report the group.

**Peek + eavesdrop**
- As a paid user, I see the ladder of groups above me (my category first, other categories after) and can peek into one.
- As a Pro user, I see how many peeks I have left and a path to unlimited.
- As an Ultimate user, I can eavesdrop on a higher group to follow it closely.

**TLDR**
- As a member, I get a themed feed of insights across groups, ranked by the combined MRR of people who answered/replied.
- As a member, I can filter by All time / Week / Theme / Top Q / Top A / Saved.
- As a member, I can ask questions against the community's answers (limited on Member).
- As a member, my bookmarked Q+A pairs appear under Saved.

**People**
- As a member, I can view any group member's profile (product, band, bio, links, their answers and questions asked).
- As a member, I have a pinned 1:1 chat with Jaryd (founder), with a welcome message waiting.
- As a member, I can DM members of my group privately, invite founders, report/block users.

---

## 7. Screen-by-screen spec

### 7.1 Onboarding (row 1 in the design file)

Progress bar: 8 segments, thin 4px, ink fill. Order: **How it works (1) → Who are you (2) → What are you building (3) → Connect revenue (4) → Paste key (5) → Verified (6) → Notifications (7) → You're in (8)**. Then paywall.

**[O1] Splash** — dark
- Floating stickers (decorative, non-interactive):
  - Yellow question card "$5–10K · TODAY — When did you hire your first person?"
  - Grey answer card from Dan ($14.2k) with 🔥 44 · 💬 12 counts (styled like real chat bubbles).
  - Black/white-stroke **locked group** card "$25–50k · Mobile · 41 answers today" with lock icon and a **Peek** pill.
- Wordmark.
- Two value lines, each with an icon tile:
  - 💬 message glyph: "Answer one question a day with founders in your category, at your size"
  - 👁 eye glyph: "Peek into other group chats, seeing what founders earning more than you are talking about"
- Primary CTA **Continue** → opens sign-in drawer [O1b].
- "I have an invite code" text link.

**[O1b] Sign-in drawer** — white bottom sheet over splash
- Continue with Apple (black), Google, Email; "I have an invite code"; Terms/Privacy line.
- Scrim tap or drag down dismisses.

**[O2] How it works** — yellow
- Three numbered rule cards:
  1. **Verify revenue.** You only talk to founders at your level, in your category.
  2. **Answer to unlock.** One question a day. Post your answer to read everyone else's. No lurking
  3. **Peek up.** Read what groups earning more than you are saying.
- Continue.

**[O6] Who are you?** — dark
- Avatar picker (photo, "+" badge), Name.
- Bio (multiline, 160 char limit).
- Socials as chips: Instagram, X, TikTok, Substack, LinkedIn. Filled = green #00FF00/#0020A1 chip with handle; empty = white "+ TikTok" chip → opens handle input.
- Continue (enabled when name + photo present).

**[O7/R1] What are you building?** — dark
- Same layout as Who are you: **product icon** picker (rounded square) + Product name.
- One-liner, Link (URL), Category chips (single select; drives cohort).
- Continue.

**[O3] Verify your revenue** — blue
- Two primary options (white sticker rows): **Stripe** (web/SaaS), **RevenueCat** (iOS/Android).
- Divider "NO REVENUE YET?" → **GitHub** row (join Pre-revenue via verified commits; OAuth).
- Chips: "Is this safe?" and "Why revenue?" → bottom-sheet explainers.

**[O4] Paste key** — cyan
- Provider header; field for restricted key with **Paste** button.
- "Where do I get this?" card (Stripe → Developers → API keys → Create restricted key; read Subscriptions + Invoices).
- Safety line with octagon check: read-only, can't charge/refund/see cards, disconnect anytime.
- **Verify revenue** CTA → loading → [O5]. On failure: inline error under field, keep key.
- RevenueCat variant: secret API key (v2) + project selection. GitHub: OAuth, no key.

**[O5] Verified** — magenta
- White ticket card: "✓ VERIFIED · STRIPE", exact MRR (only visible to user), "MRR · last 30 days · N subscriptions", **Your band** chip.
- Toggle card: **Show exact MRR on profile** (default OFF; off = members see band only).
- CTA continues.

**[N] Notifications** — violet #7B00FF
- Title "Know when your question drops."
- Three reason cards (white): New question (8am), Replies, Above you.
- Mock iOS permission dialog.
- **Turn on notifications** (triggers OS prompt) / Not now.

**[R2] You're in** — yellow
- "You're in **$5–10k** Mobile." with member avatar stack + count.
- Combined group MRR card (dark): total, founders, avg MRR, growth this month, VERIFIED badge.
- **Groups above you** strip (black cards, locked) — the ladder teaser.
- Today's question card (white).
- **Blurred replies** below the question with pill "24 answers · 61 replies".
- CTA **See their answers** → Paywall.

**[PW] Paywall** — black (hard paywall, no close)
- Headline "48 founders answered today. **See what they said.**" (second sentence #00FF00), avatar stack + group line.
- Plan rows (tap to select): Member $5 · Pro $18 (default) · Ultimate $39. Selected = #00FF00 bg / #0020A1 text with check; unselected = #3C3C3B / white.
- Benefits list (octagon check icons) **changes with selected plan** (see §3).
- **Continue** (white) → StoreKit purchase → lands in group chat (locked state).
- Terms · Privacy · Restore.

### 7.2 Your group chat (row 2)

Shared layout: **yellow top band** with ‹ back, group name ("$5–10k · Mobile"), subline "48 founders · $342k MRR", and a **👁 N peeks** chip (how many lower-band users peeked today; tap → group info). Below it, the **pinned question card** (black, yellow "TODAY · TUE 24 NOV" label). Below that a dark rounded **room** with messages.

**Message row anatomy:** avatar · **Name** · "building {App}" · **$band/MRR** (lime mono). The entire avatar+name row is tappable → member profile. Bubble below. Reactions and "N replies ›" thread link under bubble.

**Composer (all group chat states):** `[+]` circle (opens media drawer) · pill input with **🎙 mic inside the input** on the right. No standalone camera button. Left of the composer in the unlocked chat: yellow **💡 lightbulb** button → Ask/question queue [R7].

**[G1] Locked** (hasn't answered today)
- Room content blurred; centred pill "23 answers · yours unlocks them".
- Composer is the answer field: "Answer today's question…" with yellow outline.

**[G2] Answering**
- Composer expands into a bottom answer panel: "YOUR ANSWER" label, live transcription text with cursor, "● TRANSCRIBING · 0:14" indicator, attached image thumbnails (removable ✕) + add tile, waveform bar with stop button, **Post** button.
- Post → answer appears in chat, room unblurs with a short reveal animation.

**[R5] Group chat (unlocked)**
- Continuous chat, newest at bottom.
- **NEW** divider line at last-read position.
- Each day starts with a **question divider card** for that day's question.
- Inline **ladder carousel** card (product marketing): "Groups above answered today" with horizontally scrolling black cards ($10–25k, $25–50k, $50k+) each with question + answer count + **Peek**.
- Below today's question: affordance to **Ask the group tomorrow** (opens [R7]).

**[G4b] + Media drawer**
- Dark bottom sheet: Camera · Photos · File · Link tiles; "Recent" 3-col photo grid with multi-select counters; **Add N photo(s)** CTA.

**[R6] Scrolled back**
- Shows previous day ("MON 23 NOV") question divider and its answers.
- Floating **"6 new ↓"** pill (dark grey #3C3C3B, white text) jumps to NEW divider.

**[G5] Long-press a message**
- Scrim; selected message highlighted (yellow outline).
- Reaction bar: 🔥 💯 👀 🙏 😂 (+ more).
- Action menu: **Reply in thread · Quote in chat · Bookmark 🔖 · Share as card · Message {name} privately · Copy · Report** (red).
- "Share as card" only appears on the user's own messages.

**[G6] Thread view**
- Header "Thread · $5–10k · Mobile".
- Parent message with reactions, "N REPLIES" divider, replies (others grey, mine white).
- Composer "Reply in thread…" with checkbox **Also send to group**.

**[R7] Ask / question queue**
- Tomorrow's candidates list with upvote counts, sorted by votes; user's own submission tagged.
- "Ask your group" input; one submission per user per day.
- Top question at cutoff (e.g. midnight local of group) becomes tomorrow's daily question; author gets credit ("Asked by …").

**[G8] Group info** (bottom sheet)
- Title, 👁 peeks today.
- **Combined group MRR** card (total, founders, avg MRR, % this month, VERIFIED).
- **6 member preview rows:** avatar · name · product · band/MRR · › (tap → profile). "All 48 members ›" link.
- Actions grid: **Invite · Mute · Leave group** (red) · **Report group** (red).
- Leave → confirm sheet; leaving removes access until rejoin (placement unchanged).

### 7.3 Chats home, peek + eavesdrop (row 3)

**[R3] Chats**
- Header: wordmark (left) · own avatar (right → Profile).
- Filter chips: **All · Groups · Private · Requests** (counts on Private/Requests).
- **All** list order:
  1. **Jaryd** (pinned) — avatar with verified badge, "founder, htg.chat", last message, unread dot.
  2. **Your group** — Apple-Messages-style **bubble cluster** of member avatars in a dark circle with yellow ring and member-count dot; last message preview; yellow unread count. Highlighted row (yellow outline).
  3. **Private DMs** (e.g. Tom · Quicker.chat) with unread count.
  4. **HTG Ladder** (bordered box, "Mobile · suggested") — groups above you in your category. Icon = plain **lock** in black circle with white stroke. Row shows today's question + **Peek** pill. Eavesdropped groups show pink EAVESDROPPING badge and pink unread dot. Groups beyond plan show "ULTIMATE".
  5. **Other categories** — higher groups in other categories (still peekable) with "See all ›".
- Tap a locked ladder group → [P1].

**[P1] Peek locked** — black top band
- Group header + "THEIR QUESTION TODAY" card (dark).
- Blurred room with "38 answers today" pill.
- CTA **👁 Peek on this group** (white).
- Line "Pro · 2 of 3 peeks left this week · read-only".
- Non-Ultimate: green link **Get unlimited peeks ›** → Paywall (Ultimate preselected).
- Not answered in own group today → CTA replaced with "Answer in your group first" → deep link to own group [G1].
- Member plan → CTA opens Paywall.

**[P2] Peeking (read-only)**
- Header chip **👁 PEEKING**.
- Full messages visible (today only on Pro; full history on Ultimate).
- No composer. Bottom bar: "👁 Read-only" + pink **Eavesdrop on them** button.
- Long-press: only Copy and Bookmark available.
- Peek increments that group's "peeks today" counter (anonymous).

**[P3] Eavesdrop sheet** — pink bottom sheet
- ULTIMATE tag, "Eavesdrop on $10–25k."
- Benefits: Follow their chat with full history · Their insights in your TLDR · Ask questions against their answers · Alerts when they answer.
- Note: "Still read-only. They see a peek count, never who."
- **Start eavesdropping** (non-Ultimate → Paywall) / Not now.

**[R11] Eavesdropping**
- Group shows pink ✓ EAVESDROPPING chip; pink accents; alert toggle; group appears in Chats with pink badge; insights flow into TLDR.
- Stop eavesdropping from group info.

### 7.4 People + DMs (row 4)

**[R8] Member profile**
- Avatar, name, verified band badge, product icon + name + one-liner, link, socials, bio.
- **Tabs: Answers (N) · Questions asked (N).** Answers list shows question + their answer, tap → message in context (if user has access).
- Actions: **Message** (only if same group), ··· → Block / Report.

**[J1] Jaryd DM** (default for every user)
- Verified official account, always pinned, can't be deleted (can be muted).
- Banner: "Official account. A direct line to the founder, always pinned."
- Pre-seeded welcome messages (copy editable server-side):
  1. "Hey, I'm Jaryd. Welcome to htg.chat 👋"
  2. "I built this because I've shipped 3 apps and made $0. The fastest way to grow is hearing what founders a step ahead are doing."
  3. "Two tips: answer every day (it unlocks the room), and ask your group the question you're stuck on."
  4. "What are you building right now? Reply here, I read every one."
- Replies go to a founder inbox (admin tool).

**[ME] Your profile** (from avatar in Chats header; back arrow, no tab bar)
- Avatar with edit badge, name, band badge "$5–10k · STRIPE ✓", **Preview** (view as others see it), ⚙ cog → Settings.
- Editable grouped rows: **Product** (icon + name, one-liner, category), **About** (bio, socials, revenue connection / reconnect), **Activity** (answers count, questions asked/picked).
- Changing primary category triggers a re-placement confirmation (moves cohort) and shows "1 of 2 changes left this month". There is no cap on joining extra same-band category groups.
- **Your groups** section: list of joined groups (primary + same-band other categories) with Leave, plus **Join another category** → picker of same-band groups.

**[SET] Settings**
- **Plan:** current plan + upgrade link; peeks left this week.
- **Notifications:** Daily question (8am), Replies + reactions, Groups you eavesdrop on.
- **Privacy:** Show exact MRR, Connected revenue (reconnect/disconnect), Blocked users.
- **Support:** Message Jaryd, Terms · Privacy, Restore purchases.
- Log out; Delete account (red, confirm).

**[C8] DM thread**
- Header: avatar, name, product · band.
- If started from an answer, first message shows a **quoted answer** block.
- Bubbles (mine white), images, reactions.
- Composer: + · input with mic inside.

**[C4] Share answer** (own answers only)
- Bottom sheet with a preview **share card**: yellow card, "$5–10K FOUNDERS WERE ASKED", question, white quote of the answer, author + product, wordmark.
- Toggle "Show my name and product".
- Targets: X, LinkedIn, Instagram Story, Copy link. Renders the card as an image (1080×1080 / 1080×1920 for Story).

**[C5] Invite**
- Personal invite code card (e.g. HTG-JRYD-7Q) with Share link / Copy.
- "3 of 5 invites left", list of contacts with Invite / Joined state.
- Invitees are placed by their own revenue. Every invite that converts to a joined member grants the inviter free peek credits (see §3); the card shows credits earned ("+3 peeks per friend who joins").

**[C9] Report + block** (white sheet)
- Reasons: Spam or self-promotion · Revenue looks fake · Harassment or hate · Sharing others' answers outside · Something else.
- Toggle "Also block {name}" (hides their answers + DMs; they're not notified).
- **Send report** (red). Same pattern for Report group (from group info) and Report message.

### 7.5 TLDR (row 5)

**[R9] TLDR feed**
- Header "TLDR" + search.
- Tag row (wraps): **All time · Week · Theme · Top Q · Top A · 🔖 Saved**.
- Ranking note: "Ranked by combined MRR of everyone who answered or replied."
- Cards:
  - **Top question** (black card, from a higher group): band label, combined MRR of participants, question, avatars, "38 answers · 112 replies", **Peek** pill → peek flow.
  - **Top answer** (pink border if from eavesdropped group): author row, answer quote, "$X in replies".
  - **Your group insight** (yellow card): AI summary of your group's answers.
- Bottom ask bar: plan usage line "Member · 3 of 5 asks left · Unlimited with Pro ›", input "Ask anything…" with sparkles icon.

**[R9c] Theme**
- Theme carousel (horizontal) of coloured theme cards: Pricing (🔥 HOT), Hiring, Channels… each with a one-line insight + answer/group counts.
- List of themes below with sub-topics and counts → tap opens theme detail (filtered feed).

**[R9b] Saved**
- Bookmarked **question + answer** pairs: group band chip (colour = yours/above/eavesdropped), question, answer with author row. Tap → message in context (subject to access).

**[R10] Ask (AI)**
- Chat with the AI over the community corpus; shows "N of 5 left" on Member.
- Answers cite sources (group + member) and suggest actions ("Ask my group this", "Peek $10–25k").
- Scope: user's own group + groups they've peeked (today) + eavesdropped groups (Ultimate). Never exposes content the user can't otherwise access.

---

## 7.6 TLDR — how it works

**Purpose:** turn thousands of answers across groups into a short, ranked read, and push users to peek upward.

**Corpus a user's TLDR can draw from (permission-scoped):**
- Every group they're a member of — only days they've answered (same rule as reading the chat).
- Groups above them **at aggregate level** (theme summaries, top questions, top answer *excerpts*). Excerpts are teasers; opening the full thread runs the normal peek check.
- Eavesdropped groups (Ultimate): full content.
- Never: DMs, other users' bookmarks, groups below them.

**Pipeline (batch, nightly at ~1am UTC + on-demand refresh for "Week"):**
1. **Collect** answers + thread replies per group per day.
2. **Theme tagging:** LLM classifies each answer into 1–3 themes from a fixed taxonomy (Pricing, Hiring, Channels, Retention, Fundraising, Tooling, Product, Ops, Burnout…), plus free-form sub-topics.
3. **Rank score** for questions and answers = Σ verified MRR (band midpoint, or exact if shared) of every *distinct* user who answered or replied, × recency decay (7-day half-life for Week; none for All time). Reactions add a small bonus. This is the "Ranked by combined MRR of everyone who answered or replied" line.
4. **Summarise:** per group per theme, an LLM writes a 1–2 sentence insight citing message IDs ("Most raised prices once past $5k. None lost more than 5% of users.").
5. **Hot:** a theme is HOT when its week-over-week answer count grows >50% across ≥2 groups.

**Tabs:**
- **All time / Week** — feed of cards: Top question (from a higher group → Peek), Top answer, Your group insight, eavesdropped group insights (pink). Mixed and ordered by rank score; at least one "above you" card in the first three to drive peeking.
- **Theme** — horizontal carousel of top themes (colour from shift palette, HOT badge) + full theme list. Tapping a theme opens that theme's filtered feed.
- **Top Q / Top A** — ranked lists only.
- **🔖 Saved** — bookmarks (below).

**Card actions:** Peek (runs peek check / paywall), Open in chat (if accessible), Bookmark, Ask about this (pre-fills Ask).

**Ask anything (RAG chat):**
- Retrieval over the permission-scoped corpus above (embeddings on answers + replies + insights). Above-you groups contribute only aggregate insights unless the user has access.
- Answers must cite sources as chips (group band + member name) that deep-link to the message.
- Suggested follow-ups: "Ask my group this" (pre-fills question queue), "Peek $10–25k".
- **Limits:** Member 5 asks per calendar month (counter in ask bar; at 0 → paywall); Pro/Ultimate unlimited. A follow-up in the same conversation counts as an ask.
- Conversation history kept per user; not visible to anyone else.

## 7.7 Bookmarks — how they work

- **Create:** long-press any message (own group, peeked group, eavesdropped group, thread reply) → **Bookmark**. Toggle; a small 🔖 shows on bookmarked bubbles. Toast "Saved to TLDR".
- **Stored as a Q+A pair:** the bookmark snapshots the message's daily question, so Saved always shows *question → answer* together, with group band chip (yellow = your group, black = above, pink = eavesdropped) and author row.
- **Thread replies:** saved with their parent answer shown as context.
- **Access:** if you bookmarked something from a peek, the saved text stays readable in Saved forever (it's your snapshot), but **Open in chat** re-runs the peek check.
- **Remove:** swipe left in Saved, or long-press → Remove bookmark.
- **Privacy:** bookmarks are private; authors aren't notified. Aggregate bookmark counts may boost rank score.
- **Deleted source:** if the author deletes the message, the bookmark shows "Answer removed by author".
- **Search:** TLDR search includes Saved.

## 8. States + edge cases

- **Haven't answered today:** own group locked [G1]; peek CTA disabled; TLDR shows yesterday and earlier.
- **Answered:** full access to today; answer editable for 15 min, deletable anytime (deleting does not re-lock).
- **Missed days:** a past day's answers are visible only if the user answered that day. Otherwise the day's divider shows the question with **Answer to unlock**; answering late unlocks it and the answer is posted into that day's section with an "answered late · 26 Nov" tag (it doesn't jump to the bottom of the chat). Late answers notify nobody.
- **Revenue changes:** re-check monthly. Moving up a band → celebration + move to new group (keep DMs); moving down → move after 2 consecutive months below.
- **Disconnected revenue:** grace period 7 days then group access paused.
- **Blocked user:** their messages are collapsed ("Blocked user · show"), can't DM.
- **Subscription lapsed:** returns to paywall; DMs with Jaryd remain.
- **Empty group (new cohort):** show question + "Be the first to answer" state.
- **Offline / sending:** messages show sending → sent; failed = retry.
- **Voice:** on-device or server transcription; user can edit text before Post; audio isn't stored (text only).

---

## 9. Notifications

- 8:00 local: "Today's question in $5–10k: …"
- Reply / reaction to your answer.
- Mention / DM.
- Question you asked was picked for tomorrow.
- Eavesdropped group answered (Ultimate).
- Weekly: "Your group was peeked N times" / TLDR digest.

---

## 10. Data model (suggested)

```
User { id, name, photoUrl, bio, socials{instagram,x,tiktok,substack,linkedin}, showExactMrr, plan(member|pro|ultimate), primaryCategory, categoryChangesThisMonth, peeksUsedThisWeek, peekCredits, tldrAsksThisMonth, timezone, createdAt }
Product { id, userId, name, iconUrl, oneLiner, url, category }
RevenueConnection { userId, provider(stripe|revenuecat|github), mrrCents, subscriptions, commits30d, verifiedAt, status }
Band { id, label, minCents, maxCents }
Group { id, bandId, category, cohort, memberCount, combinedMrrCents, peeksToday }
Membership { userId, groupId, isPrimary, joinedAt, lastReadMessageId, muted }
DailyQuestion { id, groupId, date, text, sourceQuestionId?, askedByUserId? }
QueuedQuestion { id, groupId, userId, text, votes, forDate, status }
Message { id, groupId|dmId, userId, dailyQuestionId?, isAnswer, answeredLate, text, images[], parentId?(thread), quotedMessageId?, createdAt, editedAt }
Reaction { messageId, userId, emoji }
Bookmark { id, userId, messageId, questionId?, groupId, createdAt }   // questionId snapshot so Q+A pair renders together
Peek { userId, groupId, date }
Eavesdrop { userId, groupId, alerts, createdAt }
DM { id, userA, userB, isOfficial }
Report { reporterId, targetType(user|message|group), targetId, reason, note }
Block { userId, blockedUserId }
Invite { code, userId, usesLeft }
InviteRedemption { code, inviterId, inviteeId, joinedAt, creditsGranted }
TldrInsight { id, kind(top_question|top_answer|group_insight|theme), groupIds[], theme?, text, rankScore, sourceMessageIds[], periodStart, periodEnd }
Theme { id, slug, label, answerCount, groupCount, hot, periodStart, periodEnd }
TldrAsk { id, userId, question, answer, citedMessageIds[], createdAt }
```

**Access check (pseudo):**
```
isMember(user, group)      = Membership exists
canReadDay(user, group, d) =
  isMember(user, group) ? hasAnswered(user, group, d)
  : bandAbove(group, user) && hasAnsweredAnyGroup(user, today) && (
      user.plan == 'ultimate'
      || (d == today && bandsAbove(group, user) <= 2 && (peekedToday(user, group) || hasPeekAllowance(user))))
hasPeekAllowance(user)     = (user.plan == 'pro' && user.peeksUsedThisWeek < 3) || user.peekCredits > 0
canPost(user, group)       = isMember(user, group)
canAnswerLate(user, group, d) = isMember(user, group) && d < today && !hasAnswered(user, group, d)
canDM(user, other)         = sharesAnyGroup(user, other) || other.isOfficial
canEavesdrop(user, group)  = user.plan == 'ultimate' && bandAbove(group, user)
```

---

## 11. Reuse from Hey100 codebase

- Theme tokens, fonts, `Btn`, `Chip`, `Field`, `OptionRow`, `Sheet`, `Toast`, `Segmented`, `Glass`, `AppIcon`, `Avatar` — reuse directly.
- Integrations flows (Stripe, RevenueCat, GitHub) — reuse the Hey100 integration wizard logic; UI restyled per [O3]/[O4]/[O5].
- Paywall (RevenueCat entitlements: `member`, `pro`, `ultimate`).
- Chat thread component from Hey100 Chat (extend with threads, quotes, reactions, bookmarks, voice).
- New: group chat w/ daily question dividers + NEW line, question queue, peek/eavesdrop gating, TLDR (LLM summarisation + RAG over permitted messages), share card renderer, bubble-cluster group avatar.

---

## 12. Decisions (resolved)

1. **History:** a past day is readable only if you answered that day; you can always answer a past question late to unlock it.
2. **Pro peek range:** up to 2 revenue bands above, any category.
3. **Invites:** 3 free peek credits per friend who joins, regardless of which group they land in.
4. **Question day:** local timezone, rolls over at 12am.
5. **Member TLDR asks:** 5 per month.
6. **Eavesdrop:** Ultimate only.
7. **Category:** primary category can change twice a month; users can also join same-band groups in other categories.
8. **Answer edit window:** 15 minutes.

9. **Extra categories:** no limit on how many same-band category groups a user joins, as long as they're in that revenue band.
