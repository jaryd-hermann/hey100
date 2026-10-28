# Hey100.com — Why section (second scroll)

Add this after the problem reveal (`So, you shipped the app…`) and before the founder note. No CTA on this section. Same reveal mechanic as the story lines already on the page.

Source of truth in the app: `src/features/onboarding/steps/WhyStep.tsx`.

## Job

Name the founder, steal the accelerator insight (proximity), then show Hey100 as that same loop in four steps. First person. Short sentences. No marketing adjectives. Green is reserved for the closing line.

## Placement

```
Hero (splash)
→ Problem reveal (existing)
→ Why (this section)
→ Founder note (existing)
→ FAQ
```

## Assets

Put these on the dark marketing site:

| Chip / mark | File | Use |
|---|---|---|
| Jaryd | `web/public/assets/jaryd-160.png` (already live; 400px source is `jaryd-400.png`) | 28px circle in the Jaryd chip |
| YC | `assets/images/yc.png` → copy to `web/public/assets/yc.png` | 28px circle in the YC chip |
| Speedrun | `assets/images/speedrun.jpg` → copy to `web/public/assets/speedrun.jpg` | 28px circle in the Speedrun chip |
| Hey100 wordmark | `assets/images/logo-darkmode.svg` → copy to `web/public/assets/logo-darkmode.svg` | Inline after “That’s why I made”. Height 36px, keep aspect (~3.76:1). Dark-mode mark (white) on the site’s `#0E100F` background. |

Do not redraw the wordmark in Titan One. Use the SVG.

## Layout

Full-bleed dark page. Centered column, max ~980px, 24px side gutters. JetBrains Mono 500, ~30px (clamp 25–36), line-height 1.25, tracking −0.045em, centered — same type as the problem reveal.

```
Hey, I'm [● Jaryd]
That's why I made [wordmark]

Accelerators like [● YC] [● Speedrun] and co.
are so good because builders get proximity to other builders.
Everybody uses each other's products and gives feedback.
It's a distribution and feedback hub.
That's why these companies do so well.
Hey100 replicates that.

① You build a profile for your product. (And you)
② You like apps you'd be down to try.
③ When there's a match, you can DM the builder.
④ Trade feedback, chat, and find users.

You can also make and join groups, because sharing
ideas and building with others is how we grow.

Hey! And welcome          ← lime / accent
```

- Opening two rows stay visible as the section header (not a reveal beat).
- Every line after that is a reveal beat: starts at 7% opacity and +14px down; fully lit when its midpoint hits ~55% of the viewport. Reuse `.reveal .line` + the existing `--lit` climb in `web/public/main.js` (extend the query so it covers both sections).
- Wrap rows: flex, wrap, center, 8px column / 10px row gap, so chips sit in the sentence.
- How-steps: left-aligned column (~640px), 32px circled numbers (1.5px ink stroke, 15px/600 mono), 14px gap to copy. Tighter vertical gap than the manifesto beats (~18px, last step 28px).
- No button. The founder note below still has the waitlist form.

## Chips

Pill. 1.5px solid ink (`#E8ECE7`). Fill `surface` (`#171A18`). 28px round photo/logo, 8px gap, padding `2 / 4 / 2 / 14`. Label is the same mono as the sentence, not a smaller caption.

```
[ 28px circle ]  Jaryd
[ 28px circle ]  YC
[ 28px circle ]  Speedrun
```

## Copy (verbatim)

Opening (always on):

> Hey, I'm **Jaryd**
> That's why I made **[Hey100 wordmark]**

Then, one beat at a time:

> Accelerators like **YC** **Speedrun** and co.
> are so good because builders get proximity to other builders.
> Everybody uses each other's products and gives feedback.
> It's a distribution and feedback hub.
> That's why these companies do so well.
> Hey100 replicates that.

How (numbered 1–4):

1. You build a profile for your product. (And you)
2. You like apps you'd be down to try.
3. When there's a match, you can DM the builder.
4. Trade feedback, chat, and find users.

Close:

> You can also make and join groups, because sharing ideas and building with others is how we grow.
> **Hey! And welcome** ← `oklch(0.87 0.18 128)`

## Motion

Same as the problem reveal. `prefers-reduced-motion: reduce` keeps lines fully lit. Do not add a pinned or filling CTA.
