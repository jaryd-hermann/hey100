# Hey100 — Product Spec

Oct 15, 2026 · @Jaryd

## Summary

Hey100 (hey100.com) is a Hinge-style iOS app, with shareable web profiles, for any product (iOS, Android, web, SaaS, extensions, AI tools), where indie builders swap early adoption: each side must like the other's app before a chat opens, so every match is two people who agreed to try each other's product and give feedback.

**Problem.** Building got cheap; distribution didn't. Most indie apps die with zero to a few dozen users, and the usual channels (launch sites, Reddit, X, Discord) produce a one-day spike of passive upvotes, not committed testers who report back.

**The bet.** A mutual-match mechanic turns "please try my app" (a favor with no return) into a fair trade (I try yours, you try mine). Verified traction badges (GitHub, Stripe, RevenueCat) make profiles credible, and structured prompts make apps easy to judge in seconds.

**Promise to the user:** Hey100: find early users. Your first 100 real users, one honest match at a time.

## Problem and users

The core user is a solo or tiny-team builder with a working product and fewer than \~100 active users, who needs feedback more than reach.

| Persona | Situation | What they want from First100 |
| --- | --- | --- |
| Fresh launcher | Shipped in the last 0–3 months, 0–50 users, no audience | 10–20 real people who try it this week and say what's broken |
| Stuck at plateau | 50–500 users, some revenue, unclear why churn is high | Feedback from builders in their category; credibility via verified MRR |
| Serial shipper | Ships a new app every few weeks (vibe-coders, weekend builders) | Fast repeatable testing pool for each new listing |
| Tester-at-heart | Builder who enjoys trying new tools; may have no app live yet | Early access, discovery, karma that helps their own future launch |

**Jobs to be done**

1. When I ship, find people who match my target user and will actually open the app.
2. Get specific, honest feedback (onboarding, value, pricing) within days.
3. Turn some testers into retained users, reviews, or referrals.
4. Discover interesting products and builders worth knowing.

**Out of scope for v1:** non-builder consumers looking for apps, agencies, B2B enterprise sales leads.

## Competitive landscape and positioning

Test-for-test exchanges already exist and are crowded, but all of them are credit queues; none uses mutual matching, rich profiles, or verified traction, which is where Hey100 differentiates.

| Player | Model | What Hey100 does differently |
| --- | --- | --- |
| [Betaora](https://peerpush.com/p/betaora) | Credit economy: test apps to earn credits, spend credits to boost your own; verification question proves use | Two-sided consent (match) instead of anonymous queue; relationship, not transaction |
| [IndieAppCircle](https://peerpush.com/p/indieappcircle) | Credits plus a paid one-to-one test-for-test contract; 300+ devs, web apps | Native iOS, swipe discovery, profiles with personality |
| [FeedbackQueue.dev](https://trustmrr.com/startup/feedbackqueue) | Web queue: review projects to earn credits for reviews of yours | Chat-first; feedback happens in a conversation |
| [DevSwap](https://groups.google.com/g/devswapgroup/about) | Batches of 15 devs test each other over a 14-day cycle | Pairwise and continuous rather than cohort-based |
| [TesterBuddy](https://www.producthunt.com/p/testerbuddy-beta-feedback-exchange/stop-begging-friends-for-app-tests-i-built-a-community-for-it) / feedapp | Karma for testing and reviews; feedapp adds promo swaps and 1:1 chat | Verified badges and app-store-quality profiles |
| [TrustMRR](https://trustmrr.com) | Leaderboard of revenue verified via Stripe, LemonSqueezy or Polar | Borrow the verification idea as a trust badge, not a leaderboard |
| Product Hunt, BetaList, Reddit, X | Broadcast launches | Targeted, committed, two-way |

**Positioning:** *"Hinge for early adopters."* The others feel like chores (earn credits, clear the queue). Hey100 should feel like meeting interesting builders whose products you actually want to use.

**Moats to build:** match quality (interests and target-user fit), verified-traction trust layer, and a feedback history that becomes a public reputation ("gives great feedback").

**Category risk to name early:** builders testing builders' apps skews toward dev tools and productivity. A consumer app for new moms gets limited value from a pool of developers. Mitigations sit in Matching and Risks.

## Core loop and key flows

The loop is list, like, match, trade, rate; every feature either feeds that loop or makes a trade more likely to complete.

&#91;embedded content: core loop · 8 steps, 1 decision\]

**Onboarding (target under 5 minutes):** sign in with Apple, quick dev profile, paste an App Store or web link to auto-fill the app profile (name, icon, screenshots), answer 3 prompts, pick what you're looking for, then land in the deck.

**Returning sessions:** Likes You first (highest intent), then open trades awaiting your feedback, then the deck.

## Profiles

There are two profile types: one **Dev profile** per person and one or more **App profiles** under it. Discovery shows App profiles, with the builder attached, the way Hinge shows a person with their prompts.

### Dev profile

| Field | Type | Notes |
| --- | --- | --- |
| Name, photo, handle | Required | Real face encouraged; builds trust in chat |
| Role and stack | Tags | e.g. iOS, React Native, Supabase, designer, marketer |
| What I'm building | Short text | One line |
| Devices and platforms I can test on | Multi-select | iPhone, iPad, Mac, Android, web, Apple Watch |
| Interests | Tags | Categories they'd happily try (fitness, finance, AI tools, games) |
| Feedback style | Single-select | Blunt / balanced / gentle; sets expectations |
| Links | Optional | X, LinkedIn, personal site, GitHub |
| Reputation | System | Feedback given, response rate, avg rating from matches |

### App profile (the "dating profile")

| Section | Contents |
| --- | --- |
| Header | Logo, name, one-line tagline, banner image, category, platform, stage (idea / TestFlight / live / revenue) |
| Media | Up to 6 slots: screenshots, a 15–60s demo video, or a GIF |
| Prompts | Pick 3 of \~20 prompts, answered in text, voice, or video |
| Looking for | Ideal tester (role, interest, device), feedback type wanted (onboarding, UI, pricing, bugs, retention), time ask (5 min / 15 min / a week of use) |
| Try it | App Store, TestFlight, or web link; promo code field; test instructions |
| Verified traction | Badges from connected integrations (see Integrations) |
| Changelog | Optional "what's new since you last saw us" to re-engage past matches |

### Prompt library (starter set)

- The problem I couldn't stop thinking about…
- You'll love this app if…
- The feature I'm most proud of…
- The honest thing I need feedback on…
- Our first user said…
- Green flag in a tester:
- I'll know this app works when…
- Don't download this if…
- The weirdest thing I learned building it…
- In 30 seconds, here's how it works: (video prompt)

### Verification badges

- **Shipped**: App Store or Play listing confirmed via store URL lookup
- **Open source / active**: GitHub repo connected, recent commit activity
- **Revenue verified**: Stripe connected, MRR band shown (e.g. $1–100, $100–1k, $1k+), exact figure optional
- **Real users**: RevenueCat connected, active subscribers band
- **Good tester**: earned from completed feedback exchanges and ratings

Show bands, not exact numbers, by default; builders can opt into exact figures.

## Matching and discovery

A chat opens only when builder A likes one of B's apps and B likes one of A's apps; this mutual-app rule is the product's core and should never be bypassed in v1.

### Mechanics

1. **Act as an app.** The user picks which of their app profiles they're "swiping as" (defaults to their primary). Matches are app-to-app, so a builder with 3 apps can have separate match threads per app.
2. **Like a specific thing.** Like Hinge, a like targets a prompt, video, or screenshot, with an optional comment ("Your onboarding video sold me; I'd test the habit streaks"). Comments raise match rates and seed the first message.
3. **Likes You queue.** Incoming likes show the liker's app with their comment. Liking back creates the match.
4. **Daily limit.** \~8 likes per day per app (tunable). Scarcity forces intent and protects inboxes.
5. **Pass is silent.** No notification on pass; passed apps resurface after 30 days if either side updates.

### Ranking signals (v1, rule-based)

| Signal | Why it matters |
| --- | --- |
| Interest overlap (my interests vs their category, and vice versa) | Both sides need to want to try the other's app |
| Target-user fit (their "looking for" vs my role and devices) | Gets them testers who resemble real users |
| Device and platform compatibility | No point matching an iOS-only app with an Android-only tester |
| Stage proximity | Similar stages trade evenly; pre-launch with pre-launch |
| Reputation and response rate | Rewards builders who follow through |
| Freshness | New apps get a launch boost for their first 7 days |

Later: learn from which matches produce completed feedback, not just matches.

### Filters

Category, platform, stage, verified-only, time ask, and feedback type wanted.

### Addressing the "builders aren't my users" risk

- Let builders mark interests as a *user* ("I'm a runner, a new parent, a crypto trader"), not only as a dev, so a parenting app can find the builders who are parents.
- Show a "fit score" on each card explaining why they're seeing it.

## Chat, feedback exchange, and trust & safety

Chat is where value is delivered, so it gets structure Hinge doesn't need: a visible "trade" that both sides complete.

### Chat

- Standard messaging: text, images, screen recordings, voice notes, links.
- Pinned **Trade card** at the top of each match: both apps, their test links, promo codes, and each side's status (Not started / Trying / Feedback sent).
- "Your turn" nudges if a match goes 48 hours without a reply, mirroring Hinge's prompt to message.
- Matches expire after 7 days with no message (keeps inboxes clean; one free extension).

### Structured feedback

When a user taps "Send feedback," they get a short form tied to what the other builder asked for:

- First impression (1–5 and one sentence)
- Would you keep using it? (Yes / Maybe / No and why)
- Biggest confusion, best moment
- Bug report with screenshot
- Would you pay? What price feels right?

Feedback posts into the chat as a card and is saved to the app's **Feedback inbox**, a private dashboard aggregating all feedback per app (export to CSV or Notion later).

After receiving feedback, the builder rates it (helpful / not helpful). That rating feeds the giver's reputation.

### Trust & safety

- Report, block, and unmatch from any chat or profile.
- Spam guards: no links in first message until both sides have sent one; rate limits on likes and messages.
- App review on listing: auto-check store URL, manual review of flagged listings; ban scams, adult content, crypto pump schemes, malware.
- Ghosting is tracked privately; repeat ghosters get lower ranking.
- Promo codes and TestFlight links visible only after match.

## Integrations

Integrations exist to create trust badges, not dashboards; each is optional, read-only, and shows a coarse band by default.

| Integration | Connection | What we read | Badge shown | Phase |
| --- | --- | --- | --- | --- |
| App Store / Play / web URL | Paste link; lookup via public store search | Name, icon, rating, category, release date | Shipped | MVP |
| GitHub | OAuth (GitHub App, read-only, repo picker) | Repo, stars, last commit date, commit cadence | Active / Open source | MVP |
| Stripe | Stripe Connect OAuth or restricted read-only key | Last-30-day revenue, active subscriptions | Revenue verified, MRR band | V1.1 |
| RevenueCat | Read-only API key (OAuth if offered) | Active subscribers, trials, MRR | Real users band | V1.1 |
| LemonSqueezy / Polar | API key | Revenue | Revenue verified | Later |
| TestFlight (App Store Connect API) | API key | Public link; optionally auto-add matched testers | One-tap test invite | Later |
| PostHog / Mixpanel | API key | Did the matched tester actually open the app? | Verified tried | Later |

**Notes**

- Re-sync daily; badge shows "verified as of" date and is removed if the connection breaks.
- Store secrets in a server-side vault; the iOS client never sees keys.
- "Verified tried" is the most valuable future signal: it proves a tester actually used the app, the thing every competitor struggles to confirm.

## Monetization and pricing

Model: the first 5 matches are free per account, then each active App profile is a paid listing. The paywall lands right after the user has felt value (real conversations), which is the strongest moment to convert.

### Proposed pricing (to test)

| Plan | Price | What you get |
| --- | --- | --- |
| Free | $0 | Dev profile, 1 app profile, 5 matches lifetime, structured feedback |
| App listing | $9.99/mo per app (or $24.99 per 90-day "launch season") | Unlimited matches for that app, Feedback inbox, verified badges, 8 likes/day |
| Boost (add-on) | $4.99 one-time | 24 hours at top of relevant decks; see who liked you first |
| Builder Pro (later) | $19.99/mo | Up to 3 listings, 15 likes/day, advanced filters, feedback export |

**Why a 90-day option:** most builders need users in a burst around launch, not forever. A season pass matches their real need and reduces churn complaints.

### Rules and mechanics

- Match 5 triggers a celebratory paywall ("You've made 5 builder connections; keep going for $9.99/mo").
- Existing chats stay open after the free limit; only *new* matches require a listing.
- Paid via Apple in-app purchase (RevenueCat to manage). In the US, also test a web checkout link given the relaxed anti-steering rules; confirm current App Store guidelines before launch.
- Possible refund promise: no 3 matches in your first 30 days, next month free. Builds trust in a cold-start marketplace.

### Open pricing question

Charging both sides of a trade can feel off: if A pays and B is still free, B may be less committed. Consider "matches with paid listings rank higher" so paying improves who you get, not just how many.

## MVP scope, metrics, risks, decisions

The MVP proves one thing: mutual matches turn into completed feedback trades. Everything else waits.

### Scope

| Area | MVP (v1.0) | V1.1 | Later |
| --- | --- | --- | --- |
| Profiles | Dev profile, app profile for any product type, 3 prompts, 6 media slots, store or web link, public web profile shareable on X | Video and voice prompts, changelog | Custom themes, profile analytics |
| Discovery | Deck, like-with-comment, Likes You, daily limit, basic filters | Fit score, freshness boost | Learned ranking |
| Chat | Messaging, Trade card, expiry, nudges | Voice notes, screen recordings | Group trades (3-way) |
| Feedback | Structured form, Feedback inbox, helpful rating | Export | AI summary of all feedback per app |
| Verification | Store link, GitHub | Stripe, RevenueCat | Polar, LemonSqueezy, "verified tried" via analytics |
| Payments | 5 free matches per account (free tier = 1 app), monthly or 90-day listing via IAP | Boost | Builder Pro |
| Trust | Report, block, listing review | Ghosting score | Public reputation page |

### Cold start

A dating app with 40 users is dead; density matters more than features.

- Launch invite-only with a seeded cohort of 200–500 builders, onboarded in waves by category so each deck has depth.
- Seed from your own channels first (The Diff readers, X build-in-public crowd, indie hacker communities), then a "Hey100 launch week" with a scheduled start so everyone swipes the same days.
- Web landing page and waitlist with "reserve your app's spot" before the app ships.

### Success metrics

| Metric | Definition | Early target |
| --- | --- | --- |
| North star | Completed trades per week (both sides sent feedback) | Grows week over week |
| Activation | New user lists an app and sends 3 likes in first session | 60% |
| Match rate | Matches / likes sent | 15–25% |
| Trade completion | Matches where both sent feedback within 14 days | 40% |
| Feedback quality | Share of feedback rated helpful | 75% |
| Paywall conversion | Users hitting match 5 who buy a listing | 8–12% |
| Retention | Week-4 active builders | 30% |

Targets are starting assumptions to revise after the first cohort.

### Risks

- **Wrong audience:** builders may not be the target users for consumer apps. Mitigation: user-interest tags, fit score; later, a "tester-only" track for non-builders.
- **Low-effort trades:** people swap "looks great!" and leave. Mitigation: structured form, helpful ratings, reputation-weighted ranking.
- **Cold start / thin decks:** mitigated by cohort launches and category waves.
- **Crowded niche:** several free credit-based tools exist. Differentiate on experience and trust, not on price.
- **App Store review:** Apple may question a marketplace promoting other apps. Keep it framed as a social and feedback network; avoid incentivized reviews, which Apple prohibits.

### Decisions

| Question | Decision |
| --- | --- |
| Tester-only users (no live product) | Not in v1; every user lists a product to match |
| Free limit | 5 matches per account; free tier includes 1 listing, so the limit is effectively tied to that app |
| Listing billing | Offer both: monthly per listing and a 90-day launch season pass |
| Platform at launch | Both: iOS app plus public web profiles shareable on X |
| Revenue display | Builder chooses exact figures or bands |
| Name | Hey100, tagline "find early users"; domain hey100.com available |
| Product types | Any product can be listed, not only iOS apps |
